import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RestaurantContactType } from '@prisma/client';

export class CreateRestaurantContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsEnum(RestaurantContactType)
  type!: RestaurantContactType;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  value!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary?: boolean;
}
