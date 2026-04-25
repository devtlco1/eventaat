import { Injectable } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** A User stripped of secrets — safe to return from the API. */
export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(input: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
    role?: Role;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        phone: input.phone ?? null,
        role: input.role ?? Role.CUSTOMER,
      },
    });
  }

  /** Strip the password hash before sending a user to a client. */
  toPublic(user: User): SafeUser {
    const { passwordHash: _omit, ...safe } = user;
    return safe;
  }
}
