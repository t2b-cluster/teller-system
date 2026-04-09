import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Module({
  imports: [
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
        trustServerCertificate: true,
        pool: { max: 10, min: 2, idleTimeoutMillis: 10000 },
        options: { encrypt: false },
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
