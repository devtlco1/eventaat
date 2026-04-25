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

/** Response from GET /me/reservations (includes restaurant + table when set). */
export type MyReservation = ReservationRecord & {
  restaurant: {
    id: string;
    name: string;
    city: string;
    area: string | null;
  };
  table: { id: string; name: string; capacity: number } | null;
};
