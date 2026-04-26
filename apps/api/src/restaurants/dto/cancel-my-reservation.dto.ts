import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelMyReservationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
