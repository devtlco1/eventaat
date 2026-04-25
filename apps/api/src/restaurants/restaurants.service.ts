import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Restaurant, RestaurantAdmin, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Core CRUD ────────────────────────────────────────────────────────────

  create(dto: CreateRestaurantDto): Promise<Restaurant> {
    return this.prisma.restaurant.create({ data: dto });
  }

  /**
   * PLATFORM_ADMIN sees every restaurant (active + inactive).
   * Everyone else sees only active ones.
   */
  list(viewer: SafeUser): Promise<Restaurant[]> {
    const where: Prisma.RestaurantWhereInput =
      viewer.role === Role.PLATFORM_ADMIN ? {} : { isActive: true };

    return this.prisma.restaurant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, viewer: SafeUser): Promise<Restaurant> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    if (
      !restaurant ||
      (!restaurant.isActive && viewer.role !== Role.PLATFORM_ADMIN)
    ) {
      throw new NotFoundException('Restaurant not found');
    }
    return restaurant;
  }

  async update(id: string, dto: UpdateRestaurantDto): Promise<Restaurant> {
    try {
      return await this.prisma.restaurant.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Restaurant not found');
      }
      throw error;
    }
  }

  // ─── Admin Assignment ─────────────────────────────────────────────────────

  /**
   * Assigns a RESTAURANT_ADMIN user to a restaurant.
   * Validates:
   *   - restaurant exists
   *   - user exists
   *   - user has RESTAURANT_ADMIN role
   *   - assignment is not already present (returns 409 Conflict if duplicate)
   */
  async assignAdmin(
    restaurantId: string,
    userId: string,
  ): Promise<RestaurantAdmin> {
    // Validate restaurant
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Validate user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate role
    if (user.role !== Role.RESTAURANT_ADMIN) {
      throw new UnprocessableEntityException(
        'User must have the RESTAURANT_ADMIN role to be assigned to a restaurant',
      );
    }

    // Attempt to create — catch duplicate composite PK
    try {
      return await this.prisma.restaurantAdmin.create({
        data: { userId, restaurantId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This user is already assigned as an admin of this restaurant',
        );
      }
      throw error;
    }
  }

  /**
   * Lists all admins assigned to a restaurant, including basic user info.
   * Returns 404 if the restaurant doesn't exist.
   */
  async listAdmins(
    restaurantId: string,
  ): Promise<Array<RestaurantAdmin & { user: SafeUser }>> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const rows = await this.prisma.restaurantAdmin.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    });

    // The select above already strips passwordHash; cast is safe.
    return rows as Array<RestaurantAdmin & { user: SafeUser }>;
  }

  /**
   * Removes an admin assignment.
   * Returns 404 if restaurant or the specific assignment doesn't exist.
   */
  async removeAdmin(restaurantId: string, userId: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const assignment = await this.prisma.restaurantAdmin.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
    if (!assignment) {
      throw new NotFoundException(
        'Admin assignment not found for this restaurant',
      );
    }

    await this.prisma.restaurantAdmin.delete({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
  }

  // ─── Permission Helper ────────────────────────────────────────────────────

  /**
   * Checks whether a user is permitted to manage a specific restaurant.
   *
   * Returns true when:
   *   - user is PLATFORM_ADMIN (unrestricted access), OR
   *   - user is RESTAURANT_ADMIN and has an active assignment to restaurantId.
   *
   * Returns false for CUSTOMERs and RESTAURANT_ADMINs without an assignment.
   */
  async canManageRestaurant(
    user: SafeUser,
    restaurantId: string,
  ): Promise<boolean> {
    if (user.role === Role.PLATFORM_ADMIN) return true;

    if (user.role === Role.RESTAURANT_ADMIN) {
      const assignment = await this.prisma.restaurantAdmin.findUnique({
        where: {
          userId_restaurantId: { userId: user.id, restaurantId },
        },
      });
      return assignment !== null;
    }

    return false;
  }
}
