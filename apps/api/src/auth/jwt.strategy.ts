import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SafeUser, UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload.interface';

/**
 * Validates Bearer tokens on incoming requests.
 *
 * Not applied to any endpoint yet — but ready for use in later steps via
 * `@UseGuards(JwtAuthGuard)`. The validated SafeUser is attached to
 * `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly users: UsersService,
    config: ConfigService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET is not set. Add it to apps/api/.env (see .env.example).',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<SafeUser> {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return this.users.toPublic(user);
  }
}
