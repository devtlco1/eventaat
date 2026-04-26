import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class OpeningHourDayDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  opensAt!: string;

  @IsString()
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
