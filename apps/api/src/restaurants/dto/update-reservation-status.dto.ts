import { ReservationStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

const ALLOWED: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.CANCELLED,
  ReservationStatus.COMPLETED,
];

export class UpdateReservationStatusDto {
  @IsIn(ALLOWED)
  status!: ReservationStatus;
}

