import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SafeUser } from '../users/users.service';

/**
 * Pulls the authenticated user (attached by JwtStrategy.validate)
 * off `request.user`.
 *
 * Use only on routes guarded by JwtAuthGuard — otherwise `request.user`
 * is undefined.
 *
 * Example:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('me')
 *   me(@CurrentUser() user: SafeUser) { return user; }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SafeUser => {
    const request = ctx.switchToHttp().getRequest<{ user: SafeUser }>();
    return request.user;
  },
);
