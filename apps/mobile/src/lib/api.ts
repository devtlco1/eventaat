import type { AuthLoginResponse, Restaurant } from './types';

function baseUrl(): string {
  const u = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
  return u.replace(/\/$/, '');
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
    let message = `Sign in failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[]; error?: string };
      if (Array.isArray(body?.message)) message = body.message[0] ?? message;
      else if (typeof body?.message === 'string') message = body.message;
      else if (typeof body?.error === 'string') message = body.error;
    } catch {
      // use default
    }
    throw new Error(message);
  }
  return res.json() as Promise<AuthLoginResponse>;
}

export async function fetchRestaurants(accessToken: string): Promise<Restaurant[]> {
  const res = await fetch(`${baseUrl()}/restaurants`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
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
