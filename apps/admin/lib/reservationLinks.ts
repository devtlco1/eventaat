import type { InAppNotification } from './api';

/** Business-facing: global list for table (restaurant) booking requests. */
export function globalTableReservationsPath(q?: {
  restaurantId?: string;
  reservationId?: string;
}): string {
  const p = new URLSearchParams();
  if (q?.restaurantId) p.set('restaurantId', q.restaurantId);
  if (q?.reservationId) p.set('reservationId', q.reservationId);
  const s = p.toString();
  return `/dashboard/bookings/restaurants${s ? `?${s}` : ''}`;
}

/** Business-facing: global list for event night booking requests. */
export function globalEventReservationsPath(q?: {
  restaurantId?: string;
  eventId?: string;
  eventReservationId?: string;
}): string {
  const p = new URLSearchParams();
  if (q?.restaurantId) p.set('restaurantId', q.restaurantId);
  if (q?.eventId) p.set('eventId', q.eventId);
  if (q?.eventReservationId) p.set('eventReservationId', q.eventReservationId);
  const s = p.toString();
  return `/dashboard/bookings/events${s ? `?${s}` : ''}`;
}

/** @deprecated — legacy “pending work” list; use dashboard + booking pages. */
export function pendingBookingsPath(): string {
  return '/dashboard';
}

/** Per-restaurant table list; bookmark and legacy deep links. */
export function perRestaurantTableReservationsPath(
  restaurantId: string,
  reservationId?: string,
): string {
  const p = new URLSearchParams();
  if (reservationId) p.set('reservationId', reservationId);
  const s = p.toString();
  return `/dashboard/restaurants/${restaurantId}/reservations${s ? `?${s}` : ''}`;
}

/** Per-restaurant event list; legacy deep links. */
export function perRestaurantEventReservationsPath(
  restaurantId: string,
  q?: { eventId?: string; eventReservationId?: string },
): string {
  const p = new URLSearchParams();
  if (q?.eventReservationId) p.set('eventReservationId', q.eventReservationId);
  if (q?.eventId) p.set('eventId', q.eventId);
  const s = p.toString();
  return `/dashboard/restaurants/${restaurantId}/event-reservations${s ? `?${s}` : ''}`;
}

/**
 * In-app notification target: global reservations workspace.
 * Table and event stay on separate admin routes; query params highlight a row.
 */
export function getNotificationAdminPath(
  n: InAppNotification,
): { path: string } | null {
  const restId = n.restaurantId;

  if (n.entityType === 'EVENT') {
    const eid = n.eventId ?? n.entityId;
    if (!eid) return null;
    const p = new URLSearchParams();
    p.set('eventId', eid);
    if (restId) p.set('restaurantId', restId);
    return { path: `/dashboard/events?${p.toString()}` };
  }

  if (n.entityType === 'RESTAURANT' && restId) {
    const p = new URLSearchParams();
    p.set('restaurantId', restId);
    return { path: `/dashboard/restaurants?${p.toString()}` };
  }

  if (n.entityType === 'TABLE_RESERVATION' && !restId) {
    const rid = n.reservationId ?? n.entityId;
    if (rid) {
      return { path: `/dashboard/bookings/restaurants?reservationId=${encodeURIComponent(rid)}` };
    }
    return null;
  }

  if (!restId) return null;

  if (n.entityType === 'TABLE_RESERVATION') {
    const rid = n.reservationId ?? n.entityId;
    if (!rid) return null;
    return {
      path: globalTableReservationsPath({
        restaurantId: restId,
        reservationId: rid,
      }),
    };
  }

  if (n.entityType === 'EVENT_RESERVATION') {
    const evResId = n.eventReservationId ?? n.entityId;
    if (!evResId) return null;
    return {
      path: globalEventReservationsPath({
        restaurantId: restId,
        eventId: n.eventId ?? undefined,
        eventReservationId: evResId,
      }),
    };
  }

  if (n.reservationId) {
    return {
      path: globalTableReservationsPath({
        restaurantId: restId,
        reservationId: n.reservationId,
      }),
    };
  }
  if (n.eventReservationId) {
    return {
      path: globalEventReservationsPath({
        restaurantId: restId,
        eventId: n.eventId ?? undefined,
        eventReservationId: n.eventReservationId,
      }),
    };
  }

  return null;
}
