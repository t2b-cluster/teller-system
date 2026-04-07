import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ── POST /login ────────────────────────────────────────────────────────

  describe('login', () => {
    it('should call authService.login with the DTO and return the result', async () => {
      const dto = { username: 'teller1', password: 'password123' };
      const loginResult = {
        accessToken: 'jwt',
        refreshToken: 'rt',
        expiresIn: 1800,
        user: { id: '1', username: 'teller1', fullName: 'Test', role: 'TELLER', branchCode: 'BR001' },
      };
      authService.login.mockResolvedValue(loginResult);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(loginResult);
    });
  });

  // ── POST /refresh ──────────────────────────────────────────────────────

  describe('refresh', () => {
    it('should call authService.refresh with the refresh token', async () => {
      const refreshResult = { accessToken: 'new-jwt', refreshToken: 'new-rt', expiresIn: 1800 };
      authService.refresh.mockResolvedValue(refreshResult);

      const result = await controller.refresh({ refreshToken: 'old-rt' });

      expect(authService.refresh).toHaveBeenCalledWith('old-rt');
      expect(result).toEqual(refreshResult);
    });
  });

  // ── POST /logout ───────────────────────────────────────────────────────

  describe('logout', () => {
    it('should call authService.logout with the refresh token', async () => {
      authService.logout.mockResolvedValue({ message: 'Logged out successfully' });

      const result = await controller.logout({ refreshToken: 'rt-to-revoke' });

      expect(authService.logout).toHaveBeenCalledWith('rt-to-revoke');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  // ── GET /validate ──────────────────────────────────────────────────────

  describe('validate', () => {
    it('should extract Bearer token and call authService.validateToken', async () => {
      const payload = { sub: '1', username: 'teller1', role: 'TELLER', branchCode: 'BR001' };
      authService.validateToken.mockResolvedValue({ valid: true, payload });

      const result = await controller.validate('Bearer some-jwt');

      expect(authService.validateToken).toHaveBeenCalledWith('some-jwt');
      expect(result).toEqual({ valid: true, payload });
    });

    it('should return { valid: false } when authorization header is missing', async () => {
      const result = await controller.validate(undefined as any);

      expect(authService.validateToken).not.toHaveBeenCalled();
      expect(result).toEqual({ valid: false });
    });

    it('should return { valid: false } when authorization header is empty', async () => {
      const result = await controller.validate('');

      expect(result).toEqual({ valid: false });
    });
  });
});
