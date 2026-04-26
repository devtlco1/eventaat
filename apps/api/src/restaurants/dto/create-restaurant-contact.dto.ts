import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { RestaurantContactType } from '@prisma/client';

export class CreateRestaurantContactDto {
  @IsString()
  @MaxLength(200)
  label!: string;

  @IsEnum(RestaurantContactType)
  type!: RestaurantContactType;

  @IsString()
  @MaxLength(4000)
  value!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrimary?: boolean;
}
