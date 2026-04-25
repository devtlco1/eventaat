import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/** Metadata key read by RolesGuard. */
export const ROLES_KEY = 'roles';

/**
 * Restrict a route (or controller) to one or more roles.
 *
 * Must be combined with JwtAuthGuard + RolesGuard, e.g.:
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('PLATFORM_ADMIN')
 *   @Get('admin-only')
 *   adminOnly() { ... }
 *
 * No @Roles() on a route means "any authenticated user is allowed"
 * (RolesGuard returns true when no roles are required).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
