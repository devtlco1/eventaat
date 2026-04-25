import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BookingType, GuestType, SeatingPreference } from '@prisma/client';

export class CreateReservationDto {
  @IsInt()
  @Min(1)
  partySize!: number;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsEnum(GuestType)
  guestType!: GuestType;

  @IsEnum(SeatingPreference)
  seatingPreference!: SeatingPreference;

  @IsEnum(BookingType)
  bookingType!: BookingType;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  occasionNote?: string;

  @IsOptional()
  @IsString()
  specialRequest?: string;

  @IsOptional()
  @IsUUID()
  tableId?: string;
}
