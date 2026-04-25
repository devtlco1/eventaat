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

