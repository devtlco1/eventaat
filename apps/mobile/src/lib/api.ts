import type {
  AuthLoginResponse,
  AvailabilityResponse,
  CreateReservationRequestBody,
  ReservationRecord,
  Restaurant,
  RestaurantDetail,
} from './types';

function baseUrl(): string {
  const u = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
  return u.replace(/\/$/, '');
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[]; error?: string };
    if (Array.isArray(body?.message)) return body.message[0] ?? fallback;
    if (typeof body?.message === 'string') return body.message;
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // use fallback
  }
  return fallback;
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthLoginResponse> {
  const res = await fetch(`${baseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const message = await readErrorMessage(res, `Sign in failed (${res.status})`);
    throw new Error(message);
  }
  return res.json() as Promise<AuthLoginResponse>;
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };
}

export async function fetchRestaurants(accessToken: string): Promise<Restaurant[]> {
  const res = await fetch(`${baseUrl()}/restaurants`, {
    headers: authHeaders(accessToken),
  });
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<Restaurant[]>;
}

export async function fetchRestaurantById(
  accessToken: string,
  restaurantId: string,
): Promise<RestaurantDetail> {
  const res = await fetch(`${baseUrl()}/restaurants/${restaurantId}`, {
    headers: authHeaders(accessToken),
  });
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      res.status === 404 ? 'Restaurant not found.' : `Request failed (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<RestaurantDetail>;
}

export type AvailabilityQuery = {
  date: string;
  partySize: number;
  durationMinutes: number;
};

export async function fetchAvailability(
  accessToken: string,
  restaurantId: string,
  query: AvailabilityQuery,
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({
    date: query.date,
    partySize: String(query.partySize),
    durationMinutes: String(query.durationMinutes),
  });
  const res = await fetch(
    `${baseUrl()}/restaurants/${restaurantId}/availability?${params.toString()}`,
    { headers: authHeaders(accessToken) },
  );
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Could not load availability (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<AvailabilityResponse>;
}

export async function createReservationRequest(
  accessToken: string,
  restaurantId: string,
  body: CreateReservationRequestBody,
): Promise<ReservationRecord> {
  const res = await fetch(`${baseUrl()}/restaurants/${restaurantId}/reservations`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Could not send reservation request (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<ReservationRecord>;
}
