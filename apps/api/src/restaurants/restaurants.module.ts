import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventReservationService } from './event-reservation.service';
import { MeController } from './me.controller';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [NotificationsModule],
  controllers: [RestaurantsController, MeController],
  providers: [RestaurantsService, EventReservationService],
  exports: [RestaurantsService, EventReservationService],
})
export class RestaurantsModule {}
