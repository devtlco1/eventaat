import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'current password is required' })
  @MaxLength(200)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'new password must be at least 8 characters' })
  @MaxLength(200)
  newPassword!: string;
}
