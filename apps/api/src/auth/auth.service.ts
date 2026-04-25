import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SafeUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload.interface';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: SafeUser }> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      // role defaults to CUSTOMER inside UsersService
    });

    return { user: this.users.toPublic(user) };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ user: SafeUser; accessToken: string }> {
    // Use a generic message for both "no such email" and "wrong password"
    // to avoid leaking which one is wrong.
    const invalid = new UnauthorizedException('Invalid credentials');

    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive) throw invalid;

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) throw invalid;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return { user: this.users.toPublic(user), accessToken };
  }
}
