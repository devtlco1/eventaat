import { Module } from '@nestjs/common';
import { EventReservationService } from './event-reservation.service';
import { MeController } from './me.controller';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  controllers: [RestaurantsController, MeController],
  providers: [RestaurantsService, EventReservationService],
  exports: [RestaurantsService, EventReservationService],
})
export class RestaurantsModule {}
