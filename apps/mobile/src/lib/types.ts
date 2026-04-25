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
