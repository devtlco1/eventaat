import type { InAppNotification, InAppNotificationEntityType } from './types';

export type NotificationDetailTarget = { kind: 'TABLE' | 'EVENT'; id: string };

/**
 * Resolves a GET /me/notifications item to ReservationDetail screen params.
 * Table vs event is driven by `entityType` and explicit IDs, with safe fallbacks.
 */
export function resolveInAppNotificationDetail(
  n: InAppNotification,
): NotificationDetailTarget | null {
  const et: InAppNotificationEntityType = n.entityType;
  if (et === 'TABLE_RESERVATION') {
    const id = n.reservationId ?? n.entityId;
    return id ? { kind: 'TABLE', id } : null;
  }
  if (et === 'EVENT_RESERVATION') {
    const id = n.eventReservationId ?? n.entityId;
    return id ? { kind: 'EVENT', id } : null;
  }
  if (n.reservationId) {
    return { kind: 'TABLE', id: n.reservationId };
  }
  if (n.eventReservationId) {
    return { kind: 'EVENT', id: n.eventReservationId };
  }
  return null;
}
