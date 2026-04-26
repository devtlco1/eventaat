import {
  listRestaurantEventReservations,
  listRestaurantEvents,
  listRestaurantReservations,
  listRestaurants,
  type AdminEventReservation,
  type Restaurant,
  type RestaurantEvent,
  type RestaurantReservation,
} from './api';

function enrichTableRows(
  rows: RestaurantReservation[],
  restaurants: Restaurant[],
): RestaurantReservation[] {
  const byId = new Map(restaurants.map((r) => [r.id, r]));
  return rows.map((row) => {
    if (row.restaurant?.name) return row;
    const r = byId.get(row.restaurantId);
    if (!r) return row;
    return {
      ...row,
      restaurant: {
        id: r.id,
        name: r.name,
        city: r.city,
        area: r.area,
      },
    };
  });
}

function enrichEventResRows(
  rows: AdminEventReservation[],
  restaurants: Restaurant[],
): AdminEventReservation[] {
  const byId = new Map(restaurants.map((r) => [r.id, r]));
  return rows.map((row) => {
    if (row.restaurant?.name) return row;
    const r = byId.get(row.restaurantId);
    if (!r) return row;
    return {
      ...row,
      restaurant: { id: r.id, name: r.name, city: r.city, area: r.area },
    };
  });
}

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
  return { restaurants, rows: enrichTableRows(rows, restaurants) };
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
  return { restaurants, rows: enrichEventResRows(rows, restaurants) };
}

export async function loadAllAccessibleEventNights(
  token: string,
): Promise<{
  restaurants: Restaurant[];
  events: RestaurantEvent[];
}> {
  const restaurants = await listRestaurants(token);
  const chunks = await Promise.all(
    restaurants.map(async (r) => {
      try {
        return await listRestaurantEvents(token, r.id);
      } catch {
        return [] as RestaurantEvent[];
      }
    }),
  );
  const events = chunks.flat();
  events.sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  );
  return { restaurants, events };
}
