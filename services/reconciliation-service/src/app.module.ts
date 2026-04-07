import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxModule } from './outbox/outbox.module';
import { ReconcileModule } from './reconcile/reconcile.module';
import { OutboxMessage } from './entities/outbox-message.entity';
import { Transaction } from './entities/transaction.entity';
import { ReconciliationLog } from './entities/reconciliation-log.entity';
import { Account } from './entities/account.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433', 10),
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'TellerPass@123',
      database: process.env.DB_DATABASE || 'teller_db',
      entities: [OutboxMessage, Transaction, ReconciliationLog, Account],
      synchronize: false,
      extra: {
        trustServerCertificate: true,
        pool: { max: 10, min: 2, idleTimeoutMillis: 10000 },
      },
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || 'tellerpass',
        maxRetriesPerRequest: null,
      },
    }),
    OutboxModule,
    ReconcileModule,
  ],
})
export class AppModule {}
