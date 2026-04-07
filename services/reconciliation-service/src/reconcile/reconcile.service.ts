import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { Transaction } from '../entities/transaction.entity';
import { ReconciliationLog } from '../entities/reconciliation-log.entity';

@Injectable()
export class ReconcileService {
  private readonly logger = new Logger(ReconcileService.name);

  constructor(
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(ReconciliationLog) private readonly reconRepo: Repository<ReconciliationLog>,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async reconcilePendingTransactions() {
    // Find transactions stuck in PENDING for more than 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const pendingTxs = await this.txRepo
      .createQueryBuilder('tx')
      .where('tx.status = :status', { status: 'PENDING' })
      .andWhere('tx.created_at < :cutoff', { cutoff: fiveMinAgo })
      .take(50)
      .getMany();

    for (const tx of pendingTxs) {
      try {
        // TODO: Check actual status from Core Banking
        const coreBankingStatus = await this.checkCoreBankingStatus(tx.transactionRef);

        const matchResult = tx.status === coreBankingStatus ? 'MATCH' : 'MISMATCH';

        const log = this.reconRepo.create({
          transactionRef: tx.transactionRef,
          channelStatus: tx.status,
          coreBankingStatus,
          matchResult,
        });
        await this.reconRepo.save(log);

        if (matchResult === 'MISMATCH') {
          await this.notificationQueue.add('notify.alert', {
            type: 'RECONCILE_MISMATCH',
            transactionRef: tx.transactionRef,
            channelStatus: tx.status,
            coreBankingStatus,
          });
          this.logger.warn(`Mismatch found: ${tx.transactionRef}`);
        }
      } catch (error: any) {
        this.logger.error(`Reconcile error for ${tx.transactionRef}: ${error.message}`);
      }
    }
  }

  async getReconciliationLogs(matchResult?: string) {
    const qb = this.reconRepo.createQueryBuilder('r');
    if (matchResult) {
      qb.where('r.match_result = :result', { result: matchResult });
    }
    return qb.orderBy('r.created_at', 'DESC').take(100).getMany();
  }

  private async checkCoreBankingStatus(transactionRef: string): Promise<string> {
    // TODO: Replace with actual Core Banking status check
    return 'PENDING';
  }
}
