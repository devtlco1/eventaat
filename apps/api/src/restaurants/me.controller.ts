import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SafeUser } from '../users/users.service';
import { CancelMyReservationDto } from './dto/cancel-my-reservation.dto';
import { EventReservationService } from './event-reservation.service';
import { RestaurantsService } from './restaurants.service';

@ApiTags('me')
@ApiBearerAuth('bearer')
@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeController {
  constructor(
    private readonly restaurants: RestaurantsService,
    private readonly eventReservations: EventReservationService,
  ) {}

  @Get('event-reservations')
  @Roles('CUSTOMER')
  listMyEventReservations(@CurrentUser() user: SafeUser) {
    return this.eventReservations.listMyEventReservations(user);
  }

  @Get('event-reservations/:eventReservationId')
  @Roles('CUSTOMER')
  getMyEventReservation(
    @Param('eventReservationId', new ParseUUIDPipe()) eventReservationId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.eventReservations.getMyEventReservation(eventReservationId, user);
  }

  @Patch('event-reservations/:eventReservationId/cancel')
  @Roles('CUSTOMER')
  cancelMyEventReservation(
    @Param('eventReservationId', new ParseUUIDPipe()) eventReservationId: string,
    @Body() dto: CancelMyReservationDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.eventReservations.cancelMyEventReservation(
      eventReservationId,
      user,
      dto,
    );
  }

  @Get('reservations')
  @Roles('CUSTOMER')
  listMyReservations(@CurrentUser() user: SafeUser) {
    return this.restaurants.listMyReservations(user);
  }

  @Get('reservations/:reservationId')
  @Roles('CUSTOMER')
  getMyTableReservation(
    @Param('reservationId', new ParseUUIDPipe()) reservationId: string,
    @CurrentUser() user: SafeUser,
  ) {
    return this.restaurants.getMyTableReservation(reservationId, user);
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

