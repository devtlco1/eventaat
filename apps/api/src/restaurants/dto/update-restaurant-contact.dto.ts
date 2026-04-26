import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RestaurantContactType } from '@prisma/client';

export class UpdateRestaurantContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsEnum(RestaurantContactType)
  type?: RestaurantContactType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  value?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary?: boolean;
}
