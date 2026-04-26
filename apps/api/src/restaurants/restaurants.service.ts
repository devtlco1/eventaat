import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  Restaurant,
  RestaurantAdmin,
  Reservation,
  ReservationStatus,
  RestaurantContact,
  RestaurantContactType,
  RestaurantEventStatus,
  RestaurantTable,
  Role,
  RestaurantOperatingSettings,
  RestaurantOpeningHour,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateRestaurantTableDto } from './dto/create-restaurant-table.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { UpdateRestaurantTableDto } from './dto/update-restaurant-table.dto';
import { UpdateOperatingSettingsDto } from './dto/update-operating-settings.dto';
import { UpdateOpeningHoursDto } from './dto/update-opening-hours.dto';
import { CancelMyReservationDto } from './dto/cancel-my-reservation.dto';
import { CreateRestaurantContactDto } from './dto/create-restaurant-contact.dto';
import { UpdateRestaurantContactDto } from './dto/update-restaurant-contact.dto';
import { UpdateRestaurantProfileDto } from './dto/update-restaurant-profile.dto';
import { CreateRestaurantEventDto } from './dto/create-restaurant-event.dto';
import { UpdateRestaurantEventDto } from './dto/update-restaurant-event.dto';
import { ReviewRestaurantEventDto } from './dto/review-restaurant-event.dto';
import { ListRestaurantEventsQueryDto } from './dto/list-restaurant-events-query.dto';
import {
  computeOpenCloseForLocalDay,
  hhMmToMinutes,
  isValidHhMm,
  localCalendarDaysBetween,
  startOfLocalDay,
} from './operating-time.util';
import type {
  AdminReservationView,
  AdminStatusHistoryEntry,
  CustomerReservationListItem,
} from './reservation-views';

@Injectable()
export class RestaurantsService {
  private static readonly TERMINAL: ReservationStatus[] = [
    ReservationStatus.REJECTED,
    ReservationStatus.CANCELLED,
    ReservationStatus.COMPLETED,
  ];

  private isAllowedStatusTransition(
    from: ReservationStatus,
    to: ReservationStatus,
  ): boolean {
    if (from === to) {
      return false;
    }
    if (RestaurantsService.TERMINAL.includes(from)) {
      return false;
    }
    const next: ReservationStatus[] =
      from === ReservationStatus.PENDING
        ? [
            ReservationStatus.HELD,
            ReservationStatus.CONFIRMED,
            ReservationStatus.REJECTED,
            ReservationStatus.CANCELLED,
          ]
        : from === ReservationStatus.HELD
          ? [
              ReservationStatus.CONFIRMED,
              ReservationStatus.REJECTED,
              ReservationStatus.CANCELLED,
            ]
          : from === ReservationStatus.CONFIRMED
            ? [ReservationStatus.CANCELLED, ReservationStatus.COMPLETED]
            : [];
    return next.includes(to);
  }

  constructor(private readonly prisma: PrismaService) {}

  // ─── Core CRUD ────────────────────────────────────────────────────────────

  create(dto: CreateRestaurantDto): Promise<Restaurant> {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.restaurant.create({ data: dto });
      await tx.restaurantOperatingSettings.create({
        data: { restaurantId: r.id },
      });
      await tx.restaurantOpeningHour.createMany({
        data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          restaurantId: r.id,
          dayOfWeek,
          opensAt: '12:00',
          closesAt: '23:00',
          isClosed: false,
        })),
      });
      return r;
    });
  }

  /**
   * PLATFORM_ADMIN sees every restaurant (active + inactive).
   * Everyone else sees only active ones.
   */
  list(viewer: SafeUser): Promise<Restaurant[]> {
    // Avoid Prisma.*WhereInput annotations — they can explode TS work with strict mode.
    return this.prisma.restaurant.findMany({
      where:
        viewer.role === Role.PLATFORM_ADMIN ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    } as any) as Promise<Restaurant[]>;
  }

  async findOne(id: string, viewer: SafeUser): Promise<Restaurant> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    if (
      !restaurant ||
      (!restaurant.isActive && viewer.role !== Role.PLATFORM_ADMIN)
    ) {
      throw new NotFoundException('Restaurant not found');
    }
    return restaurant;
  }

  async update(id: string, dto: UpdateRestaurantDto): Promise<Restaurant> {
    try {
      return await this.prisma.restaurant.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Restaurant not found');
      }
      throw error;
    }
  }

  // ─── Admin Assignment ─────────────────────────────────────────────────────

  /**
   * Assigns a RESTAURANT_ADMIN user to a restaurant.
   * Validates:
   *   - restaurant exists
   *   - user exists
   *   - user has RESTAURANT_ADMIN role
   *   - assignment is not already present (returns 409 Conflict if duplicate)
   */
  async assignAdmin(
    restaurantId: string,
    userId: string,
  ): Promise<RestaurantAdmin> {
    // Validate restaurant
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Validate user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate role
    if (user.role !== Role.RESTAURANT_ADMIN) {
      throw new UnprocessableEntityException(
        'User must have the RESTAURANT_ADMIN role to be assigned to a restaurant',
      );
    }

    // Attempt to create — catch duplicate composite PK
    try {
      return await this.prisma.restaurantAdmin.create({
        data: { userId, restaurantId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This user is already assigned as an admin of this restaurant',
        );
      }
      throw error;
    }
  }

  /**
   * Lists all admins assigned to a restaurant, including basic user info.
   * Returns 404 if the restaurant doesn't exist.
   */
  async listAdmins(
    restaurantId: string,
  ): Promise<Array<RestaurantAdmin & { user: SafeUser }>> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const rows = await this.prisma.restaurantAdmin.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    });

    // The select above already strips passwordHash; cast is safe.
    return rows as Array<RestaurantAdmin & { user: SafeUser }>;
  }

  /** Reservations that still occupy a table for overlap checks. */
  private static readonly TABLE_BLOCKING_STATUSES: ReservationStatus[] = [
    ReservationStatus.PENDING,
    ReservationStatus.HELD,
    ReservationStatus.CONFIRMED,
  ];

  private static readonly eventInclude = {
    createdBy: { select: { id: true, fullName: true, email: true } },
    approvedBy: { select: { id: true, fullName: true, email: true } },
  } as const;

  /**
   * Removes an admin assignment.
   * Returns 404 if restaurant or the specific assignment doesn't exist.
   */
  async removeAdmin(restaurantId: string, userId: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const assignment = await this.prisma.restaurantAdmin.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
    if (!assignment) {
      throw new NotFoundException(
        'Admin assignment not found for this restaurant',
      );
    }

    await this.prisma.restaurantAdmin.delete({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
  }

  // ─── Permission Helper ────────────────────────────────────────────────────

  /**
   * Checks whether a user is permitted to manage a specific restaurant.
   *
   * Returns true when:
   *   - user is PLATFORM_ADMIN (unrestricted access), OR
   *   - user is RESTAURANT_ADMIN and has an active assignment to restaurantId.
   *
   * Returns false for CUSTOMERs and RESTAURANT_ADMINs without an assignment.
   */
  async canManageRestaurant(
    user: SafeUser,
    restaurantId: string,
  ): Promise<boolean> {
    if (user.role === Role.PLATFORM_ADMIN) return true;

    if (user.role === Role.RESTAURANT_ADMIN) {
      const assignment = await this.prisma.restaurantAdmin.findUnique({
        where: {
          userId_restaurantId: { userId: user.id, restaurantId },
        },
      });
      return assignment !== null;
    }

    return false;
  }

  // ─── Restaurant Tables ────────────────────────────────────────────────────

  private async assertRestaurantVisible(
    restaurantId: string,
    viewer: SafeUser,
  ): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true },
    });

    if (
      !restaurant ||
      (!restaurant.isActive && viewer.role !== Role.PLATFORM_ADMIN)
    ) {
      throw new NotFoundException('Restaurant not found');
    }
  }

  private async assertCanManageRestaurant(
    user: SafeUser,
    restaurantId: string,
  ): Promise<void> {
    const allowed = await this.canManageRestaurant(user, restaurantId);
    if (!allowed) {
      // Requirement: RESTAURANT_ADMIN not assigned → 403.
      if (user.role === Role.RESTAURANT_ADMIN) {
        throw new ForbiddenException('You are not assigned to this restaurant');
      }
      throw new ForbiddenException('Insufficient role');
    }
  }

  private async assertRestaurantExists(restaurantId: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
  }

  private async assertCanViewOperatingSettings(
    viewer: SafeUser,
    restaurantId: string,
  ): Promise<void> {
    if (viewer.role === Role.CUSTOMER) {
      await this.assertRestaurantVisible(restaurantId, viewer);
      return;
    }
    if (viewer.role === Role.RESTAURANT_ADMIN) {
      const r = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true },
      });
      if (!r) {
        throw new NotFoundException('Restaurant not found');
      }
      if (!(await this.canManageRestaurant(viewer, restaurantId))) {
        throw new ForbiddenException('You are not assigned to this restaurant');
      }
      return;
    }
    if (viewer.role === Role.PLATFORM_ADMIN) {
      const r = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true },
      });
      if (!r) {
        throw new NotFoundException('Restaurant not found');
      }
    }
  }

  // ─── Operating settings & opening hours ─────────────────────────────────

  async getOperatingSettings(
    restaurantId: string,
    viewer: SafeUser,
  ): Promise<RestaurantOperatingSettings> {
    await this.assertCanViewOperatingSettings(viewer, restaurantId);
    const s = await this.prisma.restaurantOperatingSettings.findUnique({
      where: { restaurantId },
    });
    if (!s) {
      throw new NotFoundException('Operating settings not found');
    }
    return s;
  }

  async updateOperatingSettings(
    restaurantId: string,
    dto: UpdateOperatingSettingsDto,
    actor: SafeUser,
  ): Promise<RestaurantOperatingSettings> {
    await this.assertCanManageRestaurant(actor, restaurantId);
    const existing = await this.prisma.restaurantOperatingSettings.findUnique({
      where: { restaurantId },
    });
    if (!existing) {
      throw new NotFoundException('Operating settings not found');
    }
    const nextMin = dto.minPartySize ?? existing.minPartySize;
    const nextMax =
      dto.maxPartySize !== undefined ? dto.maxPartySize : existing.maxPartySize;
    if (nextMax != null && nextMax < nextMin) {
      throw new UnprocessableEntityException(
        'maxPartySize must be greater than or equal to minPartySize',
      );
    }
    return this.prisma.restaurantOperatingSettings.update({
      where: { restaurantId },
      data: {
        ...(dto.defaultReservationDurationMinutes !== undefined
          ? { defaultReservationDurationMinutes: dto.defaultReservationDurationMinutes }
          : {}),
        ...(dto.minPartySize !== undefined
          ? { minPartySize: dto.minPartySize }
          : {}),
        ...(dto.maxPartySize !== undefined
          ? { maxPartySize: dto.maxPartySize }
          : {}),
        ...(dto.manualApprovalRequired !== undefined
          ? { manualApprovalRequired: dto.manualApprovalRequired }
          : {}),
        ...(dto.acceptsReservations !== undefined
          ? { acceptsReservations: dto.acceptsReservations }
          : {}),
        ...(dto.advanceBookingDays !== undefined
          ? { advanceBookingDays: dto.advanceBookingDays }
          : {}),
        ...(dto.sameDayCutoffMinutes !== undefined
          ? { sameDayCutoffMinutes: dto.sameDayCutoffMinutes }
          : {}),
      },
    });
  }

  async getOpeningHours(
    restaurantId: string,
    viewer: SafeUser,
  ): Promise<RestaurantOpeningHour[]> {
    await this.assertCanViewOperatingSettings(viewer, restaurantId);
    return this.prisma.restaurantOpeningHour.findMany({
      where: { restaurantId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async updateOpeningHours(
    restaurantId: string,
    dto: UpdateOpeningHoursDto,
    actor: SafeUser,
  ): Promise<RestaurantOpeningHour[]> {
    await this.assertCanManageRestaurant(actor, restaurantId);
    const seen = new Set<number>();
    for (const row of dto.days) {
      if (seen.has(row.dayOfWeek)) {
        throw new UnprocessableEntityException(
          `Duplicate dayOfWeek: ${row.dayOfWeek}`,
        );
      }
      seen.add(row.dayOfWeek);
      if (!isValidHhMm(row.opensAt) || !isValidHhMm(row.closesAt)) {
        throw new UnprocessableEntityException(
          'opensAt and closesAt must be valid HH:mm (00:00–23:59)',
        );
      }
      if (!row.isClosed) {
        const o = hhMmToMinutes(row.opensAt);
        const c = hhMmToMinutes(row.closesAt);
        if (o !== null && c !== null && o >= c) {
          throw new UnprocessableEntityException(
            'opensAt must be before closesAt when the day is open',
          );
        }
      }
    }
    if (seen.size !== 7) {
      throw new UnprocessableEntityException(
        'Provide exactly one entry for each day of week 0–6',
      );
    }
    for (let d = 0; d <= 6; d++) {
      if (!seen.has(d)) {
        throw new UnprocessableEntityException(
          `Missing dayOfWeek ${d} (0=Sun … 6=Sat)`,
        );
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.restaurantOpeningHour.deleteMany({ where: { restaurantId } });
      await tx.restaurantOpeningHour.createMany({
        data: dto.days.map((row) => ({
          restaurantId,
          dayOfWeek: row.dayOfWeek,
          opensAt: row.opensAt.trim(),
          closesAt: row.closesAt.trim(),
          isClosed: row.isClosed,
        })),
      });
    });
    return this.getOpeningHours(restaurantId, actor);
  }

  // ─── Public profile (URLs, copy) & contacts ───────────────────────────────

  private static profileField(
    v: string | undefined,
  ): string | null | undefined {
    if (v === undefined) return undefined;
    const t = v.trim();
    return t.length === 0 ? null : t;
  }

  private async clearOtherPrimaryContactsInTx(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    type: RestaurantContactType,
    exceptContactId?: string,
  ): Promise<void> {
    const where: Prisma.RestaurantContactWhereInput = { restaurantId, type };
    if (exceptContactId) {
      where.id = { not: exceptContactId };
    }
    await tx.restaurantContact.updateMany({
      where,
      data: { isPrimary: false },
    });
  }

  async getRestaurantProfile(
    restaurantId: string,
    viewer: SafeUser,
  ): Promise<{
    id: string;
    websiteUrl: string | null;
    menuUrl: string | null;
    locationUrl: string | null;
    instagramUrl: string | null;
    coverImageUrl: string | null;
    profileImageUrl: string | null;
    shortDescription: string | null;
    profileDescription: string | null;
  }> {
    await this.assertCanViewOperatingSettings(viewer, restaurantId);
    const r = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        websiteUrl: true,
        menuUrl: true,
        locationUrl: true,
        instagramUrl: true,
        coverImageUrl: true,
        profileImageUrl: true,
        shortDescription: true,
        profileDescription: true,
      },
    });
    if (!r) {
      throw new NotFoundException('Restaurant not found');
    }
    return r;
  }

  async updateRestaurantProfile(
    restaurantId: string,
    dto: UpdateRestaurantProfileDto,
    actor: SafeUser,
  ): Promise<{
    id: string;
    websiteUrl: string | null;
    menuUrl: string | null;
    locationUrl: string | null;
    instagramUrl: string | null;
    coverImageUrl: string | null;
    profileImageUrl: string | null;
    shortDescription: string | null;
    profileDescription: string | null;
  }> {
    await this.assertCanManageRestaurant(actor, restaurantId);
    const data: Prisma.RestaurantUpdateInput = {};
    const w = RestaurantsService.profileField(dto.websiteUrl);
    if (w !== undefined) data.websiteUrl = w;
    const m = RestaurantsService.profileField(dto.menuUrl);
    if (m !== undefined) data.menuUrl = m;
    const l = RestaurantsService.profileField(dto.locationUrl);
    if (l !== undefined) data.locationUrl = l;
    const i = RestaurantsService.profileField(dto.instagramUrl);
    if (i !== undefined) data.instagramUrl = i;
    const c = RestaurantsService.profileField(dto.coverImageUrl);
    if (c !== undefined) data.coverImageUrl = c;
    const p = RestaurantsService.profileField(dto.profileImageUrl);
    if (p !== undefined) data.profileImageUrl = p;
    const sd = RestaurantsService.profileField(dto.shortDescription);
    if (sd !== undefined) data.shortDescription = sd;
    const pd = RestaurantsService.profileField(dto.profileDescription);
    if (pd !== undefined) data.profileDescription = pd;
    if (Object.keys(data).length === 0) {
      return this.getRestaurantProfile(restaurantId, actor);
    }
    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data,
    });
    return this.getRestaurantProfile(restaurantId, actor);
  }

  async getRestaurantContacts(
    restaurantId: string,
    viewer: SafeUser,
  ): Promise<RestaurantContact[]> {
    await this.assertCanViewOperatingSettings(viewer, restaurantId);
    return this.prisma.restaurantContact.findMany({
      where: { restaurantId },
      orderBy: [{ isPrimary: 'desc' }, { label: 'asc' }, { id: 'asc' }],
    });
  }

  async createRestaurantContact(
    restaurantId: string,
    dto: CreateRestaurantContactDto,
    actor: SafeUser,
  ): Promise<RestaurantContact> {
    await this.assertCanManageRestaurant(actor, restaurantId);
    const isPrimary = dto.isPrimary === true;
    return this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await this.clearOtherPrimaryContactsInTx(
          tx,
          restaurantId,
          dto.type,
        );
      }
      return tx.restaurantContact.create({
        data: {
          restaurantId,
          label: dto.label.trim(),
          type: dto.type,
          value: dto.value.trim(),
          isPrimary,
        },
      });
    });
  }

  async updateRestaurantContact(
    restaurantId: string,
    contactId: string,
    dto: UpdateRestaurantContactDto,
    actor: SafeUser,
  ): Promise<RestaurantContact> {
    await this.assertCanManageRestaurant(actor, restaurantId);
    const existing = await this.prisma.restaurantContact.findFirst({
      where: { id: contactId, restaurantId },
    });
    if (!existing) {
      throw new NotFoundException('Contact not found');
    }
    const nextType: RestaurantContactType = dto.type ?? existing.type;
    const nextIsPrimary = dto.isPrimary === true;
    if (dto.isPrimary === false) {
      return this.prisma.restaurantContact.update({
        where: { id: contactId },
        data: {
          ...(dto.label !== undefined
            ? { label: dto.label.trim() }
            : {}),
          ...(dto.value !== undefined ? { value: dto.value.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          isPrimary: false,
        },
      });
    }
    if (nextIsPrimary) {
      return this.prisma.$transaction(async (tx) => {
        await this.clearOtherPrimaryContactsInTx(
          tx,
          restaurantId,
          nextType,
          contactId,
        );
        return tx.restaurantContact.update({
          where: { id: contactId },
          data: {
            ...(dto.label !== undefined
              ? { label: dto.label.trim() }
              : {}),
            ...(dto.value !== undefined
              ? { value: dto.value.trim() }
              : {}),
            ...(dto.type !== undefined ? { type: dto.type } : {}),
            isPrimary: true,
          },
        });
      });
    }
    const noPrimaryPatch: {
      label?: string;
      value?: string;
      type?: RestaurantContactType;
    } = {
      ...(dto.label !== undefined
        ? { label: dto.label.trim() }
        : {}),
      ...(dto.value !== undefined ? { value: dto.value.trim() } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
    };
    if (Object.keys(noPrimaryPatch).length === 0) {
      return existing;
    }
    return this.prisma.restaurantContact.update({
      where: { id: contactId },
      data: noPrimaryPatch,
    });
  }

  async deleteRestaurantContact(
    restaurantId: string,
    contactId: string,
    actor: SafeUser,
  ): Promise<void> {
    await this.assertCanManageRestaurant(actor, restaurantId);
    const existing = await this.prisma.restaurantContact.findFirst({
      where: { id: contactId, restaurantId },
    });
    if (!existing) {
      throw new NotFoundException('Contact not found');
    }
    await this.prisma.restaurantContact.delete({ where: { id: contactId } });
  }

  private async assertReservationMeetsOperatingRules(
    restaurantId: string,
    startAt: Date,
    endAt: Date,
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
    const now = new Date();
    const startDay = startOfLocalDay(startAt);
    const daysFromToday = localCalendarDaysBetween(now, startAt);
    if (daysFromToday < 0) {
      throw new UnprocessableEntityException('startAt must be in the future');
    }
    if (daysFromToday > settings.advanceBookingDays) {
      throw new UnprocessableEntityException(
        `Reservations are only accepted up to ${settings.advanceBookingDays} days in advance (server local calendar)`,
      );
    }
    if (startOfLocalDay(startAt).getTime() === startOfLocalDay(now).getTime()) {
      const minStart = now.getTime() + settings.sameDayCutoffMinutes * 60 * 1000;
      if (startAt.getTime() < minStart) {
        throw new UnprocessableEntityException(
          `For same-day requests, start time must be at least ${settings.sameDayCutoffMinutes} minutes from now`,
        );
      }
    }
    const dayOfWeek = startAt.getDay();
    const hourRow = await this.prisma.restaurantOpeningHour.findUnique({
      where: {
        restaurantId_dayOfWeek: { restaurantId, dayOfWeek },
      },
    });
    if (!hourRow) {
      throw new UnprocessableEntityException('No opening hours for this day');
    }
    if (hourRow.isClosed) {
      throw new UnprocessableEntityException(
        'The restaurant is closed on the requested day',
      );
    }
    const y = startAt.getFullYear();
    const m = startAt.getMonth() + 1;
    const d = startAt.getDate();
    const { open, close, closed } = computeOpenCloseForLocalDay(
      y,
      m,
      d,
      hourRow.opensAt,
      hourRow.closesAt,
      hourRow.isClosed,
    );
    if (closed) {
      throw new UnprocessableEntityException('The restaurant is closed on the requested day');
    }
    if (startAt.getTime() < open.getTime() || endAt.getTime() > close.getTime()) {
      throw new UnprocessableEntityException(
        'Reservation must fall within opening hours for that day (server local time; no per-venue timezone yet)',
      );
    }
  }

  async createTable(
    restaurantId: string,
    dto: CreateRestaurantTableDto,
    actor: SafeUser,
  ): Promise<RestaurantTable> {
    await this.assertRestaurantVisible(restaurantId, actor);
    await this.assertCanManageRestaurant(actor, restaurantId);

    return this.prisma.restaurantTable.create({
      data: {
        restaurantId,
        name: dto.name,
        capacity: dto.capacity,
      },
    });
  }

  async listTables(
    restaurantId: string,
    viewer: SafeUser,
  ): Promise<RestaurantTable[]> {
    await this.assertRestaurantVisible(restaurantId, viewer);

    return this.prisma.restaurantTable.findMany({
      where:
        viewer.role === Role.CUSTOMER
          ? { restaurantId, isActive: true }
          : { restaurantId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    } as any) as Promise<RestaurantTable[]>;
  }

  async findTable(
    restaurantId: string,
    tableId: string,
    viewer: SafeUser,
  ): Promise<RestaurantTable> {
    await this.assertRestaurantVisible(restaurantId, viewer);

    const where =
      viewer.role === Role.CUSTOMER
        ? { id: tableId, restaurantId, isActive: true }
        : { id: tableId, restaurantId };

    const table = (await this.prisma.restaurantTable.findFirst({
      where,
    } as any)) as RestaurantTable | null;
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return table;
  }

  async updateTable(
    restaurantId: string,
    tableId: string,
    dto: UpdateRestaurantTableDto,
    actor: SafeUser,
  ): Promise<RestaurantTable> {
    await this.assertRestaurantVisible(restaurantId, actor);
    await this.assertCanManageRestaurant(actor, restaurantId);

    const existing = await this.prisma.restaurantTable.findFirst({
      where: { id: tableId, restaurantId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Table not found');
    }

    return this.prisma.restaurantTable.update({
      where: { id: tableId },
      data: dto,
    });
  }

  // ─── Reservations ─────────────────────────────────────────────────────────

  async createReservation(
    restaurantId: string,
    dto: CreateReservationDto,
    customer: SafeUser,
  ): Promise<Reservation> {
    // CUSTOMER-only endpoint, but keep defensive.
    if (customer.role !== Role.CUSTOMER) {
      throw new ForbiddenException('Only customers can create reservations');
    }

    // Restaurant must be active.
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true },
    });
    if (!restaurant || !restaurant.isActive) {
      throw new NotFoundException('Restaurant not found');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    const now = new Date();

    if (!(startAt instanceof Date) || isNaN(startAt.getTime())) {
      throw new UnprocessableEntityException('startAt must be a valid date');
    }
    if (!(endAt instanceof Date) || isNaN(endAt.getTime())) {
      throw new UnprocessableEntityException('endAt must be a valid date');
    }
    if (startAt.getTime() <= now.getTime()) {
      throw new UnprocessableEntityException('startAt must be in the future');
    }
    if (endAt.getTime() <= startAt.getTime()) {
      throw new UnprocessableEntityException('endAt must be after startAt');
    }

    await this.assertReservationMeetsOperatingRules(
      restaurantId,
      startAt,
      endAt,
      dto.partySize,
    );

    let tableId: string | null = null;
    if (dto.tableId) {
      const table = await this.prisma.restaurantTable.findFirst({
        where: {
          id: dto.tableId,
          restaurantId,
          isActive: true,
        },
        select: { id: true, capacity: true },
      });
      if (!table) {
        throw new NotFoundException('Table not found');
      }

      if (dto.partySize > table.capacity) {
        throw new UnprocessableEntityException(
          'partySize must not exceed table capacity',
        );
      }

      const overlapping = await this.prisma.reservation.findFirst({
        where: {
          tableId: table.id,
          status: { in: RestaurantsService.TABLE_BLOCKING_STATUSES },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });
      if (overlapping) {
        throw new ConflictException(
          'Overlapping reservation exists for this table',
        );
      }

      tableId = table.id;
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: {
          customerId: customer.id,
          restaurantId,
          tableId,
          partySize: dto.partySize,
          startAt,
          endAt,
          status: ReservationStatus.PENDING,
          guestType: dto.guestType,
          seatingPreference: dto.seatingPreference,
          bookingType: dto.bookingType,
          occasionNote: dto.occasionNote,
          customerPhone: dto.customerPhone,
          specialRequest: dto.specialRequest,
        },
      });
      await tx.reservationStatusHistory.create({
        data: {
          reservationId: created.id,
          changedByUserId: customer.id,
          fromStatus: null,
          toStatus: ReservationStatus.PENDING,
          note: 'Reservation request submitted',
        },
      });
      return created;
    });
  }

  async listMyReservations(
    customer: SafeUser,
  ): Promise<CustomerReservationListItem[]> {
    if (customer.role !== Role.CUSTOMER) {
      throw new ForbiddenException('Only customers can view this endpoint');
    }

    // `as any` avoids Prisma+TS pathological type inference on nested includes
    // (tsc can hang for minutes). Shape is covered by `CustomerReservationListItem`.
    return (await this.prisma.reservation.findMany({
      where: { customerId: customer.id },
      orderBy: { startAt: 'desc' },
      include: {
        restaurant: { select: { id: true, name: true, city: true, area: true } },
        table: { select: { id: true, name: true, capacity: true } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: {
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },
        },
      },
    } as any)) as CustomerReservationListItem[];
  }

  async cancelMyReservation(
    reservationId: string,
    customer: SafeUser,
    dto: CancelMyReservationDto,
  ): Promise<CustomerReservationListItem> {
    if (customer.role !== Role.CUSTOMER) {
      throw new ForbiddenException('Only customers can cancel via this endpoint');
    }

    const myReservationInclude = {
      restaurant: { select: { id: true, name: true, city: true, area: true } },
      table: { select: { id: true, name: true, capacity: true } },
      statusHistory: {
        orderBy: { createdAt: 'asc' } as const,
        select: {
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
    };

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.reservation.findFirst({
        where: { id: reservationId, customerId: customer.id },
        select: { id: true, status: true, startAt: true },
      });
      if (!row) {
        throw new NotFoundException('Reservation not found');
      }

      const now = new Date();
      if (now.getTime() >= new Date(row.startAt).getTime()) {
        throw new BadRequestException(
          'You cannot cancel a reservation after it has started.',
        );
      }

      const allowed: ReservationStatus[] = [
        ReservationStatus.PENDING,
        ReservationStatus.HELD,
        ReservationStatus.CONFIRMED,
      ];
      if (!allowed.includes(row.status)) {
        if (row.status === ReservationStatus.CANCELLED) {
          throw new BadRequestException('This reservation is already cancelled.');
        }
        if (row.status === ReservationStatus.REJECTED) {
          throw new BadRequestException('A rejected reservation cannot be cancelled.');
        }
        if (row.status === ReservationStatus.COMPLETED) {
          throw new BadRequestException('A completed reservation cannot be cancelled.');
        }
        throw new BadRequestException('This reservation cannot be cancelled.');
      }

      const note = dto.note?.trim()
        ? dto.note.trim()
        : 'Cancelled by customer';

      await tx.reservationStatusHistory.create({
        data: {
          reservationId: row.id,
          changedByUserId: customer.id,
          fromStatus: row.status,
          toStatus: ReservationStatus.CANCELLED,
          note,
        },
      });

      await tx.reservation.update({
        where: { id: row.id },
        data: { status: ReservationStatus.CANCELLED },
      });

      return (await tx.reservation.findFirstOrThrow({
        where: { id: row.id },
        include: myReservationInclude,
      } as any)) as CustomerReservationListItem;
    });
  }

  async listRestaurantReservations(
    restaurantId: string,
    viewer: SafeUser,
  ): Promise<AdminReservationView[]> {
    await this.assertRestaurantExists(restaurantId);
    await this.assertCanManageRestaurant(viewer, restaurantId);

    return (await this.prisma.reservation.findMany({
      where: { restaurantId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
        table: { select: { id: true, name: true, capacity: true } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedBy: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { startAt: 'desc' },
    } as any)) as AdminReservationView[];
  }

  async getReservationStatusHistory(
    restaurantId: string,
    reservationId: string,
    viewer: SafeUser,
  ) {
    await this.assertRestaurantExists(restaurantId);
    await this.assertCanManageRestaurant(viewer, restaurantId);

    const res = await this.prisma.reservation.findFirst({
      where: { id: reservationId, restaurantId },
      select: { id: true },
    });
    if (!res) {
      throw new NotFoundException('Reservation not found');
    }

    return (await this.prisma.reservationStatusHistory.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'asc' },
      include: {
        changedBy: { select: { id: true, fullName: true, email: true } },
      },
    } as any)) as AdminStatusHistoryEntry[];
  }

  async updateReservationStatus(
    restaurantId: string,
    reservationId: string,
    dto: UpdateReservationStatusDto,
    actor: SafeUser,
  ): Promise<AdminReservationView> {
    await this.assertRestaurantExists(restaurantId);
    await this.assertCanManageRestaurant(actor, restaurantId);

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.reservation.findFirst({
        where: { id: reservationId, restaurantId },
        select: { id: true, status: true },
      });
      if (!row) {
        throw new NotFoundException('Reservation not found');
      }

      if (row.status === dto.status) {
        throw new BadRequestException('Reservation is already in this status.');
      }

      if (RestaurantsService.TERMINAL.includes(row.status)) {
        throw new BadRequestException(
          `This reservation is final (${row.status}) and cannot be changed.`,
        );
      }

      if (!this.isAllowedStatusTransition(row.status, dto.status)) {
        throw new BadRequestException(
          `Cannot change status from ${row.status} to ${dto.status} for this reservation.`,
        );
      }

      await tx.reservationStatusHistory.create({
        data: {
          reservationId: row.id,
          changedByUserId: actor.id,
          fromStatus: row.status,
          toStatus: dto.status,
          note: dto.note?.trim() ? dto.note.trim() : null,
        },
      });

      return (await tx.reservation.update({
        where: { id: reservationId },
        data: { status: dto.status },
        include: {
          customer: {
            select: { id: true, email: true, fullName: true, phone: true },
          },
          table: { select: { id: true, name: true, capacity: true } },
          statusHistory: {
            orderBy: { createdAt: 'asc' },
            include: {
              changedBy: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      } as any)) as AdminReservationView;
    });
  }

  // ─── Availability ─────────────────────────────────────────────────────────

  async getAvailability(
    restaurantId: string,
    query: AvailabilityQueryDto,
  ): Promise<{
    restaurantId: string;
    date: string;
    partySize: number;
    durationMinutes: number;
    slots: Array<{
      startAt: string;
      endAt: string;
      tables: Array<{ id: string; name: string; capacity: number }>;
    }>;
  }> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true },
    });
    if (!restaurant || !restaurant.isActive) {
      throw new NotFoundException('Restaurant not found');
    }

    const settings = await this.prisma.restaurantOperatingSettings.findUnique({
      where: { restaurantId },
    });
    if (!settings || !settings.acceptsReservations) {
      return {
        restaurantId,
        date: query.date,
        partySize: query.partySize,
        durationMinutes: query.durationMinutes ?? 90,
        slots: [],
      };
    }

    const durationMinutes =
      query.durationMinutes ?? settings.defaultReservationDurationMinutes;

    const [y, m, d] = query.date.split('-').map((x) => Number(x));
    if (!y || !m || !d) {
      throw new UnprocessableEntityException('Invalid date');
    }

    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const hourRow = await this.prisma.restaurantOpeningHour.findUnique({
      where: {
        restaurantId_dayOfWeek: { restaurantId, dayOfWeek },
      },
    });

    if (!hourRow || hourRow.isClosed) {
      return {
        restaurantId,
        date: query.date,
        partySize: query.partySize,
        durationMinutes,
        slots: [],
      };
    }

    const { open, close, closed } = computeOpenCloseForLocalDay(
      y,
      m,
      d,
      hourRow.opensAt,
      hourRow.closesAt,
      hourRow.isClosed,
    );
    if (closed) {
      return {
        restaurantId,
        date: query.date,
        partySize: query.partySize,
        durationMinutes,
        slots: [],
      };
    }

    const openAt = open;
    const closeAt = close;
    if (isNaN(openAt.getTime()) || isNaN(closeAt.getTime())) {
      throw new UnprocessableEntityException('Invalid date');
    }

    const tables = await this.prisma.restaurantTable.findMany({
      where: {
        restaurantId,
        isActive: true,
        capacity: { gte: query.partySize },
      },
      select: { id: true, name: true, capacity: true },
      orderBy: [{ capacity: 'asc' }, { createdAt: 'asc' }],
    });

    if (tables.length === 0) {
      return {
        restaurantId,
        date: query.date,
        partySize: query.partySize,
        durationMinutes,
        slots: [],
      };
    }

    const relevantReservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        tableId: { in: tables.map((t) => t.id) },
        status: { in: RestaurantsService.TABLE_BLOCKING_STATUSES },
        startAt: { lt: closeAt },
        endAt: { gt: openAt },
      },
      select: { tableId: true, startAt: true, endAt: true },
    });

    const reservationsByTable = new Map<
      string,
      Array<{ startAt: Date; endAt: Date }>
    >();
    for (const r of relevantReservations) {
      if (!r.tableId) continue;
      const arr = reservationsByTable.get(r.tableId) ?? [];
      arr.push({ startAt: r.startAt, endAt: r.endAt });
      reservationsByTable.set(r.tableId, arr);
    }

    const slots: Array<{
      startAt: string;
      endAt: string;
      tables: Array<{ id: string; name: string; capacity: number }>;
    }> = [];

    const intervalMs = 30 * 60 * 1000;
    const durationMs = durationMinutes * 60 * 1000;

    for (
      let start = openAt.getTime();
      start + durationMs <= closeAt.getTime();
      start += intervalMs
    ) {
      const slotStart = new Date(start);
      const slotEnd = new Date(start + durationMs);

      const availableTables = tables.filter((t) => {
        const reservations = reservationsByTable.get(t.id) ?? [];
        for (const res of reservations) {
          // Overlap if res.start < slotEnd && res.end > slotStart
          if (res.startAt.getTime() < slotEnd.getTime()) {
            if (res.endAt.getTime() > slotStart.getTime()) {
              return false;
            }
          }
        }
        return true;
      });

      if (availableTables.length === 0) continue;

      slots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        tables: availableTables,
      });
    }

    return {
      restaurantId,
      date: query.date,
      partySize: query.partySize,
      durationMinutes,
      slots,
    };
  }

  // ─── Restaurant events (Event Nights) ────────────────────────────────────

  private assertEventTimeOrder(startsAt: Date, endsAt: Date): void {
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }

  private toRestaurantEventResponse(
    e: Prisma.RestaurantEventGetPayload<{
      include: typeof RestaurantsService.eventInclude;
    }>,
  ) {
    return {
      ...e,
      price: e.price == null ? null : e.price.toString(),
    };
  }

  private buildRestaurantEventListWhere(
    restaurantId: string,
    query: ListRestaurantEventsQueryDto,
  ): Prisma.RestaurantEventWhereInput {
    const w: Prisma.RestaurantEventWhereInput = { restaurantId };
    if (query.status) w.status = query.status;
    if (query.activeOnly === true) w.isActive = true;
    if (query.upcomingOnly === true) {
      w.endsAt = { gt: new Date() };
    }
    return w;
  }

  async listRestaurantEvents(
    restaurantId: string,
    query: ListRestaurantEventsQueryDto,
    viewer: SafeUser,
  ) {
    if (viewer.role === Role.CUSTOMER) {
      await this.assertRestaurantVisible(restaurantId, viewer);
      const rows = await this.prisma.restaurantEvent.findMany({
        where: {
          restaurantId,
          status: RestaurantEventStatus.APPROVED,
          isActive: true,
          endsAt: { gt: new Date() },
        },
        orderBy: { startsAt: 'asc' },
        include: RestaurantsService.eventInclude,
      });
      return rows.map((e) => this.toRestaurantEventResponse(e));
    }

    if (viewer.role === Role.PLATFORM_ADMIN) {
      await this.assertRestaurantExists(restaurantId);
    } else {
      await this.assertCanManageRestaurant(viewer, restaurantId);
    }
    const where = this.buildRestaurantEventListWhere(restaurantId, query);
    const rows = await this.prisma.restaurantEvent.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: RestaurantsService.eventInclude,
    });
    return rows.map((e) => this.toRestaurantEventResponse(e));
  }

  async getRestaurantEvent(
    restaurantId: string,
    eventId: string,
    viewer: SafeUser,
  ) {
    if (viewer.role === Role.CUSTOMER) {
      await this.assertRestaurantVisible(restaurantId, viewer);
      const e = await this.prisma.restaurantEvent.findFirst({
        where: {
          id: eventId,
          restaurantId,
          status: RestaurantEventStatus.APPROVED,
          isActive: true,
          endsAt: { gt: new Date() },
        },
        include: RestaurantsService.eventInclude,
      });
      if (!e) throw new NotFoundException('Event not found');
      return this.toRestaurantEventResponse(e);
    }

    if (viewer.role === Role.PLATFORM_ADMIN) {
      await this.assertRestaurantExists(restaurantId);
    } else {
      await this.assertCanManageRestaurant(viewer, restaurantId);
    }
    const e = await this.prisma.restaurantEvent.findFirst({
      where: { id: eventId, restaurantId },
      include: RestaurantsService.eventInclude,
    });
    if (!e) throw new NotFoundException('Event not found');
    return this.toRestaurantEventResponse(e);
  }

  async createRestaurantEvent(
    restaurantId: string,
    dto: CreateRestaurantEventDto,
    actor: SafeUser,
  ) {
    if (actor.role === Role.CUSTOMER) {
      throw new ForbiddenException('Insufficient role');
    }
    await this.assertCanManageRestaurant(actor, restaurantId);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.assertEventTimeOrder(startsAt, endsAt);

    const isFree = dto.isFree !== undefined ? dto.isFree : true;
    const e = await this.prisma.restaurantEvent.create({
      data: {
        restaurantId,
        title: dto.title,
        description: dto.description,
        startsAt,
        endsAt,
        status: RestaurantEventStatus.PENDING,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        isFree,
        price: isFree || dto.price == null ? null : new Prisma.Decimal(dto.price),
        currency: dto.currency?.trim() || 'IQD',
        capacity: dto.capacity,
        seatsAvailableNote: dto.seatsAvailableNote,
        specialMenuDescription: dto.specialMenuDescription,
        specialMenuUrl: dto.specialMenuUrl,
        whatIsIncluded: dto.whatIsIncluded,
        entertainmentInfo: dto.entertainmentInfo,
        coverImageUrl: dto.coverImageUrl,
        galleryImageUrls: dto.galleryImageUrls != null
          ? (dto.galleryImageUrls as Prisma.InputJsonValue)
          : undefined,
        createdByUserId: actor.id,
      },
      include: RestaurantsService.eventInclude,
    });
    return this.toRestaurantEventResponse(e);
  }

  async updateRestaurantEvent(
    restaurantId: string,
    eventId: string,
    dto: UpdateRestaurantEventDto,
    actor: SafeUser,
  ) {
    if (actor.role === Role.CUSTOMER) {
      throw new ForbiddenException('Insufficient role');
    }

    const isPlatform = actor.role === Role.PLATFORM_ADMIN;
    if (!isPlatform) {
      await this.assertCanManageRestaurant(actor, restaurantId);
    } else {
      await this.assertRestaurantExists(restaurantId);
    }

    const event = await this.prisma.restaurantEvent.findFirst({
      where: { id: eventId, restaurantId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (actor.role === Role.RESTAURANT_ADMIN) {
      if (
        event.status === RestaurantEventStatus.APPROVED ||
        event.status === RestaurantEventStatus.CANCELLED
      ) {
        throw new ForbiddenException(
          'Events can be edited in this state only as platform admin',
        );
      }
    }

    const data: Prisma.RestaurantEventUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.seatsAvailableNote !== undefined) {
      data.seatsAvailableNote = dto.seatsAvailableNote;
    }
    if (dto.specialMenuDescription !== undefined) {
      data.specialMenuDescription = dto.specialMenuDescription;
    }
    if (dto.specialMenuUrl !== undefined) data.specialMenuUrl = dto.specialMenuUrl;
    if (dto.whatIsIncluded !== undefined) {
      data.whatIsIncluded = dto.whatIsIncluded;
    }
    if (dto.entertainmentInfo !== undefined) {
      data.entertainmentInfo = dto.entertainmentInfo;
    }
    if (dto.coverImageUrl !== undefined) {
      data.coverImageUrl = dto.coverImageUrl;
    }
    if (dto.currency !== undefined) {
      data.currency = dto.currency.trim() || 'IQD';
    }
    if (dto.capacity !== undefined) {
      data.capacity = dto.capacity;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isFree !== undefined) data.isFree = dto.isFree;
    if (dto.isFree === true) {
      data.price = null;
    } else if (dto.price !== undefined) {
      data.price = new Prisma.Decimal(dto.price);
    }
    if (dto.galleryImageUrls !== undefined) {
      data.galleryImageUrls = dto.galleryImageUrls as Prisma.InputJsonValue;
    }

    const mergedStart = dto.startsAt
      ? new Date(dto.startsAt)
      : event.startsAt;
    const mergedEnd = dto.endsAt
      ? new Date(dto.endsAt)
      : event.endsAt;
    if (dto.startsAt !== undefined || dto.endsAt !== undefined) {
      this.assertEventTimeOrder(mergedStart, mergedEnd);
    }
    if (dto.startsAt !== undefined) data.startsAt = mergedStart;
    if (dto.endsAt !== undefined) data.endsAt = mergedEnd;

    if (
      actor.role === Role.RESTAURANT_ADMIN &&
      event.status === RestaurantEventStatus.REJECTED
    ) {
      data.status = RestaurantEventStatus.PENDING;
      data.rejectionReason = null;
      data.approvedAt = null;
      data.approvedBy = { disconnect: true };
    }

    const allKeys: (keyof UpdateRestaurantEventDto)[] = [
      'title',
      'description',
      'startsAt',
      'endsAt',
      'isActive',
      'isFree',
      'price',
      'currency',
      'capacity',
      'seatsAvailableNote',
      'specialMenuDescription',
      'specialMenuUrl',
      'whatIsIncluded',
      'entertainmentInfo',
      'coverImageUrl',
      'galleryImageUrls',
    ];
    const isEmpty = !allKeys.some((k) => dto[k] !== undefined) &&
      !(
        actor.role === Role.RESTAURANT_ADMIN &&
        event.status === RestaurantEventStatus.REJECTED
      );
    if (isEmpty) {
      return this.getRestaurantEvent(restaurantId, eventId, actor);
    }

    const e = await this.prisma.restaurantEvent.update({
      where: { id: eventId },
      data,
      include: RestaurantsService.eventInclude,
    });
    return this.toRestaurantEventResponse(e);
  }

  async reviewRestaurantEvent(
    restaurantId: string,
    eventId: string,
    dto: ReviewRestaurantEventDto,
    actor: SafeUser,
  ) {
    if (actor.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException('Insufficient role');
    }
    await this.assertRestaurantExists(restaurantId);

    const event = await this.prisma.restaurantEvent.findFirst({
      where: { id: eventId, restaurantId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.status !== RestaurantEventStatus.PENDING) {
      throw new BadRequestException('Only PENDING events can be reviewed');
    }

    if (dto.status === RestaurantEventStatus.APPROVED) {
      const e = await this.prisma.restaurantEvent.update({
        where: { id: eventId },
        data: {
          status: RestaurantEventStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: { connect: { id: actor.id } },
          rejectionReason: null,
        },
        include: RestaurantsService.eventInclude,
      });
      return this.toRestaurantEventResponse(e);
    }

    const reason =
      dto.rejectionReason?.trim() || 'Rejected by platform';

    const e = await this.prisma.restaurantEvent.update({
      where: { id: eventId },
      data: {
        status: RestaurantEventStatus.REJECTED,
        approvedAt: null,
        approvedBy: { disconnect: true },
        rejectionReason: reason,
      },
      include: RestaurantsService.eventInclude,
    });
    return this.toRestaurantEventResponse(e);
  }

  async deactivateRestaurantEvent(
    restaurantId: string,
    eventId: string,
    actor: SafeUser,
  ): Promise<void> {
    if (actor.role === Role.CUSTOMER) {
      throw new ForbiddenException('Insufficient role');
    }
    await this.assertCanManageRestaurant(actor, restaurantId);
    const event = await this.prisma.restaurantEvent.findFirst({
      where: { id: eventId, restaurantId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    await this.prisma.restaurantEvent.update({
      where: { id: eventId },
      data: { isActive: false },
    });
  }
}
