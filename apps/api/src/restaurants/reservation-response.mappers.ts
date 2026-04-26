import type { EventReservationStatus, ReservationStatus } from '@prisma/client';

const TABLE = 'TABLE' as const;
const EVENT = 'EVENT' as const;

type Actor = { id: string; fullName: string; email: string } | null;

/**
 * Public shape for a single status change (oldest → newest; UI timeline).
 * `toStatus` is the new reservation state after this step.
 */
export type PublicTableStatusHistoryItem = {
  id: string;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  note: string | null;
  createdAt: string;
  changedBy: Actor;
};

export type PublicEventStatusHistoryItem = {
  id: string;
  fromStatus: EventReservationStatus | null;
  toStatus: EventReservationStatus;
  note: string | null;
  createdAt: string;
  changedBy: Actor;
};

function iso(d: Date): string {
  return d.toISOString();
}

function actor(
  u: { id: string; fullName: string; email: string } | null | undefined,
): Actor {
  return u
    ? { id: u.id, fullName: u.fullName, email: u.email }
    : null;
}

function tableRejectionNote(
  h: { toStatus: ReservationStatus; note: string | null }[],
): string | null {
  const e = h.find((x) => x.toStatus === 'REJECTED');
  return e?.note?.trim() || null;
}

function tableCancellationNote(
  h: { toStatus: ReservationStatus; note: string | null }[],
): string | null {
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i]!.toStatus === 'CANCELLED') {
      return h[i]!.note?.trim() || null;
    }
  }
  return null;
}

function eventCancellationNote(
  h: { toStatus: EventReservationStatus; note: string | null }[],
): string | null {
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i]!.toStatus === 'CANCELLED') {
      return h[i]!.note?.trim() || null;
    }
  }
  return null;
}

export function mapTableHistoryList(
  rows: {
    id: string;
    fromStatus: ReservationStatus | null;
    toStatus: ReservationStatus;
    note: string | null;
    createdAt: Date;
    changedBy: { id: string; fullName: string; email: string } | null;
  }[],
): PublicTableStatusHistoryItem[] {
  return rows.map((r) => ({
    id: r.id,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    note: r.note,
    createdAt: iso(r.createdAt),
    changedBy: actor(r.changedBy),
  }));
}

export function mapEventHistoryList(
  rows: {
    id: string;
    fromStatus: EventReservationStatus | null;
    toStatus: EventReservationStatus;
    note: string | null;
    createdAt: Date;
    changedBy: { id: string; fullName: string; email: string } | null;
  }[],
): PublicEventStatusHistoryItem[] {
  return rows.map((r) => ({
    id: r.id,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    note: r.note,
    createdAt: iso(r.createdAt),
    changedBy: actor(r.changedBy),
  }));
}

type TableScalar = {
  id: string;
  customerId: string;
  restaurantId: string;
  tableId: string | null;
  partySize: number;
  startAt: Date;
  endAt: Date;
  status: ReservationStatus;
  guestType: import('@prisma/client').GuestType;
  seatingPreference: import('@prisma/client').SeatingPreference;
  bookingType: import('@prisma/client').BookingType;
  occasionNote: string | null;
  customerPhone: string | null;
  specialRequest: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const restaurantBlock = (r: { id: string; name: string; city: string; area: string | null }) => r;

const tableBlock = (t: { id: string; name: string; capacity: number } | null) => t;

type EventSummary = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  isFree: boolean;
  price: string | null;
  currency: string;
};

function eventSummaryFromRow(
  e: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    capacity: number | null;
    isFree: boolean;
    price: import('@prisma/client').Prisma.Decimal | null;
    currency: string;
  },
): EventSummary {
  return {
    id: e.id,
    title: e.title,
    startsAt: iso(e.startsAt),
    endsAt: iso(e.endsAt),
    capacity: e.capacity,
    isFree: e.isFree,
    price: e.price != null ? e.price.toString() : null,
    currency: e.currency,
  };
}

/** JSON returned for customer table flow (list, detail, cancel, create). */
export type CustomerTableReservationResponse = TableScalar & {
  type: typeof TABLE;
  /** ISO — when the request row was created (for timeline context). */
  requestedAt: string;
  /** Primary “customer text” for UIs: same as `specialRequest`. */
  note: string | null;
  /** Derivable from model only when REJECTED via history; often null. */
  rejectionReason: string | null;
  /** From history transition to CANCELLED, if any. */
  cancellationReason: string | null;
  restaurant: { id: string; name: string; city: string; area: string | null };
  table: { id: string; name: string; capacity: number } | null;
  statusHistory: PublicTableStatusHistoryItem[];
};

/** JSON for customer event flow. */
export type CustomerEventReservationResponse = {
  type: typeof EVENT;
  id: string;
  customerId: string;
  restaurantId: string;
  eventId: string;
  partySize: number;
  status: EventReservationStatus;
  specialRequest: string | null;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: { id: string; name: string; city: string; area: string | null };
  event: EventSummary;
  statusHistory: PublicEventStatusHistoryItem[];
};

export function toCustomerTableReservationView(
  row: TableScalar & {
    restaurant: { id: string; name: string; city: string; area: string | null };
    table: { id: string; name: string; capacity: number } | null;
    statusHistory: {
      id: string;
      fromStatus: ReservationStatus | null;
      toStatus: ReservationStatus;
      note: string | null;
      createdAt: Date;
      changedBy: { id: string; fullName: string; email: string } | null;
    }[];
  },
): CustomerTableReservationResponse {
  const h = row.statusHistory;
  const hist = mapTableHistoryList(h);
  return {
    type: TABLE,
    id: row.id,
    customerId: row.customerId,
    restaurantId: row.restaurantId,
    tableId: row.tableId,
    partySize: row.partySize,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status,
    guestType: row.guestType,
    seatingPreference: row.seatingPreference,
    bookingType: row.bookingType,
    occasionNote: row.occasionNote,
    customerPhone: row.customerPhone,
    specialRequest: row.specialRequest,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    requestedAt: iso(row.createdAt),
    note: row.specialRequest,
    restaurant: restaurantBlock(row.restaurant),
    table: tableBlock(row.table),
    statusHistory: hist,
    rejectionReason: tableRejectionNote(h),
    cancellationReason: tableCancellationNote(h),
  };
}

export function toCustomerEventReservationView(row: {
  id: string;
  customerId: string;
  restaurantId: string;
  eventId: string;
  partySize: number;
  status: EventReservationStatus;
  specialRequest: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  restaurant: { id: string; name: string; city: string; area: string | null };
  event: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    capacity: number | null;
    isFree: boolean;
    price: import('@prisma/client').Prisma.Decimal | null;
    currency: string;
  };
  statusHistory: {
    id: string;
    fromStatus: EventReservationStatus | null;
    toStatus: EventReservationStatus;
    note: string | null;
    createdAt: Date;
    changedBy: { id: string; fullName: string; email: string } | null;
  }[];
}): CustomerEventReservationResponse {
  return {
    type: EVENT,
    id: row.id,
    customerId: row.customerId,
    restaurantId: row.restaurantId,
    eventId: row.eventId,
    partySize: row.partySize,
    status: row.status,
    specialRequest: row.specialRequest,
    note: row.specialRequest,
    rejectionReason: row.rejectionReason,
    cancellationReason: eventCancellationNote(row.statusHistory),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    restaurant: restaurantBlock(row.restaurant),
    event: eventSummaryFromRow(row.event),
    statusHistory: mapEventHistoryList(row.statusHistory),
  };
}

type CustomerPick = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
};

/** JSON for admin table list/detail/update. */
export type AdminTableReservationResponse = TableScalar & {
  type: typeof TABLE;
  requestedAt: string;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  customer: CustomerPick;
  restaurant: { id: string; name: string; city: string; area: string | null };
  table: { id: string; name: string; capacity: number } | null;
  statusHistory: PublicTableStatusHistoryItem[];
};

export function toAdminTableReservationView(
  row: TableScalar & {
    customer: CustomerPick;
    restaurant: { id: string; name: string; city: string; area: string | null };
    table: { id: string; name: string; capacity: number } | null;
    statusHistory: {
      id: string;
      fromStatus: ReservationStatus | null;
      toStatus: ReservationStatus;
      note: string | null;
      createdAt: Date;
      changedBy: { id: string; fullName: string; email: string } | null;
    }[];
  },
): AdminTableReservationResponse {
  const h = row.statusHistory;
  const restaurant = {
    id: row.restaurant.id,
    name: row.restaurant.name,
    city: row.restaurant.city,
    area: row.restaurant.area,
  };
  return {
    type: TABLE,
    id: row.id,
    customerId: row.customerId,
    restaurantId: row.restaurantId,
    tableId: row.tableId,
    partySize: row.partySize,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status,
    guestType: row.guestType,
    seatingPreference: row.seatingPreference,
    bookingType: row.bookingType,
    occasionNote: row.occasionNote,
    customerPhone: row.customerPhone,
    specialRequest: row.specialRequest,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    requestedAt: iso(row.createdAt),
    note: row.specialRequest,
    customer: row.customer,
    restaurant,
    table: tableBlock(row.table),
    statusHistory: mapTableHistoryList(h),
    rejectionReason: tableRejectionNote(h),
    cancellationReason: tableCancellationNote(h),
  };
}

export type AdminEventReservationResponse = {
  type: typeof EVENT;
  id: string;
  customerId: string;
  restaurantId: string;
  eventId: string;
  partySize: number;
  status: EventReservationStatus;
  specialRequest: string | null;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer: CustomerPick;
  restaurant: { id: string; name: string; city: string; area: string | null };
  event: EventSummary;
  statusHistory: PublicEventStatusHistoryItem[];
};

export function toAdminEventReservationView(row: {
  id: string;
  customerId: string;
  restaurantId: string;
  eventId: string;
  partySize: number;
  status: EventReservationStatus;
  specialRequest: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: CustomerPick;
  restaurant: { id: string; name: string; city: string; area: string | null };
  event: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    capacity: number | null;
    isFree: boolean;
    price: import('@prisma/client').Prisma.Decimal | null;
    currency: string;
  };
  statusHistory: {
    id: string;
    fromStatus: EventReservationStatus | null;
    toStatus: EventReservationStatus;
    note: string | null;
    createdAt: Date;
    changedBy: { id: string; fullName: string; email: string } | null;
  }[];
}): AdminEventReservationResponse {
  return {
    type: EVENT,
    id: row.id,
    customerId: row.customerId,
    restaurantId: row.restaurantId,
    eventId: row.eventId,
    partySize: row.partySize,
    status: row.status,
    specialRequest: row.specialRequest,
    note: row.specialRequest,
    rejectionReason: row.rejectionReason,
    cancellationReason: eventCancellationNote(row.statusHistory),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    customer: row.customer,
    restaurant: {
      id: row.restaurant.id,
      name: row.restaurant.name,
      city: row.restaurant.city,
      area: row.restaurant.area,
    },
    event: eventSummaryFromRow(row.event),
    statusHistory: mapEventHistoryList(row.statusHistory),
  };
}

export const reservationResponseConstants = { TABLE, EVENT } as const;
