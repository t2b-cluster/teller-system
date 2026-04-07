import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const reflector = { get: jest.fn() } as any;

  const createContext = (authHeader?: string): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader }, user: null }),
    }),
    getHandler: () => jest.fn(),
  }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(reflector);
    (guard as any).authServiceUrl = 'http://localhost:3005';
  });

  it('should allow public routes', async () => {
    reflector.get.mockReturnValue(true);
    const result = await guard.canActivate(createContext());
    expect(result).toBe(true);
  });

  it('should throw when no Authorization header', async () => {
    reflector.get.mockReturnValue(false);
    await expect(guard.canActivate(createContext())).rejects.toThrow(UnauthorizedException);
  });

  it('should throw when Authorization header is not Bearer', async () => {
    reflector.get.mockReturnValue(false);
    await expect(guard.canActivate(createContext('Basic abc'))).rejects.toThrow(UnauthorizedException);
  });

  it('should throw when auth service returns invalid', async () => {
    reflector.get.mockReturnValue(false);
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ valid: false }),
    }) as any;

    await expect(guard.canActivate(createContext('Bearer bad-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('should allow when auth service returns valid', async () => {
    reflector.get.mockReturnValue(false);
    const payload = { sub: '1', username: 'teller1', role: 'TELLER' };
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ valid: true, payload }),
    }) as any;

    const ctx = createContext('Bearer good-token');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw when fetch fails', async () => {
    reflector.get.mockReturnValue(false);
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any;

    await expect(guard.canActivate(createContext('Bearer token'))).rejects.toThrow(UnauthorizedException);
  });
});
