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
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export type RestaurantReservation = {
  id: string;
  customerId: string;
  restaurantId: string;
  tableId: string;
  partySize: number;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  customerNote: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Pick<MeResponse, 'id' | 'email' | 'fullName'>;
  table?: Pick<RestaurantTable, 'id' | 'name' | 'capacity'>;
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
  status: Exclude<ReservationStatus, 'PENDING'>,
): Promise<RestaurantReservation> {
  return apiRequest<RestaurantReservation>(
    `/restaurants/${restaurantId}/reservations/${reservationId}/status`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
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

