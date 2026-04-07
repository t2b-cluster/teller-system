import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { TransferProducer } from './transfer.producer';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { OutboxMessage } from '../entities/outbox-message.entity';
import { IdempotencyKey } from '../entities/idempotency-key.entity';
import { RedisLockService } from '../infrastructure/redis-lock.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, Transaction, OutboxMessage, IdempotencyKey]),
    BullModule.registerQueue(
      { name: 'transfer-queue' },
      { name: 'notification-queue' },
    ),
  ],
  controllers: [TransferController],
  providers: [TransferService, TransferProducer, RedisLockService],
})
export class TransferModule {}
