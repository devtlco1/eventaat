import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  EventReservationStatus,
  ReservationStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_DAY;

const TABLE_STATUS_RECENT: ReservationStatus[] = [
  ReservationStatus.HELD,
  ReservationStatus.CONFIRMED,
  ReservationStatus.REJECTED,
  ReservationStatus.CANCELLED,
  ReservationStatus.COMPLETED,
];
const TABLE_TERMINAL_SUMMARY: ReservationStatus[] = [
  ReservationStatus.REJECTED,
  ReservationStatus.CANCELLED,
];
const EVENT_STATUS_RECENT: EventReservationStatus[] = [
  EventReservationStatus.CONFIRMED,
  EventReservationStatus.REJECTED,
  EventReservationStatus.CANCELLED,
];
const EVENT_TERMINAL_SUMMARY: EventReservationStatus[] = [
  EventReservationStatus.REJECTED,
  EventReservationStatus.CANCELLED,
];

export type ReservationOperationsTableItem = {
  type: 'TABLE';
  id: string;
  restaurant: { id: string; name: string };
  status: ReservationStatus;
  partySize: number;
  startAt: string;
  endAt: string;
  requestedAt: string;
  note: string | null;
  customer: { fullName: string; email: string; phone: string | null };
};

export type ReservationOperationsEventItem = {
  type: 'EVENT';
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventEndsAt: string;
  restaurant: { id: string; name: string };
  status: EventReservationStatus;
  partySize: number;
  requestedAt: string;
  note: string | null;
  customer: { fullName: string; email: string; phone: string | null };
};

export type ReservationOperationsResponse = {
  scopeRestaurantCount: number;
  summary: {
    pendingTableCount: number;
    pendingEventCount: number;
    confirmedLast24hCount: number;
    rejectedOrCancelledLast7dCount: number;
  };
  needsAttention: Array<ReservationOperationsTableItem | ReservationOperationsEventItem>;
  recentActivity: Array<ReservationOperationsTableItem | ReservationOperationsEventItem>;
};

@Injectable()
export class ReservationOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async restaurantIdsForViewer(user: SafeUser): Promise<string[]> {
    if (user.role === Role.CUSTOMER) {
      return [];
    }
    if (user.role === Role.PLATFORM_ADMIN) {
      const rows = await this.prisma.restaurant.findMany({ select: { id: true } });
      return rows.map((r) => r.id);
    }
    if (user.role === Role.RESTAURANT_ADMIN) {
      const links = await this.prisma.restaurantAdmin.findMany({
        where: { userId: user.id },
        select: { restaurantId: true },
      });
      return links.map((l) => l.restaurantId);
    }
    return [];
  }

  /**
   * Aggregated work queue and recent changes for staff (restaurant or platform).
   * CUSTOMER: 403.
   */
  async getOverview(user: SafeUser): Promise<ReservationOperationsResponse> {
    if (user.role === Role.CUSTOMER) {
      throw new ForbiddenException('Reservation operations are for staff only');
    }

    const restaurantIds = await this.restaurantIdsForViewer(user);
    if (restaurantIds.length === 0) {
      return {
        scopeRestaurantCount: 0,
        summary: {
          pendingTableCount: 0,
          pendingEventCount: 0,
          confirmedLast24hCount: 0,
          rejectedOrCancelledLast7dCount: 0,
        },
        needsAttention: [],
        recentActivity: [],
      };
    }

    const now = Date.now();
    const oneDayAgo = new Date(now - MS_DAY);
    const sevenDaysAgo = new Date(now - MS_7D);

    const inRest = { in: restaurantIds } as const;

    const [
      pendingTableCount,
      pendingEventCount,
      tableConfirmed24h,
      eventConfirmed24h,
      tableRj7d,
      eventRj7d,
      tablePending,
      eventPending,
      tableRecent,
      eventRecent,
    ] = await Promise.all([
      this.prisma.reservation.count({
        where: { restaurantId: inRest, status: ReservationStatus.PENDING },
      }),
      this.prisma.eventReservation.count({
        where: { restaurantId: inRest, status: EventReservationStatus.PENDING },
      }),
      this.prisma.reservation.count({
        where: {
          restaurantId: inRest,
          status: ReservationStatus.CONFIRMED,
          updatedAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.eventReservation.count({
        where: {
          restaurantId: inRest,
          status: EventReservationStatus.CONFIRMED,
          updatedAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.reservation.count({
        where: {
          restaurantId: inRest,
          status: { in: TABLE_TERMINAL_SUMMARY },
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.eventReservation.count({
        where: {
          restaurantId: inRest,
          status: { in: EVENT_TERMINAL_SUMMARY },
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.reservation.findMany({
        where: { restaurantId: inRest, status: ReservationStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 150,
        include: {
          restaurant: { select: { id: true, name: true } },
          customer: { select: { fullName: true, email: true, phone: true } },
        },
      }),
      this.prisma.eventReservation.findMany({
        where: { restaurantId: inRest, status: EventReservationStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 150,
        include: {
          restaurant: { select: { id: true, name: true } },
          customer: { select: { fullName: true, email: true, phone: true } },
          event: { select: { id: true, title: true, startsAt: true, endsAt: true } },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          restaurantId: inRest,
          status: { in: TABLE_STATUS_RECENT },
          updatedAt: { gte: sevenDaysAgo },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
        include: {
          restaurant: { select: { id: true, name: true } },
          customer: { select: { fullName: true, email: true, phone: true } },
        },
      }),
      this.prisma.eventReservation.findMany({
        where: {
          restaurantId: inRest,
          status: { in: EVENT_STATUS_RECENT },
          updatedAt: { gte: sevenDaysAgo },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
        include: {
          restaurant: { select: { id: true, name: true } },
          customer: { select: { fullName: true, email: true, phone: true } },
          event: { select: { id: true, title: true, startsAt: true, endsAt: true } },
        },
      }),
    ]);

    const toTable = (r: (typeof tablePending)[0]): ReservationOperationsTableItem => ({
      type: 'TABLE',
      id: r.id,
      restaurant: r.restaurant,
      status: r.status,
      partySize: r.partySize,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      requestedAt: r.createdAt.toISOString(),
      note: r.specialRequest,
      customer: {
        fullName: r.customer.fullName,
        email: r.customer.email,
        phone: r.customer.phone,
      },
    });

    const toEvent = (e: (typeof eventPending)[0]): ReservationOperationsEventItem => ({
      type: 'EVENT',
      id: e.id,
      eventId: e.eventId,
      eventTitle: e.event.title,
      eventStartsAt: e.event.startsAt.toISOString(),
      eventEndsAt: e.event.endsAt.toISOString(),
      restaurant: e.restaurant,
      status: e.status,
      partySize: e.partySize,
      requestedAt: e.createdAt.toISOString(),
      note: e.specialRequest,
      customer: {
        fullName: e.customer.fullName,
        email: e.customer.email,
        phone: e.customer.phone,
      },
    });

    const needsAttention: Array<ReservationOperationsTableItem | ReservationOperationsEventItem> =
      [...tablePending.map(toTable), ...eventPending.map(toEvent)]
        .sort(
          (a, b) =>
            new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
        )
        .slice(0, 100);

    const recentWithTs: Array<{
      item: ReservationOperationsTableItem | ReservationOperationsEventItem;
      t: number;
    }> = [
      ...tableRecent.map((r) => {
        return { item: toTable(r), t: r.updatedAt.getTime() } as const;
      }),
      ...eventRecent.map((e) => {
        return { item: toEvent(e), t: e.updatedAt.getTime() } as const;
      }),
    ];
    const recentActivity = recentWithTs
      .sort((a, b) => b.t - a.t)
      .slice(0, 100)
      .map((x) => x.item);

    return {
      scopeRestaurantCount: restaurantIds.length,
      summary: {
        pendingTableCount,
        pendingEventCount,
        confirmedLast24hCount: tableConfirmed24h + eventConfirmed24h,
        rejectedOrCancelledLast7dCount: tableRj7d + eventRj7d,
      },
      needsAttention,
      recentActivity,
    };
  }
}
