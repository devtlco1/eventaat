# eventaat — API endpoint inventory

**Base URL (local):** `http://localhost:4000`  
**OpenAPI JSON:** [http://localhost:4000/docs-json](http://localhost:4000/docs-json) (with API running)  
**Handwritten reference (detail):** [api-reference.md](api-reference.md)

| Total endpoints | 55 |
|-----------------|----|

## Count by module (domain)

| Module | Count | Description |
|--------|------:|-------------|
| `health` | 1 | Liveness and DB check |
| `auth` | 4 | Register, login, session, admin smoke test |
| `users` | 3 | Platform user directory and updates |
| `me` | 10 | Reservations (customer) + in-app `notifications` + `reservation-operations` (staff) |
| `restaurants` | 37 | Restaurants CRUD, ops, events, both reservation types, tables, assignments |

The `restaurants` controller (single Nest `@Controller('restaurants')`) is split below by domain for clarity. Paths still live under `/restaurants/...`.

| Restaurants subdomain | Count |
|-----------------------|------:|
| Core CRUD & get-by-id | 4 |
| Availability, operating & opening hours, profile | 7 |
| Contacts | 4 |
| Event nights (events) | 6 |
| Event reservations | 4 |
| Admin assignments | 3 |
| Tables | 4 |
| Table reservations | 5 |
| *Subtotal* | *37* |

---

## Endpoint table (compact)

All paths are relative to the base URL. Unless noted, JSON request bodies follow the global `ValidationPipe` (unknown fields on DTO routes → **400**).

| Method | Path | Module | Auth | Roles | Status | Notes |
|--------|------|--------|------|------|--------|--------|
| GET | `/health` | health | No | — | implemented | 200: service + DB status |
| POST | `/auth/register` | auth | No | — | implemented | 201: creates CUSTOMER (default) |
| POST | `/auth/login` | auth | No | — | implemented | 200: `{ accessToken, user }` |
| GET | `/auth/me` | auth | Bearer | any | implemented | 401: invalid or missing token |
| GET | `/auth/admin-check` | auth | Bearer | PLATFORM_ADMIN | implemented | 403: non-platform |
| GET | `/users` | users | Bearer | PLATFORM_ADMIN | implemented | Optional query: `role`, `isActive` |
| GET | `/users/:id` | users | Bearer | PLATFORM_ADMIN | implemented | 404: unknown user |
| PATCH | `/users/:id` | users | Bearer | PLATFORM_ADMIN | implemented | Partial user update |
| GET | `/me/event-reservations` | me | Bearer | CUSTOMER | implemented | List caller’s event reservations (normalized `type: EVENT`, `statusHistory` oldest→newest) |
| GET | `/me/event-reservations/:eventReservationId` | me | Bearer | CUSTOMER | implemented | Single event reservation; 404 if not found / not owner |
| PATCH | `/me/event-reservations/:eventReservationId/cancel` | me | Bearer | CUSTOMER | implemented | Optional body `{ "note"?: string }` |
| GET | `/me/reservations` | me | Bearer | CUSTOMER | implemented | List caller’s table reservations (normalized `type: TABLE`, `statusHistory` oldest→newest) |
| GET | `/me/reservations/:reservationId` | me | Bearer | CUSTOMER | implemented | Single table reservation; 404 if not found / not owner |
| PATCH | `/me/reservations/:reservationId/cancel` | me | Bearer | CUSTOMER | implemented | Optional body `{ "note"?: string }` |
| GET | `/me/notifications` | me | Bearer | CUSTOMER, RESTAURANT_ADMIN, PLATFORM_ADMIN | implemented | Query: `unreadOnly?`, `limit?` (1–100); 200: `{ "notifications", "unreadCount" }` (newest first; items linkable via `entityType` + id fields) |
| PATCH | `/me/notifications/read-all` | me | Bearer | same | implemented | Marks all of caller’s as read; 200: `{ "updated": number }` |
| PATCH | `/me/notifications/:notificationId/read` | me | Bearer | same | implemented | 404 if not the recipient; 200: notification object |
| GET | `/me/reservation-operations` | me | Bearer | RESTAURANT_ADMIN, PLATFORM_ADMIN | implemented | 403: `CUSTOMER`; 200: pending + 7d recent table/event rows, scoped by assignment (R-A) or all restaurants (P-A) — admin dashboard work queue |
| POST | `/restaurants` | restaurants (core) | Bearer | PLATFORM_ADMIN | implemented | Create restaurant |
| GET | `/restaurants` | restaurants (core) | Bearer | any | implemented | Admins may see inactive |
| GET | `/restaurants/:id` | restaurants (core) | Bearer | any | implemented | 404: inactive for non-admins (policy) |
| PATCH | `/restaurants/:id` | restaurants (core) | Bearer | PLATFORM_ADMIN | implemented | Update core restaurant fields |
| GET | `/restaurants/:restaurantId/availability` | restaurants (availability) | Bearer | any | implemented | Query: `date`, `partySize`, `durationMinutes` |
| GET | `/restaurants/:restaurantId/operating-settings` | restaurants (ops) | Bearer | any | implemented | |
| PATCH | `/restaurants/:restaurantId/operating-settings` | restaurants (ops) | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | R-A only if assigned to restaurant |
| GET | `/restaurants/:restaurantId/opening-hours` | restaurants (ops) | Bearer | any | implemented | |
| PATCH | `/restaurants/:restaurantId/opening-hours` | restaurants (ops) | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | |
| GET | `/restaurants/:restaurantId/profile` | restaurants (ops) | Bearer | any | implemented | Extended profile fields |
| PATCH | `/restaurants/:restaurantId/profile` | restaurants (ops) | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | |
| GET | `/restaurants/:restaurantId/contacts` | restaurants (contacts) | Bearer | any | implemented | |
| POST | `/restaurants/:restaurantId/contacts` | restaurants (contacts) | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | |
| PATCH | `/restaurants/:restaurantId/contacts/:contactId` | restaurants (contacts) | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | |
| DELETE | `/restaurants/:restaurantId/contacts/:contactId` | restaurants (contacts) | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | 204 |
| GET | `/restaurants/:restaurantId/events` | event nights | Bearer | any | implemented | Query: includes admin-only filter fields |
| POST | `/restaurants/:restaurantId/events` | event nights | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | Create; starts PENDING review |
| GET | `/restaurants/:restaurantId/events/:eventId` | event nights | Bearer | any | implemented | |
| PATCH | `/restaurants/:restaurantId/events/:eventId/review` | event nights | Bearer | PLATFORM_ADMIN | implemented | Approve/reject PENDING only |
| PATCH | `/restaurants/:restaurantId/events/:eventId` | event nights | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | |
| DELETE | `/restaurants/:restaurantId/events/:eventId` | event nights | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | Soft deactivate (204) |
| POST | `/restaurants/:restaurantId/events/:eventId/reservations` | event reservations | Bearer | CUSTOMER | implemented | Body: `partySize`, optional `specialRequest` — **not** a table booking |
| GET | `/restaurants/:restaurantId/event-reservations` | event reservations | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | Query: `eventId?` (optional) |
| GET | `/restaurants/:restaurantId/event-reservations/:eventReservationId` | event reservations | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | Single row for restaurant; assignment applies |
| PATCH | `/restaurants/:restaurantId/event-reservations/:eventReservationId/status` | event reservations | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | `CONFIRMED` / `REJECTED`; capacity on confirm |
| POST | `/restaurants/:id/admins` | admin assignments | Bearer | PLATFORM_ADMIN | implemented | Body: `{ "userId" }` |
| GET | `/restaurants/:id/admins` | admin assignments | Bearer | PLATFORM_ADMIN | implemented | |
| DELETE | `/restaurants/:id/admins/:userId` | admin assignments | Bearer | PLATFORM_ADMIN | implemented | 204 |
| POST | `/restaurants/:restaurantId/tables` | tables | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | |
| GET | `/restaurants/:restaurantId/tables` | tables | Bearer | any | implemented | Customer: active only |
| GET | `/restaurants/:restaurantId/tables/:tableId` | tables | Bearer | any | implemented | Customer: inactive table → 404 |
| PATCH | `/restaurants/:restaurantId/tables/:tableId` | tables | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | |
| POST | `/restaurants/:restaurantId/reservations` | table reservations | Bearer | CUSTOMER | implemented | **Table** booking request (optional `tableId`) |
| GET | `/restaurants/:restaurantId/reservations` | table reservations | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | R-A: assigned only; responses include `type: TABLE`, `statusHistory` |
| GET | `/restaurants/:restaurantId/reservations/:reservationId` | table reservations | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | Full detail; same shape as list item |
| GET | `/restaurants/:restaurantId/reservations/:reservationId/history` | table reservations | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | Table status history only (list/detail also embed the same) |
| PATCH | `/restaurants/:restaurantId/reservations/:reservationId/status` | table reservations | Bearer | PLATFORM_ADMIN, RESTAURANT_ADMIN | implemented | Transitions + optional `note` |

*No endpoints are currently marked **deprecated** or **planned** in this inventory; future routes should be added here in the same commit as code changes (see [README.md](../README.md#api-documentation)).*

## Maintenance

When you add, change, or remove an API route, update this file and [api-reference.md](api-reference.md) in the same commit. See the root [README.md](../README.md#api-documentation).
