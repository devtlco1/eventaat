import type { InAppNotification } from './api';

/** Admin list URL for a table reservation (matches Step 38 / notification deep links). */
export function adminTableReservationListPath(
  restaurantId: string,
  reservationId: string,
): string {
  return `/dashboard/restaurants/${restaurantId}/reservations?reservationId=${encodeURIComponent(
    reservationId,
  )}`;
}

/** Admin list URL for an event night reservation. Include `eventId` when available. */
export function adminEventReservationListPath(
  restaurantId: string,
  eventReservationId: string,
  eventId?: string | null,
): string {
  const p = new URLSearchParams();
  p.set('eventReservationId', eventReservationId);
  if (eventId) p.set('eventId', eventId);
  return `/dashboard/restaurants/${restaurantId}/event-reservations?${p.toString()}`;
}

/**
 * Target URL for a stored notification, or null if the row cannot be deep-linked.
 * Table and event stay on separate admin routes; query params are used to highlight a row.
 */
export function getNotificationAdminPath(n: InAppNotification): {
  path: string;
} | null {
  const restId = n.restaurantId;
  if (!restId) return null;

  if (n.entityType === 'TABLE_RESERVATION') {
    const rid = n.reservationId ?? n.entityId;
    if (!rid) return null;
    return { path: adminTableReservationListPath(restId, rid) };
  }

  if (n.entityType === 'EVENT_RESERVATION') {
    const evResId = n.eventReservationId ?? n.entityId;
    if (!evResId) return null;
    return { path: adminEventReservationListPath(restId, evResId, n.eventId) };
  }

  if (n.reservationId) {
    return { path: adminTableReservationListPath(restId, n.reservationId) };
  }
  if (n.eventReservationId) {
    return {
      path: adminEventReservationListPath(
        restId,
        n.eventReservationId,
        n.eventId,
      ),
    };
  }

  return null;
}
