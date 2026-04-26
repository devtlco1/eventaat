import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateEventReservationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000)
  partySize!: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  specialRequest?: string;
}
