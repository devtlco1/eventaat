import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Use on protected routes: `@UseGuards(JwtAuthGuard)`.
 * Reads the Bearer token, validates it via JwtStrategy, and attaches
 * the SafeUser to `request.user`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
