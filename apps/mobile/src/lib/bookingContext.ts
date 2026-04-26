/**
 * Distinguish future booking actions so event reservations are never
 * created with `restaurantId` alone. Restaurant flow uses only `restaurantId`;
 * event flow must always include `eventId` (Step 35: event reservation).
 */

export type BookingSourceType = 'EVENT' | 'RESTAURANT';

export type EventBookingContext = {
  type: 'EVENT';
  eventId: string;
  /** Host venue; required alongside eventId for API routes today. */
  restaurantId: string;
};

export type RestaurantBookingContext = {
  type: 'RESTAURANT';
  restaurantId: string;
};

export function isEventBooking(
  c: EventBookingContext | RestaurantBookingContext,
): c is EventBookingContext {
  return c.type === 'EVENT';
}

export function isRestaurantBooking(
  c: EventBookingContext | RestaurantBookingContext,
): c is RestaurantBookingContext {
  return c.type === 'RESTAURANT';
}
