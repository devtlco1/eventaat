import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Restaurant } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SafeUser } from '../users/users.service';
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
}
