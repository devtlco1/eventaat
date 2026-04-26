import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { RestaurantEventStatus } from '@prisma/client';

export class ListRestaurantEventsQueryDto {
  @IsOptional()
  @IsEnum(RestaurantEventStatus)
  status?: RestaurantEventStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === 0 || value === '0') {
      return false;
    }
    return value;
  })
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (value === true || value === 'true' || value === 1 || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === 0 || value === '0') {
      return false;
    }
    return value;
  })
  @Type(() => Boolean)
  @IsBoolean()
  upcomingOnly?: boolean;
}
