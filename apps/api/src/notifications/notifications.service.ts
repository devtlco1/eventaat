import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, NotificationEntityType, NotificationType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export type PublicNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType;
  entityId: string;
  restaurantId: string | null;
  eventId: string | null;
  reservationId: string | null;
  eventReservationId: string | null;
  readAt: string | null;
  createdAt: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  toPublic(row: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType: NotificationEntityType;
    entityId: string;
    restaurantId: string | null;
    eventId: string | null;
    reservationId: string | null;
    eventReservationId: string | null;
    readAt: Date | null;
    createdAt: Date;
  }): PublicNotification {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      entityType: row.entityType,
      entityId: row.entityId,
      restaurantId: row.restaurantId,
      eventId: row.eventId,
      reservationId: row.reservationId,
      eventReservationId: row.eventReservationId,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async createOneInTx(
    tx: Prisma.TransactionClient,
    data: {
      recipientUserId: string;
      type: NotificationType;
      title: string;
      message: string;
      entityType: NotificationEntityType;
      entityId: string;
      restaurantId: string | null;
      eventId: string | null;
      reservationId: string | null;
      eventReservationId: string | null;
      dedupeKey: string;
    },
  ): Promise<void> {
    try {
      await tx.notification.create({
        data: { ...data, id: randomUUID(), readAt: null },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          return;
        }
      }
      throw e;
    }
  }

  async listMyNotifications(
    user: SafeUser,
    query: { unreadOnly?: boolean; limit?: number },
  ): Promise<{
    notifications: PublicNotification[];
    unreadCount: number;
  }> {
    const where: Prisma.NotificationWhereInput = { recipientUserId: user.id };
    if (query.unreadOnly === true) {
      where.readAt = null;
    }
    const take = Math.min(
      query.limit != null ? query.limit : DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const [list, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.notification.count({
        where: { recipientUserId: user.id, readAt: null },
      }),
    ]);
    return {
      notifications: list.map((n) => this.toPublic(n)),
      unreadCount,
    };
  }

  async markRead(
    user: SafeUser,
    notificationId: string,
  ): Promise<PublicNotification> {
    const row = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId: user.id },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    if (row.readAt) {
      return this.toPublic(row);
    }
    const updated = await this.prisma.notification.update({
      where: { id: row.id },
      data: { readAt: new Date() },
    });
    return this.toPublic(updated);
  }

  async markAllRead(user: SafeUser): Promise<{ updated: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { recipientUserId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }

  // ——— Table reservation notifications ———

  async tableReservationStatusNotifyCustomerInTx(
    tx: Prisma.TransactionClient,
    params: {
      customerUserId: string;
      reservationId: string;
      restaurantId: string;
      restaurantName: string;
      newStatus: 'CONFIRMED' | 'REJECTED';
    },
  ): Promise<void> {
    if (params.newStatus === 'CONFIRMED') {
      await this.createOneInTx(tx, {
        recipientUserId: params.customerUserId,
        type: NotificationType.TABLE_RESERVATION_CONFIRMED,
        title: 'Table reservation confirmed',
        message: `Your reservation at ${params.restaurantName} has been confirmed.`,
        entityType: NotificationEntityType.TABLE_RESERVATION,
        entityId: params.reservationId,
        restaurantId: params.restaurantId,
        eventId: null,
        reservationId: params.reservationId,
        eventReservationId: null,
        dedupeKey: `tblr-${params.reservationId}-cust-CONFIRMED`,
      });
    } else {
      await this.createOneInTx(tx, {
        recipientUserId: params.customerUserId,
        type: NotificationType.TABLE_RESERVATION_REJECTED,
        title: 'Table reservation rejected',
        message: `Your table reservation at ${params.restaurantName} was rejected.`,
        entityType: NotificationEntityType.TABLE_RESERVATION,
        entityId: params.reservationId,
        restaurantId: params.restaurantId,
        eventId: null,
        reservationId: params.reservationId,
        eventReservationId: null,
        dedupeKey: `tblr-${params.reservationId}-cust-REJECTED`,
      });
    }
  }

  async tableReservationCustomerCancelledNotifyAdminsInTx(
    tx: Prisma.TransactionClient,
    params: { reservationId: string; restaurantId: string; restaurantName: string },
  ): Promise<void> {
    const assignments = await tx.restaurantAdmin.findMany({
      where: { restaurantId: params.restaurantId },
      select: { userId: true },
    });
    for (const a of assignments) {
      await this.createOneInTx(tx, {
        recipientUserId: a.userId,
        type: NotificationType.TABLE_RESERVATION_CANCELLED,
        title: 'Reservation cancelled',
        message: `A customer cancelled a table reservation at ${params.restaurantName}.`,
        entityType: NotificationEntityType.TABLE_RESERVATION,
        entityId: params.reservationId,
        restaurantId: params.restaurantId,
        eventId: null,
        reservationId: params.reservationId,
        eventReservationId: null,
        dedupeKey: `tblr-${params.reservationId}-radmin-${a.userId}-CANCELLED`,
      });
    }
  }

  // ——— Event reservation notifications ———

  async eventReservationStatusNotifyCustomerInTx(
    tx: Prisma.TransactionClient,
    params: {
      customerUserId: string;
      eventReservationId: string;
      restaurantId: string;
      eventId: string;
      restaurantName: string;
      eventTitle: string;
      newStatus: 'CONFIRMED' | 'REJECTED';
    },
  ): Promise<void> {
    if (params.newStatus === 'CONFIRMED') {
      await this.createOneInTx(tx, {
        recipientUserId: params.customerUserId,
        type: NotificationType.EVENT_RESERVATION_CONFIRMED,
        title: 'Event reservation confirmed',
        message: `Your event reservation for ${params.eventTitle} at ${params.restaurantName} is confirmed.`,
        entityType: NotificationEntityType.EVENT_RESERVATION,
        entityId: params.eventReservationId,
        restaurantId: params.restaurantId,
        eventId: params.eventId,
        reservationId: null,
        eventReservationId: params.eventReservationId,
        dedupeKey: `ever-${params.eventReservationId}-cust-CONFIRMED`,
      });
    } else {
      await this.createOneInTx(tx, {
        recipientUserId: params.customerUserId,
        type: NotificationType.EVENT_RESERVATION_REJECTED,
        title: 'Event reservation rejected',
        message: `Your event reservation for ${params.eventTitle} at ${params.restaurantName} was rejected.`,
        entityType: NotificationEntityType.EVENT_RESERVATION,
        entityId: params.eventReservationId,
        restaurantId: params.restaurantId,
        eventId: params.eventId,
        reservationId: null,
        eventReservationId: params.eventReservationId,
        dedupeKey: `ever-${params.eventReservationId}-cust-REJECTED`,
      });
    }
  }

  async eventReservationCustomerCancelledNotifyAdminsInTx(
    tx: Prisma.TransactionClient,
    params: {
      eventReservationId: string;
      restaurantId: string;
      eventId: string;
      restaurantName: string;
      eventTitle: string;
    },
  ): Promise<void> {
    const assignments = await tx.restaurantAdmin.findMany({
      where: { restaurantId: params.restaurantId },
      select: { userId: true },
    });
    for (const a of assignments) {
      await this.createOneInTx(tx, {
        recipientUserId: a.userId,
        type: NotificationType.EVENT_RESERVATION_CANCELLED,
        title: 'Event reservation cancelled',
        message: `A customer cancelled an event reservation for ${params.eventTitle} at ${params.restaurantName}.`,
        entityType: NotificationEntityType.EVENT_RESERVATION,
        entityId: params.eventReservationId,
        restaurantId: params.restaurantId,
        eventId: params.eventId,
        reservationId: null,
        eventReservationId: params.eventReservationId,
        dedupeKey: `ever-${params.eventReservationId}-radmin-${a.userId}-CANCELLED`,
      });
    }
  }
}
