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
        trustServerCertificate: true,
        pool: { max: 20, min: 5, idleTimeoutMillis: 10000 },
        options: { encrypt: false },
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
