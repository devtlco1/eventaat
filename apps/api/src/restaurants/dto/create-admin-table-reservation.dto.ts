import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { BookingType, GuestType, SeatingPreference } from '@prisma/client';

/**
 * Body for `POST /restaurants/:restaurantId/reservations/admin` —
 * staff create on behalf of a **CUSTOMER** user.
 */
export class CreateAdminTableReservationDto {
  @IsUUID('4')
  customerId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize!: number;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  specialRequest?: string;

  @IsOptional()
  @IsUUID('4')
  tableId?: string;

  @IsOptional()
  @IsEnum(GuestType)
  guestType?: GuestType;

  @IsOptional()
  @IsEnum(SeatingPreference)
  seatingPreference?: SeatingPreference;

  @IsOptional()
  @IsEnum(BookingType)
  bookingType?: BookingType;
}
