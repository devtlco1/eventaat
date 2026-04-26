export type ApiError = {
  status: number;
  message: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { message?: unknown };
    const message =
      typeof body?.message === 'string'
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(', ')
          : res.statusText || 'Request failed';
    return { status: res.status, message };
  } catch {
    return { status: res.status, message: res.statusText || 'Request failed' };
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const url = `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  // Some endpoints (e.g. DELETE) return 204 No Content.
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export type LoginResponse = { accessToken: string };

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export type MeResponse = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'CUSTOMER' | 'RESTAURANT_ADMIN' | 'PLATFORM_ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function getMe(token: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', { method: 'GET', token });
}

export type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address: string;
  city: string;
  area: string | null;
  latitude: string | null;
  longitude: string | null;
  isActive: boolean;
  websiteUrl: string | null;
  menuUrl: string | null;
  locationUrl: string | null;
  instagramUrl: string | null;
  coverImageUrl: string | null;
  profileImageUrl: string | null;
  shortDescription: string | null;
  profileDescription: string | null;
  createdAt: string;
  updatedAt: string;
};

export function listRestaurants(token: string): Promise<Restaurant[]> {
  return apiRequest<Restaurant[]>('/restaurants', { method: 'GET', token });
}

export type CreateRestaurantInput = {
  name: string;
  address: string;
  city: string;
  description?: string;
  phone?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
};

export function createRestaurant(
  token: string,
  input: CreateRestaurantInput,
): Promise<Restaurant> {
  return apiRequest<Restaurant>('/restaurants', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export type RestaurantTable = {
  id: string;
  restaurantId: string;
  name: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function listRestaurantTables(
  token: string,
  restaurantId: string,
): Promise<RestaurantTable[]> {
  return apiRequest<RestaurantTable[]>(
    `/restaurants/${restaurantId}/tables`,
    { method: 'GET', token },
  );
}

export type CreateRestaurantTableInput = {
  name: string;
  capacity: number;
};

export function createRestaurantTable(
  token: string,
  restaurantId: string,
  input: CreateRestaurantTableInput,
): Promise<RestaurantTable> {
  return apiRequest<RestaurantTable>(`/restaurants/${restaurantId}/tables`, {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function updateRestaurantTable(
  token: string,
  restaurantId: string,
  tableId: string,
  data: { name?: string; capacity?: number; isActive?: boolean },
): Promise<RestaurantTable> {
  return apiRequest<RestaurantTable>(
    `/restaurants/${restaurantId}/tables/${tableId}`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    },
  );
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

export type AdminReservationStatus = Exclude<ReservationStatus, 'PENDING'>;

export type RestaurantReservation = {
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
  customer: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
  };
  table: Pick<RestaurantTable, 'id' | 'name' | 'capacity'> | null;
  statusHistory?: RestaurantReservationHistoryEntry[];
};

export type RestaurantReservationHistoryEntry = {
  id: string;
  reservationId: string;
  changedByUserId: string | null;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus;
  note: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

export function listRestaurantReservations(
  token: string,
  restaurantId: string,
): Promise<RestaurantReservation[]> {
  return apiRequest<RestaurantReservation[]>(
    `/restaurants/${restaurantId}/reservations`,
    { method: 'GET', token },
  );
}

export function updateReservationStatus(
  token: string,
  restaurantId: string,
  reservationId: string,
  status: AdminReservationStatus,
  note?: string,
): Promise<RestaurantReservation> {
  return apiRequest<RestaurantReservation>(
    `/restaurants/${restaurantId}/reservations/${reservationId}/status`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status, ...(note ? { note } : {}) }),
    },
  );
}

export type RestaurantAdminAssignment = {
  userId: string;
  restaurantId: string;
  assignedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'CUSTOMER' | 'RESTAURANT_ADMIN' | 'PLATFORM_ADMIN';
  };
};

export function listRestaurantAdmins(
  token: string,
  restaurantId: string,
): Promise<RestaurantAdminAssignment[]> {
  return apiRequest<RestaurantAdminAssignment[]>(
    `/restaurants/${restaurantId}/admins`,
    { method: 'GET', token },
  );
}

export function assignRestaurantAdmin(
  token: string,
  restaurantId: string,
  userId: string,
): Promise<RestaurantAdminAssignment> {
  return apiRequest<RestaurantAdminAssignment>(`/restaurants/${restaurantId}/admins`, {
    method: 'POST',
    token,
    body: JSON.stringify({ userId }),
  });
}

export async function removeRestaurantAdmin(
  token: string,
  restaurantId: string,
  userId: string,
): Promise<void> {
  await apiRequest<unknown>(`/restaurants/${restaurantId}/admins/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export type UserRole = MeResponse['role'];

export type PlatformUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function listUsers(
  token: string,
  filters: { role?: UserRole; isActive?: boolean } = {},
): Promise<PlatformUser[]> {
  const params = new URLSearchParams();
  if (filters.role) params.set('role', filters.role);
  if (typeof filters.isActive === 'boolean') {
    params.set('isActive', String(filters.isActive));
  }
  const qs = params.toString();
  return apiRequest<PlatformUser[]>(`/users${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    token,
  });
}

export function getUser(token: string, id: string): Promise<PlatformUser> {
  return apiRequest<PlatformUser>(`/users/${id}`, { method: 'GET', token });
}

export function updateUser(
  token: string,
  id: string,
  input: {
    fullName?: string;
    phone?: string;
    role?: UserRole;
    isActive?: boolean;
  },
): Promise<PlatformUser> {
  return apiRequest<PlatformUser>(`/users/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(input),
  });
}

export type RestaurantOperatingSettings = {
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
};

export type RestaurantOpeningHour = {
  id: string;
  restaurantId: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
};

export function getOperatingSettings(
  token: string,
  restaurantId: string,
): Promise<RestaurantOperatingSettings> {
  return apiRequest<RestaurantOperatingSettings>(
    `/restaurants/${restaurantId}/operating-settings`,
    { method: 'GET', token },
  );
}

export function updateOperatingSettings(
  token: string,
  restaurantId: string,
  input: Partial<{
    defaultReservationDurationMinutes: number;
    minPartySize: number;
    maxPartySize: number | null;
    manualApprovalRequired: boolean;
    acceptsReservations: boolean;
    advanceBookingDays: number;
    sameDayCutoffMinutes: number;
  }>,
): Promise<RestaurantOperatingSettings> {
  return apiRequest<RestaurantOperatingSettings>(
    `/restaurants/${restaurantId}/operating-settings`,
    { method: 'PATCH', token, body: JSON.stringify(input) },
  );
}

export function getOpeningHours(
  token: string,
  restaurantId: string,
): Promise<RestaurantOpeningHour[]> {
  return apiRequest<RestaurantOpeningHour[]>(
    `/restaurants/${restaurantId}/opening-hours`,
    { method: 'GET', token },
  );
}

export function updateOpeningHours(
  token: string,
  restaurantId: string,
  days: Array<{
    dayOfWeek: number;
    opensAt: string;
    closesAt: string;
    isClosed: boolean;
  }>,
): Promise<RestaurantOpeningHour[]> {
  return apiRequest<RestaurantOpeningHour[]>(
    `/restaurants/${restaurantId}/opening-hours`,
    { method: 'PATCH', token, body: JSON.stringify({ days }) },
  );
}

export type RestaurantProfile = {
  id: string;
  websiteUrl: string | null;
  menuUrl: string | null;
  locationUrl: string | null;
  instagramUrl: string | null;
  coverImageUrl: string | null;
  profileImageUrl: string | null;
  shortDescription: string | null;
  profileDescription: string | null;
};

export function getRestaurantProfile(
  token: string,
  restaurantId: string,
): Promise<RestaurantProfile> {
  return apiRequest<RestaurantProfile>(
    `/restaurants/${restaurantId}/profile`,
    { method: 'GET', token },
  );
}

export function updateRestaurantProfile(
  token: string,
  restaurantId: string,
  input: Partial<{
    websiteUrl: string;
    menuUrl: string;
    locationUrl: string;
    instagramUrl: string;
    coverImageUrl: string;
    profileImageUrl: string;
    shortDescription: string;
    profileDescription: string;
  }>,
): Promise<RestaurantProfile> {
  return apiRequest<RestaurantProfile>(
    `/restaurants/${restaurantId}/profile`,
    { method: 'PATCH', token, body: JSON.stringify(input) },
  );
}

export type RestaurantContactType =
  | 'PHONE'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'WEBSITE'
  | 'EMAIL'
  | 'OTHER';

export type RestaurantContact = {
  id: string;
  restaurantId: string;
  label: string;
  type: RestaurantContactType;
  value: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export function getRestaurantContacts(
  token: string,
  restaurantId: string,
): Promise<RestaurantContact[]> {
  return apiRequest<RestaurantContact[]>(
    `/restaurants/${restaurantId}/contacts`,
    { method: 'GET', token },
  );
}

export function createRestaurantContact(
  token: string,
  restaurantId: string,
  input: {
    label: string;
    type: RestaurantContactType;
    value: string;
    isPrimary?: boolean;
  },
): Promise<RestaurantContact> {
  return apiRequest<RestaurantContact>(
    `/restaurants/${restaurantId}/contacts`,
    { method: 'POST', token, body: JSON.stringify(input) },
  );
}

export function updateRestaurantContact(
  token: string,
  restaurantId: string,
  contactId: string,
  input: Partial<{
    label: string;
    type: RestaurantContactType;
    value: string;
    isPrimary: boolean;
  }>,
): Promise<RestaurantContact> {
  return apiRequest<RestaurantContact>(
    `/restaurants/${restaurantId}/contacts/${contactId}`,
    { method: 'PATCH', token, body: JSON.stringify(input) },
  );
}

export function deleteRestaurantContact(
  token: string,
  restaurantId: string,
  contactId: string,
): Promise<void> {
  return apiRequest<void>(`/restaurants/${restaurantId}/contacts/${contactId}`, {
    method: 'DELETE',
    token,
  });
}

export type RestaurantEventStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type RestaurantEvent = {
  id: string;
  restaurantId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: RestaurantEventStatus;
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
  galleryImageUrls: string[] | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; fullName: string; email: string } | null;
  approvedBy: { id: string; fullName: string; email: string } | null;
};

export function listRestaurantEvents(
  token: string,
  restaurantId: string,
  query: {
    status?: RestaurantEventStatus;
    activeOnly?: boolean;
    upcomingOnly?: boolean;
  } = {},
): Promise<RestaurantEvent[]> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (typeof query.activeOnly === 'boolean') {
    params.set('activeOnly', String(query.activeOnly));
  }
  if (typeof query.upcomingOnly === 'boolean') {
    params.set('upcomingOnly', String(query.upcomingOnly));
  }
  const qs = params.toString();
  return apiRequest<RestaurantEvent[]>(
    `/restaurants/${restaurantId}/events${qs ? `?${qs}` : ''}`,
    { method: 'GET', token },
  );
}

export type CreateRestaurantEventInput = {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
  isFree?: boolean;
  price?: number;
  currency?: string;
  capacity?: number;
  seatsAvailableNote?: string;
  specialMenuDescription?: string;
  specialMenuUrl?: string;
  whatIsIncluded?: string;
  entertainmentInfo?: string;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
};

export function createRestaurantEvent(
  token: string,
  restaurantId: string,
  input: CreateRestaurantEventInput,
): Promise<RestaurantEvent> {
  return apiRequest<RestaurantEvent>(`/restaurants/${restaurantId}/events`, {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function updateRestaurantEvent(
  token: string,
  restaurantId: string,
  eventId: string,
  input: Partial<CreateRestaurantEventInput>,
): Promise<RestaurantEvent> {
  return apiRequest<RestaurantEvent>(
    `/restaurants/${restaurantId}/events/${eventId}`,
    { method: 'PATCH', token, body: JSON.stringify(input) },
  );
}

export function reviewRestaurantEvent(
  token: string,
  restaurantId: string,
  eventId: string,
  input: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
): Promise<RestaurantEvent> {
  return apiRequest<RestaurantEvent>(
    `/restaurants/${restaurantId}/events/${eventId}/review`,
    { method: 'PATCH', token, body: JSON.stringify(input) },
  );
}

export function deactivateRestaurantEvent(
  token: string,
  restaurantId: string,
  eventId: string,
): Promise<void> {
  return apiRequest<void>(`/restaurants/${restaurantId}/events/${eventId}`, {
    method: 'DELETE',
    token,
  });
}

