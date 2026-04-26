import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'fullName must not be empty when provided' })
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(32)
  /** Send `null` or `""` to clear phone. */
  phone?: string | null;
}
