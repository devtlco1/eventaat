import type {
  AuthLoginResponse,
  AvailabilityResponse,
  CreateReservationRequestBody,
  MyEventReservation,
  MyReservation,
  MyTableReservation,
  Restaurant,
  RestaurantContact,
  RestaurantDetail,
  RestaurantEvent,
  RestaurantOperatingSettings,
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

export async function fetchRestaurantContacts(
  accessToken: string,
  restaurantId: string,
): Promise<RestaurantContact[]> {
  const res = await fetch(`${baseUrl()}/restaurants/${restaurantId}/contacts`, {
    headers: authHeaders(accessToken),
  });
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Request failed (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<RestaurantContact[]>;
}

export async function fetchRestaurantEvents(
  accessToken: string,
  restaurantId: string,
): Promise<RestaurantEvent[]> {
  const res = await fetch(`${baseUrl()}/restaurants/${restaurantId}/events`, {
    headers: authHeaders(accessToken),
  });
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      res.status === 404 ? 'Events not found.' : `Request failed (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<RestaurantEvent[]>;
}

/** Single public event (customer sees approved, active, upcoming from API). */
export async function fetchRestaurantEvent(
  accessToken: string,
  restaurantId: string,
  eventId: string,
): Promise<RestaurantEvent> {
  const res = await fetch(
    `${baseUrl()}/restaurants/${restaurantId}/events/${eventId}`,
    { headers: authHeaders(accessToken) },
  );
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      res.status === 404 ? 'Event not found.' : `Request failed (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<RestaurantEvent>;
}

export type EventFeedItem = { event: RestaurantEvent; hostName: string };

/**
 * Home: one `GET /restaurants`, then one events list per active restaurant (reuses public routes).
 * Failed per-venue fetches are skipped so a single error does not empty the list.
 */
export async function fetchHomeData(
  accessToken: string,
): Promise<{ eventFeed: EventFeedItem[]; restaurants: Restaurant[] }> {
  const restaurants = await fetchRestaurants(accessToken);
  const active = restaurants.filter((r) => r.isActive);
  const nameById = new Map(restaurants.map((r) => [r.id, r.name] as const));
  const settled = await Promise.allSettled(
    active.map((r) => fetchRestaurantEvents(accessToken, r.id)),
  );
  const byId = new Map<string, RestaurantEvent>();
  for (const s of settled) {
    if (s.status !== 'fulfilled') continue;
    for (const ev of s.value) {
      byId.set(ev.id, ev);
    }
  }
  const eventFeed = Array.from(byId.values())
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .map((ev) => ({
      event: ev,
      hostName: nameById.get(ev.restaurantId) ?? 'Restaurant',
    }));
  return { eventFeed, restaurants };
}

export async function fetchOperatingSettings(
  accessToken: string,
  restaurantId: string,
): Promise<RestaurantOperatingSettings> {
  const res = await fetch(
    `${baseUrl()}/restaurants/${restaurantId}/operating-settings`,
    { headers: authHeaders(accessToken) },
  );
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      res.status === 404
        ? 'Operating settings not found.'
        : `Request failed (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<RestaurantOperatingSettings>;
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
): Promise<MyTableReservation> {
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
  return res.json() as Promise<MyTableReservation>;
}

export type CancelMyReservationBody = { note?: string };

export async function cancelMyReservation(
  accessToken: string,
  reservationId: string,
  body: CancelMyReservationBody = {},
): Promise<MyReservation> {
  const res = await fetch(
    `${baseUrl()}/me/reservations/${encodeURIComponent(reservationId)}/cancel`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: body.note }),
    },
  );
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Could not cancel reservation (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<MyReservation>;
}

export async function fetchMyTableReservation(
  accessToken: string,
  reservationId: string,
): Promise<MyTableReservation> {
  const res = await fetch(
    `${baseUrl()}/me/reservations/${encodeURIComponent(reservationId)}`,
    { method: 'GET', headers: authHeaders(accessToken) },
  );
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Could not load reservation (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<MyTableReservation>;
}

export async function fetchMyEventReservation(
  accessToken: string,
  eventReservationId: string,
): Promise<MyEventReservation> {
  const res = await fetch(
    `${baseUrl()}/me/event-reservations/${encodeURIComponent(eventReservationId)}`,
    { method: 'GET', headers: authHeaders(accessToken) },
  );
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Could not load event reservation (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<MyEventReservation>;
}

export async function fetchMyReservations(
  accessToken: string,
): Promise<MyReservation[]> {
  const res = await fetch(`${baseUrl()}/me/reservations`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Could not load reservations (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<MyReservation[]>;
}

export type CreateEventReservationBody = { partySize: number; specialRequest?: string };

export async function createEventReservationRequest(
  accessToken: string,
  restaurantId: string,
  eventId: string,
  body: CreateEventReservationBody,
): Promise<MyEventReservation> {
  const res = await fetch(
    `${baseUrl()}/restaurants/${restaurantId}/events/${eventId}/reservations`,
    {
      method: 'POST',
      headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partySize: body.partySize,
        ...(body.specialRequest?.trim() ? { specialRequest: body.specialRequest.trim() } : {}),
      }),
    },
  );
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Could not request event spot (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<MyEventReservation>;
}

export async function fetchMyEventReservations(
  accessToken: string,
): Promise<MyEventReservation[]> {
  const res = await fetch(`${baseUrl()}/me/event-reservations`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Could not load event reservations (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<MyEventReservation[]>;
}

export async function cancelMyEventReservation(
  accessToken: string,
  eventReservationId: string,
  body: CancelMyReservationBody = {},
): Promise<MyEventReservation> {
  const res = await fetch(
    `${baseUrl()}/me/event-reservations/${encodeURIComponent(eventReservationId)}/cancel`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: body.note }),
    },
  );
  if (res.status === 401) {
    throw new Error('Unauthorized (401) — sign in again.');
  }
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      `Could not cancel event reservation (${res.status})`,
    );
    throw new Error(message);
  }
  return res.json() as Promise<MyEventReservation>;
}
