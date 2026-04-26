import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** 24h wall time (same rule as `operating-time.util` / HH:mm). */
const HH_MM = /^([01]?\d|2[0-3]):[0-5]\d$/;

export class OpeningHourDayDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(HH_MM, { message: 'opensAt must be HH:mm' })
  opensAt!: string;

  @IsString()
  @Matches(HH_MM, { message: 'closesAt must be HH:mm' })
  closesAt!: string;

  @Type(() => Boolean)
  @IsBoolean()
  isClosed!: boolean;
}

export class UpdateOpeningHoursDto {
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => OpeningHourDayDto)
  days!: OpeningHourDayDto[];
}
