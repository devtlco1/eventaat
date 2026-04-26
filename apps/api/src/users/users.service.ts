import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

/** A User stripped of secrets — safe to return from the API. */
export type SafeUser = Omit<User, 'passwordHash'>;

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findSafeById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  list(filters: { role?: Role; isActive?: boolean } = {}): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      where: {
        ...(filters.role ? { role: filters.role } : {}),
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: SAFE_USER_SELECT,
    });
  }

  async update(
    id: string,
    data: {
      fullName?: string;
      phone?: string | null;
      role?: Role;
      isActive?: boolean;
    },
  ): Promise<SafeUser> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: SAFE_USER_SELECT,
      });
    } catch (err) {
      // Prisma P2025: Record to update not found.
      if (typeof err === 'object' && err && 'code' in err && (err as any).code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
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

  /**
   * Create a user with a plain password (admin flow). Fails on duplicate email.
   */
  async createWithPassword(dto: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: Role;
  }): Promise<SafeUser> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already in use');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName.trim(),
      phone: dto.phone?.trim() || undefined,
      role: dto.role,
    });
    return this.toPublic(user);
  }

  /** Update password hash only (used by account password change). */
  async updatePasswordHash(id: string, passwordHash: string): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: SAFE_USER_SELECT,
    });
  }

  /** Strip the password hash before sending a user to a client. */
  toPublic(user: User): SafeUser {
    const { passwordHash: _omit, ...safe } = user;
    return safe;
  }
}
