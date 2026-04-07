import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { RefreshToken } from '../entities/refresh-token.entity';

export interface JwtPayload {
  sub: string;       // user id
  username: string;
  role: string;
  branchCode: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.refreshRepo.save(
      this.refreshRepo.create({ userId, token, expiresAt }),
    );

    return token;
  }

  async validateRefreshToken(token: string): Promise<RefreshToken | null> {
    const record = await this.refreshRepo.findOne({
      where: { token, revoked: false },
    });

    if (!record || record.expiresAt < new Date()) {
      return null;
    }

    return record;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshRepo.update({ token }, { revoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshRepo.update({ userId, revoked: false }, { revoked: true });
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token);
  }
}
