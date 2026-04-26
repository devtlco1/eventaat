import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventReservationService } from './event-reservation.service';
import { MeReservationOperationsController } from './me-reservation-operations.controller';
import { MeController } from './me.controller';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { ReservationOperationsService } from './reservation-operations.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    RestaurantsController,
    MeController,
    MeReservationOperationsController,
  ],
  providers: [
    RestaurantsService,
    EventReservationService,
    ReservationOperationsService,
  ],
  exports: [RestaurantsService, EventReservationService],
})
export class RestaurantsModule {}
