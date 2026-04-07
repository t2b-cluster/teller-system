import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * JWT Auth Guard — validates Bearer token by calling Auth Service.
 * Each microservice uses this guard to protect endpoints.
 * Token validation is done via HTTP call to auth-service /api/v1/auth/validate
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly authServiceUrl: string;

  constructor(private readonly reflector: Reflector) {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3005';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    try {
      const response = await fetch(`${this.authServiceUrl}/api/v1/auth/validate`, {
        headers: { Authorization: authHeader },
      });

      const result = await response.json();

      if (!result.valid) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Attach user payload to request for downstream use
      request.user = result.payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Auth service unavailable');
    }
  }
}
