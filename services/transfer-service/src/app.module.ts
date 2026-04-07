import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TransferModule } from './transfer/transfer.module';
import { HealthModule } from './health/health.module';
import { Account } from './entities/account.entity';
import { Transaction } from './entities/transaction.entity';
import { OutboxMessage } from './entities/outbox-message.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433', 10),
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'TellerPass@123',
      database: process.env.DB_DATABASE || 'teller_db',
      entities: [Account, Transaction, OutboxMessage, IdempotencyKey],
      synchronize: false,
      extra: {
        trustServerCertificate: true,
        pool: { max: 20, min: 5, idleTimeoutMillis: 10000 },
        options: {
          encrypt: true,
          connectRetryCount: 3,
          connectRetryInterval: 1000,
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
    TransferModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
