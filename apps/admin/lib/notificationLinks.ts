import type { InAppNotification } from './api';

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
    return {
      path: `/dashboard/restaurants/${restId}/reservations?reservationId=${encodeURIComponent(rid)}`,
    };
  }

  if (n.entityType === 'EVENT_RESERVATION') {
    const evResId = n.eventReservationId ?? n.entityId;
    if (!evResId) return null;
    const p = new URLSearchParams();
    p.set('eventReservationId', evResId);
    if (n.eventId) p.set('eventId', n.eventId);
    return {
      path: `/dashboard/restaurants/${restId}/event-reservations?${p.toString()}`,
    };
  }

  if (n.reservationId) {
    return {
      path: `/dashboard/restaurants/${restId}/reservations?reservationId=${encodeURIComponent(
        n.reservationId,
      )}`,
    };
  }
  if (n.eventReservationId) {
    const p = new URLSearchParams();
    p.set('eventReservationId', n.eventReservationId);
    if (n.eventId) p.set('eventId', n.eventId);
    return { path: `/dashboard/restaurants/${restId}/event-reservations?${p.toString()}` };
  }

  return null;
}
