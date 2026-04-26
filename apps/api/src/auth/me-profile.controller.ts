import { Body, Controller, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SafeUser } from '../users/users.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('me')
@Controller('me')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class MeProfileController {
  constructor(private readonly auth: AuthService) {}

  @Patch('profile')
  @ApiOperation({ summary: 'Update your display name and phone' })
  updateProfile(
    @CurrentUser() user: SafeUser,
    @Body() dto: UpdateMyProfileDto,
  ): Promise<SafeUser> {
    return this.auth.updateMyProfile(user.id, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change your password' })
  changePassword(
    @CurrentUser() user: SafeUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    return this.auth.changeMyPassword(user.id, dto);
  }
}
