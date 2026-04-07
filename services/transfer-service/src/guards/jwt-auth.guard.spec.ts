import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockRequest: any = {
    headers: {},
  };

  const mockContext = {
    getHandler: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.headers = {};
    mockRequest.user = undefined;

    reflector = { get: jest.fn() } as any;
    guard = new JwtAuthGuard(reflector);
  });

  it('should allow public routes without authentication', async () => {
    (reflector.get as jest.Mock).mockReturnValue(true);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(reflector.get).toHaveBeenCalledWith('isPublic', mockContext.getHandler());
  });

  it('should reject requests with missing Authorization header', async () => {
    (reflector.get as jest.Mock).mockReturnValue(false);

    await expect(guard.canActivate(mockContext))
      .rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockContext))
      .rejects.toThrow('Missing or invalid Authorization header');
  });

  it('should reject requests with invalid Authorization header (no Bearer prefix)', async () => {
    (reflector.get as jest.Mock).mockReturnValue(false);
    mockRequest.headers['authorization'] = 'Basic abc123';

    await expect(guard.canActivate(mockContext))
      .rejects.toThrow(UnauthorizedException);
  });

  it('should reject requests when auth service returns invalid token', async () => {
    (reflector.get as jest.Mock).mockReturnValue(false);
    mockRequest.headers['authorization'] = 'Bearer invalid-token';

    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ valid: false }),
    }) as any;

    await expect(guard.canActivate(mockContext))
      .rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockContext))
      .rejects.toThrow('Invalid or expired token');
  });

  it('should pass valid token and attach user payload to request', async () => {
    (reflector.get as jest.Mock).mockReturnValue(false);
    mockRequest.headers['authorization'] = 'Bearer valid-token';

    const userPayload = { sub: 'user-1', username: 'teller1', role: 'TELLER' };
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ valid: true, payload: userPayload }),
    }) as any;

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual(userPayload);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/validate'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer valid-token' },
      }),
    );
  });

  it('should throw UnauthorizedException when auth service is unavailable', async () => {
    (reflector.get as jest.Mock).mockReturnValue(false);
    mockRequest.headers['authorization'] = 'Bearer some-token';

    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;

    await expect(guard.canActivate(mockContext))
      .rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockContext))
      .rejects.toThrow('Auth service unavailable');
  });
});
