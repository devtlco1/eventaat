/**
 * Reservation API shapes (re-exported for compatibility).
 * @see ./reservation-response.mappers.ts for the canonical types.
 */
export type {
  AdminTableReservationResponse,
  AdminTableReservationResponse as AdminReservationView,
  AdminEventReservationResponse,
  CustomerTableReservationResponse,
  CustomerTableReservationResponse as CustomerReservationListItem,
  PublicTableStatusHistoryItem,
  PublicTableStatusHistoryItem as AdminStatusHistoryEntry,
  PublicEventStatusHistoryItem,
} from './reservation-response.mappers';
