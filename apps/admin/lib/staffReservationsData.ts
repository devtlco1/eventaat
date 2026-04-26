import {
  listRestaurantEventReservations,
  listRestaurantReservations,
  listRestaurants,
  type AdminEventReservation,
  type Restaurant,
  type RestaurantReservation,
} from './api';

export async function loadAllAccessibleTableReservations(
  token: string,
): Promise<{
  restaurants: Restaurant[];
  rows: RestaurantReservation[];
}> {
  const restaurants = await listRestaurants(token);
  const chunks = await Promise.all(
    restaurants.map(async (r) => {
      try {
        return await listRestaurantReservations(token, r.id);
      } catch {
        return [] as RestaurantReservation[];
      }
    }),
  );
  const rows = chunks.flat();
  rows.sort(
    (a, b) =>
      new Date(b.requestedAt || b.startAt).getTime() -
      new Date(a.requestedAt || a.startAt).getTime(),
  );
  return { restaurants, rows };
}

export async function loadAllAccessibleEventReservations(
  token: string,
): Promise<{
  restaurants: Restaurant[];
  rows: AdminEventReservation[];
}> {
  const restaurants = await listRestaurants(token);
  const chunks = await Promise.all(
    restaurants.map(async (r) => {
      try {
        return await listRestaurantEventReservations(token, r.id);
      } catch {
        return [] as AdminEventReservation[];
      }
    }),
  );
  const rows = chunks.flat();
  rows.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return { restaurants, rows };
}
