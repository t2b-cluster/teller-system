import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { OutboxWorker } from './outbox.worker';
import { OutboxMessage } from '../entities/outbox-message.entity';
import { Transaction } from '../entities/transaction.entity';
import { Account } from '../entities/account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxMessage, Transaction, Account]),
    BullModule.registerQueue({ name: 'notification-queue' }),
  ],
  providers: [OutboxWorker],
})
export class OutboxModule {}
