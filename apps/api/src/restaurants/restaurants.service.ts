import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Restaurant, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRestaurantDto): Promise<Restaurant> {
    return this.prisma.restaurant.create({ data: dto });
  }

  /**
   * PLATFORM_ADMIN sees every restaurant (active + inactive).
   * Everyone else sees only active ones — matches the spec
   * "authenticated users can list and view active restaurants."
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

    // Hide inactive restaurants from non-admins by returning the same 404
    // as if they didn't exist — avoids leaking their existence.
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
      // P2025 = "An operation failed because it depends on one or more records
      // that were required but not found." (i.e. update target doesn't exist)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Restaurant not found');
      }
      throw error;
    }
  }
}
