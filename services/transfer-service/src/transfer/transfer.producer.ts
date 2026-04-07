import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TransferProducer {
  constructor(
    @InjectQueue('transfer-queue') private readonly transferQueue: Queue,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
  ) {}

  async publishTransferInitiated(transactionRef: string, payload: Record<string, any>) {
    await this.transferQueue.add('transfer.initiated', {
      transactionRef,
      ...payload,
      timestamp: new Date().toISOString(),
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async publishTransferCompleted(transactionRef: string, data: Record<string, any>) {
    await this.notificationQueue.add('transfer.completed', {
      transactionRef,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  async publishTransferFailed(transactionRef: string, error: string) {
    await this.notificationQueue.add('transfer.failed', {
      transactionRef,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
