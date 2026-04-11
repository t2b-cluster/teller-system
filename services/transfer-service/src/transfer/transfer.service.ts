import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { OutboxMessage } from '../entities/outbox-message.entity';
import { IdempotencyKey } from '../entities/idempotency-key.entity';
import { RedisLockService } from '../infrastructure/redis-lock.service';
import { TransferProducer } from './transfer.producer';
import { CreateTransferDto } from './transfer.dto';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class TransferService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Account) private readonly accountRepo: Repository<Account>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(IdempotencyKey) private readonly idemRepo: Repository<IdempotencyKey>,
    private readonly lockService: RedisLockService,
    private readonly transferProducer: TransferProducer,
    private readonly metrics: MetricsService,
  ) {}

  async executeTransfer(dto: CreateTransferDto, idempotencyKey: string) {
    // 1. Check idempotency (DB fallback)
    const existing = await this.idemRepo.findOne({ where: { idempotencyKey } });
    if (existing) {
      return JSON.parse(existing.response);
    }

    if (dto.fromAccount === dto.toAccount) {
      throw new BadRequestException('Cannot transfer to the same account');
    }

    // 2. Acquire distributed lock on source account
    const lockKey = `lock:account:${dto.fromAccount}`;
    const lock = await this.lockService.acquire(lockKey, 5000);

    try {
      const transactionRef = `TXN-${Date.now()}-${uuidv4().slice(0, 8)}`;

      // 3. Single DB transaction: debit + create transaction + outbox
      const result = await this.dataSource.transaction(async (manager) => {
        // Pessimistic lock on account row
        const account = await manager
          .createQueryBuilder(Account, 'a')
          .setLock('pessimistic_write')
          .where('a.account_number = :num', { num: dto.fromAccount })
          .getOne();

        if (!account) throw new NotFoundException('Source account not found');
        if (Number(account.balance) < dto.amount) {
          throw new BadRequestException('Insufficient balance');
        }

        // Debit source account
        await manager
          .createQueryBuilder()
          .update(Account)
          .set({
            balance: () => `balance - ${dto.amount}`,
            updatedAt: new Date(),
          })
          .where('account_number = :num', { num: dto.fromAccount })
          .execute();

        // Create transaction record
        const tx = manager.create(Transaction, {
          transactionRef,
          fromAccount: dto.fromAccount,
          toAccount: dto.toAccount,
          amount: dto.amount,
          currency: dto.currency,
          type: 'TRANSFER',
          status: 'PENDING',
          description: dto.description,
        });
        await manager.save(tx);

        // Write outbox message (same transaction)
        const outbox = manager.create(OutboxMessage, {
          aggregateType: 'TRANSFER',
          aggregateId: dto.fromAccount,
          eventType: 'transfer.initiated',
          payload: JSON.stringify({ transactionRef, ...dto }),
          status: 'PENDING',
        });
        await manager.save(outbox);

        return { transactionId: tx.id, transactionRef, status: 'PENDING' };
      });

      // 4. Store idempotency key in DB
      const idemRecord = this.idemRepo.create({
        idempotencyKey,
        response: JSON.stringify(result),
        statusCode: 200,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      });
      await this.idemRepo.save(idemRecord);

      // 5. Publish to message queue for async processing
      await this.transferProducer.publishTransferInitiated(result.transactionRef, dto);

      // 6. Record business metrics
      this.metrics.transferTotal.inc({ status: 'pending' });
      this.metrics.transferAmountTotal.inc({ currency: dto.currency || 'THB' }, dto.amount);
      this.metrics.transactionsTotal.inc({ status: 'pending', type: 'TRANSFER' });

      return result;
    } catch (error) {
      this.metrics.transferTotal.inc({ status: 'failed' });
      this.metrics.transactionsTotal.inc({ status: 'failed', type: 'TRANSFER' });
      throw error;
    } finally {
      await this.lockService.release(lock);
    }
  }

  async getStatus(transactionId: string) {
    const tx = await this.txRepo.findOne({ where: { id: transactionId } });
    if (!tx) throw new NotFoundException('Transaction not found');
    return { transactionId: tx.id, ref: tx.transactionRef, status: tx.status };
  }
}
