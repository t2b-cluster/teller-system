import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { OutboxMessage } from '../entities/outbox-message.entity';
import { Transaction } from '../entities/transaction.entity';
import { Account } from '../entities/account.entity';

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);

  constructor(
    @InjectRepository(OutboxMessage) private readonly outboxRepo: Repository<OutboxMessage>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Account) private readonly accountRepo: Repository<Account>,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox() {
    const messages = await this.outboxRepo.find({
      where: { status: 'PENDING' },
      order: { createdAt: 'ASC' },
      take: 10,
    });

    for (const msg of messages) {
      try {
        const payload = JSON.parse(msg.payload);

        // Simulate calling Core Banking API
        const coreBankingResult = await this.callCoreBanking(payload);

        if (coreBankingResult.success) {
          // Credit destination account
          await this.accountRepo
            .createQueryBuilder()
            .update(Account)
            .set({ balance: () => `balance + ${payload.amount}` })
            .where('account_number = :num', { num: payload.toAccount })
            .execute();

          // Update transaction status
          await this.txRepo.update(
            { transactionRef: payload.transactionRef },
            { status: 'SUCCESS', coreBankingRef: coreBankingResult.ref },
          );

          msg.status = 'SENT';
          msg.processedAt = new Date();
        } else {
          throw new Error(coreBankingResult.error || 'Core Banking rejected');
        }

        // Notify via queue
        await this.notificationQueue.add('transfer.completed', {
          transactionRef: payload.transactionRef,
          status: 'SUCCESS',
        });

        this.logger.log(`Outbox processed: ${msg.id}`);
      } catch (error: any) {
        msg.retryCount += 1;
        msg.errorMessage = error.message;

        if (msg.retryCount >= msg.maxRetries) {
          msg.status = 'FAILED';

          // Reverse the debit on permanent failure
          const payload = JSON.parse(msg.payload);
          await this.txRepo.update(
            { transactionRef: payload.transactionRef },
            { status: 'FAILED', errorMessage: error.message },
          );

          await this.notificationQueue.add('transfer.failed', {
            transactionRef: payload.transactionRef,
            error: error.message,
          });
        }

        this.logger.error(`Outbox failed: ${msg.id} - ${error.message}`);
      }

      await this.outboxRepo.save(msg);
    }
  }

  private async callCoreBanking(payload: any): Promise<{ success: boolean; ref?: string; error?: string }> {
    // TODO: Replace with actual Core Banking API call
    // Simulating API call with random success
    return {
      success: true,
      ref: `CB-${Date.now()}`,
    };
  }
}
