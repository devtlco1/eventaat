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

export class CreateReservationDto {
  @Type(() => Number)
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
  @MaxLength(40)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  occasionNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  specialRequest?: string;

  @IsOptional()
  @IsUUID('4')
  tableId?: string;
}
