import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { EventReservationStatus } from '@prisma/client';

export class UpdateEventReservationStatusDto {
  @IsIn([EventReservationStatus.CONFIRMED, EventReservationStatus.REJECTED])
  status!: EventReservationStatus;

  @ValidateIf(
    (o: UpdateEventReservationStatusDto) => o.status === EventReservationStatus.REJECTED,
  )
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
