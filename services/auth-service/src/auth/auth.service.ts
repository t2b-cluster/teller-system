import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { TokenService } from './token.service';
import { LoginDto } from './auth.dto';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly tokenService: TokenService,
    private readonly metrics: MetricsService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { username: dto.username, isActive: true },
    });

    if (!user) {
      this.metrics.authLoginTotal.inc({ status: 'failed' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      this.metrics.authLoginTotal.inc({ status: 'failed' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      branchCode: user.branchCode,
    });

    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    // Update last login
    await this.userRepo.update(user.id, { lastLogin: new Date() });

    this.metrics.authLoginTotal.inc({ status: 'success' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 1800, // 30 minutes in seconds
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        branchCode: user.branchCode,
      },
    };
  }

  async refresh(refreshToken: string) {
    const record = await this.tokenService.validateRefreshToken(refreshToken);
    if (!record) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: record.userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Revoke old refresh token (rotation)
    await this.tokenService.revokeRefreshToken(refreshToken);

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      branchCode: user.branchCode,
    });

    const newRefreshToken = await this.tokenService.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 1800,
    };
  }

  async logout(refreshToken: string) {
    await this.tokenService.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  async validateToken(token: string) {
    try {
      const payload = this.tokenService.verifyAccessToken(token);
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }
}
