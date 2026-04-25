import { ReservationStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

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
}
