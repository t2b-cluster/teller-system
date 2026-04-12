import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { MetricsModule } from './metrics/metrics.module';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

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
      entities: [User, RefreshToken],
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
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'teller-jwt-secret-change-in-production',
      signOptions: { expiresIn: '30m' },
    }),
    AuthModule,
  ],
})
export class AppModule {}
