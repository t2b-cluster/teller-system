import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxModule } from './outbox/outbox.module';
import { ReconcileModule } from './reconcile/reconcile.module';
import { MetricsModule } from './metrics/metrics.module';
import { OutboxMessage } from './entities/outbox-message.entity';
import { Transaction } from './entities/transaction.entity';
import { ReconciliationLog } from './entities/reconciliation-log.entity';
import { Account } from './entities/account.entity';

@Module({
  imports: [
    MetricsModule,
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
        trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
        pool: {
          max: parseInt(process.env.DB_POOL_MAX || '10', 10),
          min: parseInt(process.env.DB_POOL_MIN || '2', 10),
          idleTimeoutMillis: 10000,
          acquireTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '30000', 10),
        },
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          // ── Always On AG Failover ──
          multiSubnetFailover: process.env.DB_MULTI_SUBNET_FAILOVER === 'true',
          ...(process.env.DB_FAILOVER_PARTNER && {
            failoverPartner: process.env.DB_FAILOVER_PARTNER,
          }),
          applicationIntent: process.env.DB_APP_INTENT || 'ReadWrite',
          connectRetryCount: parseInt(process.env.DB_RETRY_COUNT || '3', 10),
          connectRetryInterval: parseInt(process.env.DB_RETRY_INTERVAL || '1000', 10),
          connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '30000', 10),
          requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000', 10),
          cancelTimeout: 5000,
        },
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
