import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SafeUser } from '../users/users.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

/**
 * In-app stored notifications. Recipients: any authenticated user (own inbox only).
 */
@ApiTags('notifications', 'me')
@ApiBearerAuth('bearer')
@Controller('me/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER', 'RESTAURANT_ADMIN', 'PLATFORM_ADMIN')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications (newest first) + unread count' })
  list(
    @CurrentUser() user: SafeUser,
    @Query() q: ListNotificationsQueryDto,
  ) {
    return this.notifications.listMyNotifications(user, {
      unreadOnly: q.unreadOnly,
      limit: q.limit,
    });
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all of my notifications as read' })
  markAllRead(@CurrentUser() user: SafeUser) {
    return this.notifications.markAllRead(user);
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(
    @CurrentUser() user: SafeUser,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
  ) {
    return this.notifications.markRead(user, notificationId);
  }
}
