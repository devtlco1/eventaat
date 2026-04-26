import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  ArrayMaxSize,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRestaurantEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999_999_999.99)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  seatsAvailableNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  specialMenuDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  specialMenuUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  whatIsIncluded?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  entertainmentInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  galleryImageUrls?: string[];
}
