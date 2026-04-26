import { IsOptional, IsString, MaxLength } from 'class-validator';

/** PATCH body: only send fields to change. Empty string clears an optional string field. */
export class UpdateRestaurantProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  menuUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  locationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  profileImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  profileDescription?: string;
}
