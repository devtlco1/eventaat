import { Controller, Get, UseGuards } from '@nestjs/common';
import { Reservation } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SafeUser } from '../users/users.service';
import { RestaurantsService } from './restaurants.service';

@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get('reservations')
  @Roles('CUSTOMER')
  listMyReservations(@CurrentUser() user: SafeUser): Promise<Reservation[]> {
    return this.restaurants.listMyReservations(user);
  }
}

