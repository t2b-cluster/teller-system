import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ReconcileService } from './reconcile.service';
import { ReconcileController } from './reconcile.controller';
import { Transaction } from '../entities/transaction.entity';
import { ReconciliationLog } from '../entities/reconciliation-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, ReconciliationLog]),
    BullModule.registerQueue({ name: 'notification-queue' }),
  ],
  controllers: [ReconcileController],
  providers: [ReconcileService],
})
export class ReconcileModule {}
