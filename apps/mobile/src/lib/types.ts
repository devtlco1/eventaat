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

/** Status audit entries for GET /me/reservations (no actor details). */
export type ReservationStatusChangeSummary = {
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  note: string | null;
  createdAt: string;
};

/** Response from GET /me/reservations (includes restaurant + table when set). */
export type MyReservation = ReservationRecord & {
  restaurant: {
    id: string;
    name: string;
    city: string;
    area: string | null;
  };
  table: { id: string; name: string; capacity: number } | null;
  /** Omitted on older API versions. */
  statusHistory?: ReservationStatusChangeSummary[];
};
