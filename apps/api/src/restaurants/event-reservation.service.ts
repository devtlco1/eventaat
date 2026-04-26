import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  EventReservationStatus,
  Prisma,
  RestaurantEventStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';
import { CreateEventReservationDto } from './dto/create-event-reservation.dto';
import { UpdateEventReservationStatusDto } from './dto/update-event-reservation-status.dto';
import { CancelMyReservationDto } from './dto/cancel-my-reservation.dto';
import type { CustomerEventReservationResponse } from './reservation-response.mappers';
import {
  toAdminEventReservationView,
  toCustomerEventReservationView,
} from './reservation-response.mappers';
import type { AdminEventReservationResponse } from './reservation-response.mappers';

const eventForReservationDetail = {
  id: true,
  title: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  isFree: true,
  price: true,
  currency: true,
} as const;

const eventReservationDetailForCustomer: Prisma.EventReservationInclude = {
  restaurant: { select: { id: true, name: true, city: true, area: true } },
  event: { select: { ...eventForReservationDetail } },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    include: {
      changedBy: { select: { id: true, fullName: true, email: true } },
    },
  },
};

const eventReservationDetailForAdmin: Prisma.EventReservationInclude = {
  customer: { select: { id: true, email: true, fullName: true, phone: true } },
  restaurant: { select: { id: true, name: true, city: true, area: true } },
  event: { select: { ...eventForReservationDetail } },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    include: {
      changedBy: { select: { id: true, fullName: true, email: true } },
    },
  },
};

@Injectable()
export class EventReservationService {
  private static readonly TERMINAL: EventReservationStatus[] = [
    EventReservationStatus.REJECTED,
    EventReservationStatus.CANCELLED,
  ];

  constructor(private readonly prisma: PrismaService) {}

  private isAllowedEventTransition(
    from: EventReservationStatus,
    to: EventReservationStatus,
  ): boolean {
    if (from === to) {
      return false;
    }
    if (EventReservationService.TERMINAL.includes(from)) {
      return false;
    }
    if (from === EventReservationStatus.PENDING) {
      return (
        to === EventReservationStatus.CONFIRMED ||
        to === EventReservationStatus.REJECTED ||
        to === EventReservationStatus.CANCELLED
      );
    }
    if (from === EventReservationStatus.CONFIRMED) {
      return to === EventReservationStatus.CANCELLED;
    }
    return false;
  }

  private async assertPartyAndAcceptsReservations(
    restaurantId: string,
    partySize: number,
  ): Promise<void> {
    const settings = await this.prisma.restaurantOperatingSettings.findUnique({
      where: { restaurantId },
    });
    if (!settings) {
      throw new UnprocessableEntityException('Restaurant has no operating settings');
    }
    if (!settings.acceptsReservations) {
      throw new UnprocessableEntityException(
        'This restaurant is not accepting reservation requests right now',
      );
    }
    if (partySize < settings.minPartySize) {
      throw new UnprocessableEntityException(
        `Party size must be at least ${settings.minPartySize}`,
      );
    }
    if (settings.maxPartySize != null && partySize > settings.maxPartySize) {
      throw new UnprocessableEntityException(
        `Party size must not exceed ${settings.maxPartySize}`,
      );
    }
  }

  private async assertCanManage(
    user: SafeUser,
    restaurantId: string,
  ): Promise<void> {
    const r = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });
    if (!r) {
      throw new NotFoundException('Restaurant not found');
    }
    if (user.role === Role.PLATFORM_ADMIN) {
      return;
    }
    if (user.role === Role.RESTAURANT_ADMIN) {
      const a = await this.prisma.restaurantAdmin.findUnique({
        where: { userId_restaurantId: { userId: user.id, restaurantId } },
      });
      if (!a) {
        throw new ForbiddenException('You are not assigned to this restaurant');
      }
      return;
    }
    throw new ForbiddenException('Insufficient role');
  }

  async createEventReservation(
    restaurantId: string,
    eventId: string,
    dto: CreateEventReservationDto,
    customer: SafeUser,
  ): Promise<CustomerEventReservationResponse> {
    if (customer.role !== Role.CUSTOMER) {
      throw new ForbiddenException('Only customers can create event reservations');
    }

    const event = await this.prisma.restaurantEvent.findFirst({
      where: { id: eventId, restaurantId },
    });
    if (!event) {
      throw new NotFoundException('Event not found for this restaurant');
    }

    const now = new Date();
    if (event.status !== RestaurantEventStatus.APPROVED) {
      throw new UnprocessableEntityException('This event is not open for booking');
    }
    if (!event.isActive) {
      throw new UnprocessableEntityException('This event is not active');
    }
    if (event.endsAt.getTime() <= now.getTime()) {
      throw new UnprocessableEntityException('This event has already ended');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true },
    });
    if (!restaurant || !restaurant.isActive) {
      throw new NotFoundException('Restaurant not found');
    }

    await this.assertPartyAndAcceptsReservations(restaurantId, dto.partySize);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.eventReservation.create({
        data: {
          customerId: customer.id,
          restaurantId,
          eventId,
          partySize: dto.partySize,
          specialRequest: dto.specialRequest?.trim() || null,
          status: EventReservationStatus.PENDING,
        },
      });
      await tx.eventReservationStatusHistory.create({
        data: {
          eventReservationId: created.id,
          changedByUserId: customer.id,
          fromStatus: null,
          toStatus: EventReservationStatus.PENDING,
          note: 'Event reservation request submitted',
        },
      });
      return tx.eventReservation.findFirstOrThrow({
        where: { id: created.id },
        include: eventReservationDetailForCustomer,
      } as any);
    }).then((row) => toCustomerEventReservationView(row as any));
  }

  async getMyEventReservation(
    eventReservationId: string,
    customer: SafeUser,
  ): Promise<CustomerEventReservationResponse> {
    if (customer.role !== Role.CUSTOMER) {
      throw new ForbiddenException();
    }
    const row = await this.prisma.eventReservation.findFirst({
      where: { id: eventReservationId, customerId: customer.id },
      include: eventReservationDetailForCustomer,
    } as any);
    if (!row) {
      throw new NotFoundException('Event reservation not found');
    }
    return toCustomerEventReservationView(row as any);
  }

  async listMyEventReservations(
    customer: SafeUser,
  ): Promise<CustomerEventReservationResponse[]> {
    if (customer.role !== Role.CUSTOMER) {
      throw new ForbiddenException('Only customers can view this list');
    }
    const rows = (await this.prisma.eventReservation.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: eventReservationDetailForCustomer,
    } as any)) as any[];
    return rows.map((r) => toCustomerEventReservationView(r));
  }

  async cancelMyEventReservation(
    eventReservationId: string,
    customer: SafeUser,
    dto: CancelMyReservationDto,
  ): Promise<CustomerEventReservationResponse> {
    if (customer.role !== Role.CUSTOMER) {
      throw new ForbiddenException();
    }
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.eventReservation.findFirst({
        where: { id: eventReservationId, customerId: customer.id },
        include: { event: { select: { endsAt: true } } },
      });
      if (!row) {
        throw new NotFoundException('Event reservation not found');
      }

      const now = new Date();
      if (row.event.endsAt.getTime() <= now.getTime()) {
        throw new BadRequestException('You cannot cancel after the event has ended.');
      }

      const allowed: EventReservationStatus[] = [
        EventReservationStatus.PENDING,
        EventReservationStatus.CONFIRMED,
      ];
      if (!allowed.includes(row.status)) {
        if (row.status === EventReservationStatus.CANCELLED) {
          throw new BadRequestException('Already cancelled');
        }
        if (row.status === EventReservationStatus.REJECTED) {
          throw new BadRequestException('A rejected request cannot be cancelled');
        }
        throw new BadRequestException('This event reservation cannot be cancelled');
      }

      const note = dto.note?.trim() ? dto.note.trim() : 'Cancelled by customer';

      await tx.eventReservationStatusHistory.create({
        data: {
          eventReservationId: row.id,
          changedByUserId: customer.id,
          fromStatus: row.status,
          toStatus: EventReservationStatus.CANCELLED,
          note,
        },
      });
      await tx.eventReservation.update({
        where: { id: row.id },
        data: { status: EventReservationStatus.CANCELLED },
      });

      return tx.eventReservation.findFirstOrThrow({
        where: { id: row.id },
        include: eventReservationDetailForCustomer,
      } as any);
    }).then((r) => toCustomerEventReservationView(r as any));
  }

  private async sumConfirmedSeatsExcluding(
    tx: Prisma.TransactionClient,
    eventId: string,
    excludeReservationId: string,
  ): Promise<number> {
    const r = await tx.eventReservation.aggregate({
      where: {
        eventId,
        id: { not: excludeReservationId },
        status: EventReservationStatus.CONFIRMED,
      },
      _sum: { partySize: true },
    });
    return r._sum.partySize ?? 0;
  }

  async getRestaurantEventReservation(
    restaurantId: string,
    eventReservationId: string,
    user: SafeUser,
  ): Promise<AdminEventReservationResponse> {
    await this.assertCanManage(user, restaurantId);
    if (user.role === Role.CUSTOMER) {
      throw new ForbiddenException();
    }
    const row = await this.prisma.eventReservation.findFirst({
      where: { id: eventReservationId, restaurantId },
      include: eventReservationDetailForAdmin,
    } as any);
    if (!row) {
      throw new NotFoundException('Event reservation not found');
    }
    return toAdminEventReservationView(row as any);
  }

  async listRestaurantEventReservations(
    restaurantId: string,
    user: SafeUser,
    eventId?: string,
  ): Promise<AdminEventReservationResponse[]> {
    await this.assertCanManage(user, restaurantId);
    if (user.role === Role.CUSTOMER) {
      throw new ForbiddenException();
    }

    const rows = (await this.prisma.eventReservation.findMany({
      where: {
        restaurantId,
        ...(eventId ? { eventId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: eventReservationDetailForAdmin,
    } as any)) as any[];
    return rows.map((r) => toAdminEventReservationView(r));
  }

  async updateEventReservationStatus(
    restaurantId: string,
    eventReservationId: string,
    dto: UpdateEventReservationStatusDto,
    actor: SafeUser,
  ): Promise<AdminEventReservationResponse> {
    if (actor.role === Role.CUSTOMER) {
      throw new ForbiddenException();
    }
    await this.assertCanManage(actor, restaurantId);

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.eventReservation.findFirst({
        where: { id: eventReservationId, restaurantId },
        include: { event: { select: { id: true, capacity: true } } },
      });
      if (!row) {
        throw new NotFoundException('Event reservation not found');
      }
      if (row.status === dto.status) {
        throw new BadRequestException('Already in this status');
      }
      if (EventReservationService.TERMINAL.includes(row.status)) {
        throw new BadRequestException('This event reservation is final and cannot be changed');
      }
      if (!this.isAllowedEventTransition(row.status, dto.status)) {
        throw new BadRequestException(
          `Cannot change status from ${row.status} to ${dto.status}`,
        );
      }

      if (dto.status === EventReservationStatus.CONFIRMED) {
        const cap = row.event.capacity;
        if (cap != null) {
          const others = await this.sumConfirmedSeatsExcluding(
            tx,
            row.eventId,
            row.id,
          );
          if (others + row.partySize > cap) {
            throw new BadRequestException(
              `Not enough capacity left for this event (max ${cap} guests confirmed).`,
            );
          }
        }
      }

      const rejectionReason =
        dto.status === EventReservationStatus.REJECTED
          ? dto.rejectionReason?.trim() || 'Rejected by restaurant'
          : null;

      await tx.eventReservationStatusHistory.create({
        data: {
          eventReservationId: row.id,
          changedByUserId: actor.id,
          fromStatus: row.status,
          toStatus: dto.status,
          note: dto.note?.trim() || null,
        },
      });

      return tx.eventReservation.update({
        where: { id: row.id },
        data: {
          status: dto.status,
          rejectionReason:
            dto.status === EventReservationStatus.REJECTED
              ? rejectionReason
              : null,
        },
        include: eventReservationDetailForAdmin,
      } as any);
    }).then((r) => toAdminEventReservationView(r as any));
  }
}
