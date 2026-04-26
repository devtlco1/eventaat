import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SafeUser } from '../users/users.service';
import { CancelMyReservationDto } from './dto/cancel-my-reservation.dto';
import { RestaurantsService } from './restaurants.service';

@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get('reservations')
  @Roles('CUSTOMER')
  listMyReservations(@CurrentUser() user: SafeUser) {
    return this.restaurants.listMyReservations(user);
  }

  @Patch('reservations/:reservationId/cancel')
  @Roles('CUSTOMER')
  cancelMyReservation(
    @Param('reservationId') reservationId: string,
    @Body() dto: CancelMyReservationDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.cancelMyReservation(reservationId, user, dto);
  }
}

