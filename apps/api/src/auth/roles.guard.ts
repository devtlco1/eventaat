import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { SafeUser } from '../users/users.service';
import { ROLES_KEY } from './roles.decorator';

/**
 * Compares the role of `request.user` (set by JwtStrategy via JwtAuthGuard)
 * against the role list declared via @Roles(...).
 *
 * IMPORTANT: this guard relies on JwtAuthGuard having already populated
 * `request.user`. Always list it AFTER JwtAuthGuard:
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *
 * Behaviour:
 *  - No @Roles() metadata               → allow.
 *  - @Roles() but no `request.user`     → 403 (defensive — should be 401 in
 *                                          practice, caught by JwtAuthGuard).
 *  - User role not in required list     → 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: SafeUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
