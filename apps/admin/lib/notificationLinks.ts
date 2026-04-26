import {
  globalEventReservationsPath,
  globalTableReservationsPath,
} from './reservationLinks';

export {
  getNotificationAdminPath,
  globalEventReservationsPath,
  globalTableReservationsPath,
} from './reservationLinks';

/** @deprecated use globalTableReservationsPath with same (restaurantId, reservationId) */
export function adminTableReservationListPath(
  restaurantId: string,
  reservationId: string,
): string {
  return globalTableReservationsPath({ restaurantId, reservationId });
}

/** @deprecated use globalEventReservationsPath with same args */
export function adminEventReservationListPath(
  restaurantId: string,
  eventReservationId: string,
  eventId?: string | null,
): string {
  return globalEventReservationsPath({
    restaurantId,
    eventReservationId,
    eventId: eventId ?? undefined,
  });
}
