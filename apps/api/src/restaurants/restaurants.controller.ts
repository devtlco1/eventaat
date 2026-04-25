import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Restaurant, RestaurantAdmin } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SafeUser } from '../users/users.service';
import { AssignAdminDto } from './dto/assign-admin.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantsService } from './restaurants.service';

/**
 * All routes require a valid Bearer token (JwtAuthGuard at controller level).
 * RolesGuard is also active; @Roles() on a method narrows it further.
 * Methods without @Roles() are open to any authenticated user.
 */
@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  // ─── Core CRUD ─────────────────────────────────────────────────────────────

  @Post()
  @Roles('PLATFORM_ADMIN')
  create(@Body() dto: CreateRestaurantDto): Promise<Restaurant> {
    return this.restaurants.create(dto);
  }

  @Get()
  list(@CurrentUser() user: SafeUser): Promise<Restaurant[]> {
    return this.restaurants.list(user);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<Restaurant> {
    return this.restaurants.findOne(id, user);
  }

  @Patch(':id')
  @Roles('PLATFORM_ADMIN')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    return this.restaurants.update(id, dto);
  }

  // ─── Admin Assignment (PLATFORM_ADMIN only) ────────────────────────────────

  /**
   * POST /restaurants/:id/admins
   * Body: { "userId": "<uuid>" }
   * Assigns a RESTAURANT_ADMIN user to this restaurant.
   */
  @Post(':id/admins')
  @Roles('PLATFORM_ADMIN')
  assignAdmin(
    @Param('id', new ParseUUIDPipe()) restaurantId: string,
    @Body() dto: AssignAdminDto,
  ): Promise<RestaurantAdmin> {
    return this.restaurants.assignAdmin(restaurantId, dto.userId);
  }

  /**
   * GET /restaurants/:id/admins
   * Lists all admins assigned to this restaurant (with basic user info).
   */
  @Get(':id/admins')
  @Roles('PLATFORM_ADMIN')
  listAdmins(
    @Param('id', new ParseUUIDPipe()) restaurantId: string,
  ): Promise<Array<RestaurantAdmin & { user: SafeUser }>> {
    return this.restaurants.listAdmins(restaurantId);
  }

  /**
   * DELETE /restaurants/:id/admins/:userId
   * Removes the admin assignment for a specific user.
   */
  @Delete(':id/admins/:userId')
  @Roles('PLATFORM_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAdmin(
    @Param('id', new ParseUUIDPipe()) restaurantId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    return this.restaurants.removeAdmin(restaurantId, userId);
  }
}
