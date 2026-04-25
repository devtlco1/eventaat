import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateRestaurantTableDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}

