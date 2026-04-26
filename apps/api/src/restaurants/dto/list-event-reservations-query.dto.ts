import { IsOptional, IsUUID } from 'class-validator';

export class ListEventReservationsQueryDto {
  @IsOptional()
  @IsUUID('4')
  eventId?: string;
}
