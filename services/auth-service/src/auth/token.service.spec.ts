import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TokenService, JwtPayload } from './token.service';
import { RefreshToken } from '../entities/refresh-token.entity';

describe('TokenService', () => {
  let service: TokenService;

  const jwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const refreshRepo = {
    save: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockPayload: JwtPayload = {
    sub: 'user-uuid-1',
    username: 'teller1',
    role: 'TELLER',
    branchCode: 'BR001',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwtService },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  // ── generateAccessToken ────────────────────────────────────────────────

  describe('generateAccessToken', () => {
    it('should return a signed JWT string', () => {
      jwtService.sign.mockReturnValue('signed-jwt-token');

      const result = service.generateAccessToken(mockPayload);

      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload);
      expect(result).toBe('signed-jwt-token');
    });
  });

  // ── generateRefreshToken ───────────────────────────────────────────────

  describe('generateRefreshToken', () => {
    it('should save a refresh token record and return the token string', async () => {
      const createdEntity = { userId: 'user-uuid-1', token: 'random-hex', expiresAt: expect.any(Date) };
      refreshRepo.create.mockReturnValue(createdEntity);
      refreshRepo.save.mockResolvedValue(createdEntity);

      const result = await service.generateRefreshToken('user-uuid-1');

      expect(refreshRepo.create).toHaveBeenCalledWith({
        userId: 'user-uuid-1',
        token: expect.any(String),
        expiresAt: expect.any(Date),
      });
      expect(refreshRepo.save).toHaveBeenCalled();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate a token with 7-day expiry', async () => {
      refreshRepo.create.mockImplementation((entity: any) => entity);
      refreshRepo.save.mockResolvedValue({});

      const before = Date.now();
      await service.generateRefreshToken('user-uuid-1');
      const after = Date.now();

      const createCall = refreshRepo.create.mock.calls[0][0] as any;
      const expiresAt = createCall.expiresAt.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
      expect(expiresAt).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
    });
  });

  // ── validateRefreshToken ───────────────────────────────────────────────

  describe('validateRefreshToken', () => {
    it('should return the record for a valid, non-expired token', async () => {
      const record = {
        id: 'rt-1',
        userId: 'user-uuid-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60000),
        revoked: false,
        createdAt: new Date(),
      };
      refreshRepo.findOne.mockResolvedValue(record);

      const result = await service.validateRefreshToken('valid-token');

      expect(refreshRepo.findOne).toHaveBeenCalledWith({
        where: { token: 'valid-token', revoked: false },
      });
      expect(result).toEqual(record);
    });

    it('should return null when token is not found', async () => {
      refreshRepo.findOne.mockResolvedValue(null);

      const result = await service.validateRefreshToken('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when token is expired', async () => {
      const expiredRecord = {
        id: 'rt-2',
        userId: 'user-uuid-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 60000), // expired 1 minute ago
        revoked: false,
        createdAt: new Date(),
      };
      refreshRepo.findOne.mockResolvedValue(expiredRecord);

      const result = await service.validateRefreshToken('expired-token');

      expect(result).toBeNull();
    });

    it('should return null for a revoked token (findOne returns null due to where clause)', async () => {
      refreshRepo.findOne.mockResolvedValue(null);

      const result = await service.validateRefreshToken('revoked-token');

      expect(result).toBeNull();
    });
  });

  // ── revokeRefreshToken ─────────────────────────────────────────────────

  describe('revokeRefreshToken', () => {
    it('should update the revoked flag to true', async () => {
      refreshRepo.update.mockResolvedValue({ affected: 1 });

      await service.revokeRefreshToken('token-to-revoke');

      expect(refreshRepo.update).toHaveBeenCalledWith(
        { token: 'token-to-revoke' },
        { revoked: true },
      );
    });
  });

  // ── revokeAllUserTokens ────────────────────────────────────────────────

  describe('revokeAllUserTokens', () => {
    it('should update all non-revoked tokens for the user', async () => {
      refreshRepo.update.mockResolvedValue({ affected: 3 });

      await service.revokeAllUserTokens('user-uuid-1');

      expect(refreshRepo.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', revoked: false },
        { revoked: true },
      );
    });
  });

  // ── verifyAccessToken ──────────────────────────────────────────────────

  describe('verifyAccessToken', () => {
    it('should return the decoded payload for a valid token', () => {
      jwtService.verify.mockReturnValue(mockPayload);

      const result = service.verifyAccessToken('valid-jwt');

      expect(jwtService.verify).toHaveBeenCalledWith('valid-jwt');
      expect(result).toEqual(mockPayload);
    });

    it('should throw when the token is invalid', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      expect(() => service.verifyAccessToken('bad-jwt')).toThrow('invalid signature');
    });

    it('should throw when the token is expired', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => service.verifyAccessToken('expired-jwt')).toThrow('jwt expired');
    });
  });
});
