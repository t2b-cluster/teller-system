import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { User } from '../entities/user.entity';
import { MetricsService } from '../metrics/metrics.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const userRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const tokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    verifyAccessToken: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-uuid-1',
    username: 'teller1',
    passwordHash: '$2b$10$hashedpassword',
    fullName: 'Test Teller',
    role: 'TELLER',
    branchCode: 'BR001',
    isActive: true,
    lastLogin: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: TokenService, useValue: tokenService },
        { provide: MetricsService, useValue: { authLoginTotal: { inc: jest.fn() } } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── login ──────────────────────────────────────────────────────────────

  describe('login', () => {
    const dto = { username: 'teller1', password: 'password123' };

    it('should return tokens and user info for valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      tokenService.generateAccessToken.mockReturnValue('access-jwt');
      tokenService.generateRefreshToken.mockResolvedValue('refresh-token-hex');
      userRepo.update.mockResolvedValue(undefined);

      const result = await service.login(dto);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { username: 'teller1', isActive: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        branchCode: mockUser.branchCode,
      });
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(mockUser.id);
      expect(userRepo.update).toHaveBeenCalledWith(mockUser.id, { lastLogin: expect.any(Date) });
      expect(result).toEqual({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-token-hex',
        expiresIn: 1800,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          fullName: mockUser.fullName,
          role: mockUser.role,
          branchCode: mockUser.branchCode,
        },
      });
    });

    it('should throw UnauthorizedException when username not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(tokenService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // isActive: true is part of the where clause, so an inactive user returns null
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login({ username: 'inactive', password: 'pass123456' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('should return new tokens for a valid refresh token', async () => {
      const record = { userId: mockUser.id, token: 'old-refresh', expiresAt: new Date(Date.now() + 60000), revoked: false };
      tokenService.validateRefreshToken.mockResolvedValue(record);
      userRepo.findOne.mockResolvedValue(mockUser);
      tokenService.revokeRefreshToken.mockResolvedValue(undefined);
      tokenService.generateAccessToken.mockReturnValue('new-access-jwt');
      tokenService.generateRefreshToken.mockResolvedValue('new-refresh-hex');

      const result = await service.refresh('old-refresh');

      expect(tokenService.validateRefreshToken).toHaveBeenCalledWith('old-refresh');
      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('old-refresh');
      expect(result).toEqual({
        accessToken: 'new-access-jwt',
        refreshToken: 'new-refresh-hex',
        expiresIn: 1800,
      });
    });

    it('should throw UnauthorizedException for expired / invalid refresh token', async () => {
      tokenService.validateRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('expired-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found after token validation', async () => {
      const record = { userId: 'deleted-user', token: 'valid-token', expiresAt: new Date(Date.now() + 60000), revoked: false };
      tokenService.validateRefreshToken.mockResolvedValue(record);
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh('valid-token'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke the refresh token and return success message', async () => {
      tokenService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout('some-refresh-token');

      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('some-refresh-token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  // ── validateToken ──────────────────────────────────────────────────────

  describe('validateToken', () => {
    it('should return valid: true with payload for a valid token', async () => {
      const payload = { sub: 'user-1', username: 'teller1', role: 'TELLER', branchCode: 'BR001' };
      tokenService.verifyAccessToken.mockReturnValue(payload);

      const result = await service.validateToken('valid-jwt');

      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('valid-jwt');
      expect(result).toEqual({ valid: true, payload });
    });

    it('should return valid: false when token verification throws', async () => {
      tokenService.verifyAccessToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const result = await service.validateToken('bad-jwt');

      expect(result).toEqual({ valid: false });
    });
  });
});
