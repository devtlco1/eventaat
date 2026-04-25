import { Role } from '@prisma/client';

/** Claims embedded in the access token. `sub` holds the user id (JWT convention). */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
