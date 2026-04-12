import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionModule } from './transaction/transaction.module';
import { BalanceModule } from './balance/balance.module';
import { AccountModule } from './account/account.module';
import { MetricsModule } from './metrics/metrics.module';
import { Transaction } from './entities/transaction.entity';
import { Account } from './entities/account.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    MetricsModule,
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433', 10),
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'TellerPass@123',
      database: process.env.DB_DATABASE || 'teller_db',
      entities: [Transaction, Account],
      synchronize: false,
      extra: {
        trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
        pool: {
          max: parseInt(process.env.DB_POOL_MAX || '20', 10),
          min: parseInt(process.env.DB_POOL_MIN || '5', 10),
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
    TransactionModule,
    BalanceModule,
    AccountModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
