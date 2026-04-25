import { ReservationStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const ALLOWED: ReservationStatus[] = [
  ReservationStatus.HELD,
  ReservationStatus.CONFIRMED,
  ReservationStatus.REJECTED,
  ReservationStatus.CANCELLED,
  ReservationStatus.COMPLETED,
];

export class UpdateReservationStatusDto {
  @IsIn(ALLOWED)
  status!: ReservationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
