import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SafeUser } from '../users/users.service';
import { ReservationOperationsService } from './reservation-operations.service';

@ApiTags('me')
@ApiBearerAuth('bearer')
@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RESTAURANT_ADMIN', 'PLATFORM_ADMIN')
export class MeReservationOperationsController {
  constructor(
    private readonly reservationOperations: ReservationOperationsService,
  ) {}

  @Get('reservation-operations')
  @ApiOperation({
    summary:
      'Aggregated pending and recent (7d) table/event reservations for assigned restaurants (R-A) or the whole platform (P-A). CUSTOMER: 403.',
  })
  getReservationOperations(@CurrentUser() user: SafeUser) {
    return this.reservationOperations.getOverview(user);
  }
}
