import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRestaurantTableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;
}

