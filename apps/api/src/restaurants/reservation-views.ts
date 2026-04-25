import type {
  BookingType,
  GuestType,
  ReservationStatus,
  SeatingPreference,
} from '@prisma/client';

/**
 * Prisma’s `ReservationGetPayload` / `Reservation` intersections make TypeScript
 * spend a long time on structural checks. These plain shapes match query output.
 */
type ReservationScalars = {
  id: string;
  customerId: string;
  restaurantId: string;
  tableId: string | null;
  partySize: number;
  startAt: Date;
  endAt: Date;
  status: ReservationStatus;
  guestType: GuestType;
  seatingPreference: SeatingPreference;
  bookingType: BookingType;
  occasionNote: string | null;
  customerPhone: string | null;
  specialRequest: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RestaurantNamePlace = {
  id: string;
  name: string;
  city: string;
  area: string | null;
};
type TablePick = { id: string; name: string; capacity: number };
type CustomerPick = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
};

export type CustomerReservationListItem = ReservationScalars & {
  restaurant: RestaurantNamePlace;
  table: TablePick | null;
  statusHistory: Array<{
    fromStatus: ReservationStatus | null;
    toStatus: ReservationStatus;
    note: string | null;
    createdAt: Date;
  }>;
};

export type AdminStatusHistoryEntry = {
  id: string;
  reservationId: string;
  changedByUserId: string | null;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  note: string | null;
  createdAt: Date;
  changedBy: { id: string; fullName: string; email: string } | null;
};

export type AdminReservationView = ReservationScalars & {
  customer: CustomerPick;
  table: TablePick | null;
  statusHistory: AdminStatusHistoryEntry[];
};
