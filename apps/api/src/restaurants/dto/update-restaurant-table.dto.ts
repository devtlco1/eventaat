import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

/**
 * Partial update DTO for RestaurantTable.
 * (Kept manual to avoid bringing in mapped-types just for PartialType.)
 */
export class UpdateRestaurantTableDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

