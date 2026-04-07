import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Extract the authenticated user from request (set by JwtAuthGuard) */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
