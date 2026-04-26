export interface AuthLoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
    phone: string | null;
    isActive: boolean;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  area: string | null;
  isActive: boolean;
  address: string;
}

/** Full row from GET /restaurants/:id (Prisma JSON; decimals may be strings). */
export interface RestaurantDetail {
  id: string;
  name: string;
  city: string;
  area: string | null;
  address: string;
  description: string | null;
  phone: string | null;
  isActive: boolean;
  websiteUrl: string | null;
  menuUrl: string | null;
  locationUrl: string | null;
  instagramUrl: string | null;
  coverImageUrl: string | null;
  profileImageUrl: string | null;
  shortDescription: string | null;
  profileDescription: string | null;
}

export type RestaurantContactType =
  | 'PHONE'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'WEBSITE'
  | 'EMAIL'
  | 'OTHER';

export interface RestaurantContact {
  id: string;
  restaurantId: string;
  label: string;
  type: RestaurantContactType;
  value: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Public event row from GET /restaurants/:id/events (customer sees approved only). */
export interface RestaurantEvent {
  id: string;
  restaurantId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  isActive: boolean;
  isFree: boolean;
  price: string | null;
  currency: string;
  capacity: number | null;
  seatsAvailableNote: string | null;
  specialMenuDescription: string | null;
  specialMenuUrl: string | null;
  whatIsIncluded: string | null;
  entertainmentInfo: string | null;
  coverImageUrl: string | null;
  galleryImageUrls: unknown;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; fullName: string; email: string } | null;
  approvedBy: { id: string; fullName: string; email: string } | null;
}

export interface RestaurantOperatingSettings {
  id: string;
  restaurantId: string;
  defaultReservationDurationMinutes: number;
  minPartySize: number;
  maxPartySize: number | null;
  manualApprovalRequired: boolean;
  acceptsReservations: boolean;
  advanceBookingDays: number;
  sameDayCutoffMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityTable {
  id: string;
  name: string;
  capacity: number;
}

export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
  tables: AvailabilityTable[];
}

export interface AvailabilityResponse {
  restaurantId: string;
  date: string;
  partySize: number;
  durationMinutes: number;
  slots: AvailabilitySlot[];
}

export type ReservationStatus =
  | 'PENDING'
  | 'HELD'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export type GuestType = 'FAMILY' | 'YOUTH' | 'MIXED' | 'BUSINESS' | 'OTHER';
export type SeatingPreference = 'INDOOR' | 'OUTDOOR' | 'NO_PREFERENCE';
export type BookingType =
  | 'STANDARD'
  | 'EVENT_NIGHT'
  | 'VIP'
  | 'OCCASION'
  | 'OTHER';

export type CreateReservationRequestBody = {
  partySize: number;
  startAt: string;
  endAt: string;
  guestType: GuestType;
  seatingPreference: SeatingPreference;
  bookingType: BookingType;
  customerPhone?: string;
  occasionNote?: string;
  specialRequest?: string;
  tableId?: string;
};

export type StatusActor = { id: string; fullName: string; email: string } | null;

export type ReservationRecord = {
  id: string;
  customerId: string;
  restaurantId: string;
  tableId: string | null;
  partySize: number;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  guestType: GuestType;
  seatingPreference: SeatingPreference;
  bookingType: BookingType;
  occasionNote: string | null;
  customerPhone: string | null;
  specialRequest: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TableStatusHistoryItem = {
  id: string;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  note: string | null;
  createdAt: string;
  changedBy: StatusActor;
};

/** Table reservation (GET /me/reservations, …). `type` distinguishes from event flow. */
export type MyTableReservation = ReservationRecord & {
  type: 'TABLE';
  requestedAt: string;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  restaurant: {
    id: string;
    name: string;
    city: string;
    area: string | null;
  };
  table: { id: string; name: string; capacity: number } | null;
  statusHistory: TableStatusHistoryItem[];
};

/** @deprecated use MyTableReservation */
export type MyReservation = MyTableReservation;

export type EventReservationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export type EventStatusHistoryItem = {
  id: string;
  fromStatus: EventReservationStatus | null;
  toStatus: EventReservationStatus;
  note: string | null;
  createdAt: string;
  changedBy: StatusActor;
};

/** Event night booking request (GET /me/event-reservations, …). */
export type MyEventReservation = {
  type: 'EVENT';
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
  restaurant: {
    id: string;
    name: string;
    city: string;
    area: string | null;
  };
  event: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    capacity: number | null;
    isFree: boolean;
    price: string | null;
    currency: string;
  };
  statusHistory: EventStatusHistoryItem[];
};

export type InAppNotificationType =
  | 'TABLE_RESERVATION_CONFIRMED'
  | 'TABLE_RESERVATION_REJECTED'
  | 'TABLE_RESERVATION_CANCELLED'
  | 'EVENT_RESERVATION_CONFIRMED'
  | 'EVENT_RESERVATION_REJECTED'
  | 'EVENT_RESERVATION_CANCELLED';

export type InAppNotificationEntityType =
  | 'TABLE_RESERVATION'
  | 'EVENT_RESERVATION'
  | 'RESTAURANT'
  | 'EVENT';

export type InAppNotification = {
  id: string;
  type: InAppNotificationType;
  title: string;
  message: string;
  entityType: InAppNotificationEntityType;
  entityId: string;
  restaurantId: string | null;
  eventId: string | null;
  reservationId: string | null;
  eventReservationId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type InAppNotificationListResponse = {
  notifications: InAppNotification[];
  unreadCount: number;
};
