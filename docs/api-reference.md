# eventaat — HTTP API reference

**Base URL (local development):** `http://localhost:4000`  
**Alternate discovery:** [OpenAPI (Swagger) UI](http://localhost:4000/docs) and [OpenAPI JSON](http://localhost:4000/docs-json) (when the API is running)  
**Quick index:** [api-inventory.md](api-inventory.md) (endpoint list and counts)  
**Backend README:** [apps/api/README.md](../apps/api/README.md) (Prisma, validation, setup)

This document is the **primary human-readable contract** for consumers (mobile, admin, integrations). It must stay in lockstep with the NestJS implementation; any route change should update this file, [api-inventory.md](api-inventory.md), and (as needed) the OpenAPI description.

---

## Conventions

### Global validation

All DTO-typed `POST` / `PATCH` / query objects are validated with a **global** `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`). **Unknown JSON properties** on a body are rejected with **400** (unless the route is intentionally untyped).

### Authentication: JWT Bearer

Protected routes require:

```http
Authorization: Bearer <accessToken>
```

Obtained from `POST /auth/login` (or `POST /auth/register` then login). Requests without a valid token receive **401**.

### Role model (RBAC)

| Role (code) | Description |
|-------------|-------------|
| `CUSTOMER` | Mobile app end user |
| `RESTAURANT_ADMIN` | Operator assigned to one or more restaurants |
| `PLATFORM_ADMIN` | Platform operator; full user/restaurant/assignment access |

`RolesGuard` is applied with `JwtAuthGuard` where documented. A route with **no** `@Roles()` restriction (but still behind JWT) is available to **any authenticated role** — written below as `any authenticated` or `Bearer, any role`.

A route listing multiple roles (e.g. `PLATFORM_ADMIN`, `RESTAURANT_ADMIN`) means **or**: the user’s role must be in the set. Restaurant admins are further restricted by **assignment** to a restaurant where applicable (otherwise **404** for “not found” or **403** for forbidden, depending on implementation).

### Common status codes

| Code | When |
|------|------|
| **200** | OK (GET, PATCH) |
| **201** | Created (e.g. register) |
| **204** | No content (e.g. DELETE) |
| **400** | Validation / bad input |
| **401** | Missing or invalid JWT |
| **403** | Valid JWT but insufficient role, or not assigned to resource |
| **404** | Resource not found, or hidden to caller (e.g. inactive content) |
| **422** | Unprocessable entity (business rule; used in some flows) |

---

## 1. Health

### `GET /health`

| | |
|---|--|
| **Purpose** | Readiness-style check; reports DB connectivity. |
| **Auth** | None |
| **Query** | None |

**200 response (shape):**

```json
{
  "status": "ok" | "degraded",
  "service": "eventaat-api",
  "version": "0.0.1",
  "database": "ok" | "unavailable",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "uptimeSeconds": 0
}
```

**Rules:** If the database is down, the API may still respond with `status: "degraded"` and `database: "unavailable"`.

---

## 2. Auth

### `POST /auth/register`

| | |
|---|--|
| **Purpose** | Create a new user; default role is **CUSTOMER**. |
| **Auth** | None |

**Request body (example):**

```json
{
  "email": "user@example.com",
  "password": "securepass",
  "fullName": "A User",
  "phone": null
}
```

**201 / 200 (shape):** access token and user (password hash not exposed). On duplicate email, expect an error (typically 400/409 per implementation).

### `POST /auth/login`

| | |
|---|--|
| **Purpose** | Exchange credentials for JWT. |
| **Auth** | None |

**Request body (example):**

```json
{
  "email": "user@example.com",
  "password": "securepass"
}
```

**200 (shape):**

```json
{
  "accessToken": "<jwt>",
  "user": { "id": "…", "email": "…", "role": "CUSTOMER", "fullName": "…", "phone": null, "isActive": true }
}
```

### `GET /auth/me`

| | |
|---|--|
| **Purpose** | Return the current user from the JWT. |
| **Auth** | Bearer, **any role** |

**200 (shape):** `SafeUser` (no password fields).

**401** if the token is missing/invalid.

### `GET /auth/admin-check`

| | |
|---|--|
| **Purpose** | Smoke test for `RolesGuard` (platform only). |
| **Auth** | Bearer |
| **Roles** | `PLATFORM_ADMIN` |

**200 (example):** `{ "ok": true, "user": { … } }`  
**403** for non–platform users.

---

## 3. Users (platform)

All routes: **Bearer** + **PLATFORM_ADMIN** only.

### `GET /users`

| | |
|---|--|
| **Query** | Optional: `role`, `isActive` (see `ListUsersQueryDto`) |
| **200** | `SafeUser[]` |

### `GET /users/:id`

| | |
|---|--|
| **Params** | `id` — UUID |
| **200** | `SafeUser` |
| **404** | Not found |

### `PATCH /users/:id`

| | |
|---|--|
| **Body** | Partial: `fullName`, `phone`, `role`, `isActive` (see `UpdateUserDto`) |
| **200** | Updated `SafeUser` |

---

## 4. Me

Paths are grouped by concern. **Reservation** routes (below) are **Bearer** + **`CUSTOMER`** only. **In-app notifications** under `/me/notifications` are **Bearer** + **`CUSTOMER`**, **`RESTAURANT_ADMIN`**, or **`PLATFORM_ADMIN`** — each user only sees their own `Notification` rows in the database.

### 4.0 In-app notifications (stored in DB, no push)

| Method | Path | Roles | Notes |
|--------|------|--------|--------|
| `GET` | `/me/notifications` | `CUSTOMER`, `RESTAURANT_ADMIN`, `PLATFORM_ADMIN` | Optional query: `unreadOnly` (boolean as string `true`/`false`), `limit` (1–100, default 50) |
| `PATCH` | `/me/notifications/read-all` | same | Marks all notifications for the caller with `readAt: null` |
| `PATCH` | `/me/notifications/:notificationId/read` | same | Sets `readAt`; **404** if wrong user |

**200 (GET) example:**

```json
{
  "notifications": [
    {
      "id": "…",
      "type": "TABLE_RESERVATION_CONFIRMED",
      "title": "Table reservation confirmed",
      "message": "Your reservation at Ristorante has been confirmed.",
      "entityType": "TABLE_RESERVATION",
      "entityId": "…",
      "restaurantId": "…",
      "eventId": null,
      "reservationId": "…",
      "eventReservationId": null,
      "readAt": null,
      "createdAt": "2026-01-01T12:00:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

`type` is one of: `TABLE_RESERVATION_CONFIRMED`, `TABLE_RESERVATION_REJECTED`, `TABLE_RESERVATION_CANCELLED`, `EVENT_RESERVATION_CONFIRMED`, `EVENT_RESERVATION_REJECTED`, `EVENT_RESERVATION_CANCELLED`. `entityType` is one of: `TABLE_RESERVATION`, `EVENT_RESERVATION`, `RESTAURANT`, `EVENT`.

**When rows are created (no push/email):**

- **Table:** Restaurant/platform moves a request to **CONFIRMED** or **REJECTED** → the **customer** gets one notification. **Customer** cancels a table request (eligible states) → each user assigned to that **restaurant** in `restaurant_admins` gets a notification. Idempotent: duplicate logical sends use a unique `dedupeKey` so retries do not create duplicates.
- **Event:** Same pattern for event reservation **confirm/reject** (customer) and **customer cancel** (assigned restaurant admins). Event **capacity** rules and transition validation are unchanged; notifications are written only after a successful state change in the same transaction as the update where applicable.

## 4.1 Reservations (customer)

All routes in this section: **Bearer** + **CUSTOMER** only (via `@Roles`).

**Reservation JSON shape (both flows):** responses are **normalized** so UIs can tell **table** vs **event** at a glance:

- **Table** items and detail always include `type: "TABLE"`, a **restaurant** summary (`id`, `name`, `city`, `area`), `requestedAt` (ISO — when the request row was created, same as row `createdAt` serialized), `note` (mirrors `specialRequest` when set), and `statusHistory`: an array ordered **oldest → newest** (one entry per transition). Each history line has `id`, `fromStatus`, `toStatus`, `note`, `createdAt` (ISO), and `changedBy: { id, fullName, email } | null` when the server stored an actor. **Rejection** / **cancellation** “reasons” for tables are only present when derivable from history **notes** on transitions to `REJECTED` or `CANCELLED` (fields `rejectionReason`, `cancellationReason` on the object—otherwise `null`).

- **Event** items and detail always include `type: "EVENT"`, **restaurant** and **event** summaries (event includes `isFree`, `price`, `currency` as stored), `note` (mirrors `specialRequest`), `rejectionReason` when set on the row, `cancellationReason` when the last `CANCELLED` transition’s note is available, and `statusHistory` in the same **oldest → newest** order with the same per-line fields as table history.

### `GET /me/reservations`

**200:** `CustomerTableReservationResponse[]` (see table shape above).

### `GET /me/reservations/:reservationId`

**Params:** `reservationId` — UUID.  
**200:** Single table reservation, same object shape as a list item. **404** if the reservation is missing or not owned by the caller.

### `PATCH /me/reservations/:reservationId/cancel`

**Body (optional):** `{ "note": "string" }` (see `CancelMyReservationDto`)

**200:** Updated reservation (same shape as `GET` item). **400** for disallowed state/time.

### `GET /me/event-reservations`

**200:** `CustomerEventReservationResponse[]` (see event shape above).

### `GET /me/event-reservations/:eventReservationId`

**Params:** `eventReservationId` — UUID.  
**200:** Single event reservation, same object shape as a list item. **404** if not found or not owned by the caller.

### `PATCH /me/event-reservations/:eventReservationId/cancel`

**Params:** `eventReservationId` — UUID  
**Body (optional):** `{ "note": "string" }`

**200:** Updated event reservation. **400** for disallowed state (e.g. after event end).

---

## 5. Restaurants (core + nested resources)

**Controller-level security:** all routes in this group use **Bearer** + `JwtAuthGuard` + `RolesGuard`. If a method has no `@Roles()` decorator, **any authenticated** role is allowed. Otherwise the listed roles apply.

> **Param names in paths:** the implementation uses `:id` for core restaurant CRUD and `admin` routes, and `:restaurantId` (or the same segment) for nested resources. In practice all are UUIDs for a restaurant. Nest registers **specific** paths (e.g. `…/availability`, `…/events/...`) before the generic `GET|PATCH /restaurants/:id`.

### 5.1 Core

| Method | Path | Roles | Notes |
|--------|------|-------|--------|
| `POST` | `/restaurants` | `PLATFORM_ADMIN` | `CreateRestaurantDto` |
| `GET` | `/restaurants` | *any* | Inactive sites hidden for some roles; see service |
| `GET` | `/restaurants/:id` | *any* | 404 for inactive to customers |
| `PATCH` | `/restaurants/:id` | `PLATFORM_ADMIN` | `UpdateRestaurantDto` |

**Responses:** Prisma `Restaurant` JSON (numeric decimals may be serialized as strings).

### 5.2 Availability (table booking helper)

`GET /restaurants/:restaurantId/availability`  
**Query:** `date` (e.g. `YYYY-MM-DD`), `partySize`, `durationMinutes` — `AvailabilityQueryDto`  
**Roles:** *any authenticated*

Returns slots and tables (shape per `getAvailability`).

### 5.3 Operating settings & opening hours & profile

| Method | Path | Roles |
|--------|------|-------|
| `GET` | `…/operating-settings` | *any* |
| `PATCH` | `…/operating-settings` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` (assigned) |
| `GET` | `…/opening-hours` | *any* |
| `PATCH` | `…/opening-hours` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` (assigned) |
| `GET` | `…/profile` | *any* |
| `PATCH` | `…/profile` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` (assigned) |

**Bodies:** `UpdateOperatingSettingsDto`, `UpdateOpeningHoursDto`, `UpdateRestaurantProfileDto` respectively.

### 5.4 Contacts

| Method | Path | Roles (non-GET) |
|--------|------|------------------|
| `GET` | `…/contacts` | *any* for read |
| `POST` | `…/contacts` | platform or assigned R-A |
| `PATCH` | `…/contacts/:contactId` | platform or assigned R-A |
| `DELETE` | `…/contacts/:contactId` | platform or assigned R-A → **204** |

### 5.5 Event nights (restaurant events)

| Method | Path | Roles | Notes |
|--------|------|-------|--------|
| `GET` | `…/events` | *any* | Query `ListRestaurantEventsQueryDto`; customers see only approved, active, upcoming in practice |
| `POST` | `…/events` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` | `CreateRestaurantEventDto` |
| `GET` | `…/events/:eventId` | *any* | |
| `PATCH` | `…/events/:eventId/review` | `PLATFORM_ADMIN` only | Approve / reject *pending* events — `ReviewRestaurantEventDto` |
| `PATCH` | `…/events/:eventId` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` | `UpdateRestaurantEventDto` |
| `DELETE` | `…/events/:eventId` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` | **204** — soft deactivate |

**Important:** Event **booking** for a night is *not* the same resource as a **table** reservation; use the **event reservation** routes below for customer requests tied to an `eventId`.

### 5.6 Event reservations (event night slots)

| Method | Path | Roles | Notes |
|--------|------|-------|--------|
| `POST` | `…/events/:eventId/reservations` | **CUSTOMER** | `CreateEventReservationDto` — new row **PENDING** |
| `GET` | `…/event-reservations` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` | Optional query `eventId` — each item: `type: "EVENT"`, `statusHistory` oldest→newest, full `event` + `restaurant` |
| `GET` | `…/event-reservations/:eventReservationId` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` | **404** if not in restaurant or not assignable; same `AdminEventReservationResponse` as list item |
| `PATCH` | `…/event-reservations/:eventReservationId/status` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` | `CONFIRMED` or `REJECTED` — capacity enforced on confirm |

**Event reservation body (create):**

```json
{ "partySize": 2, "specialRequest": "optional" }
```

**Event reservation status (patch):**

```json
{ "status": "CONFIRMED" | "REJECTED", "rejectionReason": "optional on reject", "note": "optional audit" }
```

### 5.7 Admin assignments

| Method | Path | Roles | Notes |
|--------|------|-------|--------|
| `POST` | `/restaurants/:id/admins` | `PLATFORM_ADMIN` | Body `{ "userId": "<uuid>" }` — `AssignAdminDto` |
| `GET` | `/restaurants/:id/admins` | `PLATFORM_ADMIN` | Lists assignments + `user` |
| `DELETE` | `/restaurants/:id/admins/:userId` | `PLATFORM_ADMIN` | **204** |

The assigned user is expected to have role `RESTAURANT_ADMIN` (enforced in service when relevant).

### 5.8 Tables

| Method | Path | Roles (writes) | Notes |
|--------|------|----------------|--------|
| `POST` | `…/tables` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` (assigned) | `CreateRestaurantTableDto` |
| `GET` | `…/tables` | *any* | Customer: **active** tables only |
| `GET` | `…/tables/:tableId` | *any* | Inactive: customer **404** |
| `PATCH` | `…/tables/:tableId` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` (assigned) | `UpdateRestaurantTableDto` |

### 5.9 Table reservations (not event reservations)

| Method | Path | Roles | Notes |
|--------|------|-------|--------|
| `POST` | `…/reservations` | **CUSTOMER** | `CreateReservationDto` — **PENDING** table request (optional `tableId`); **200** body includes `type: "TABLE"` and embedded `statusHistory` |
| `GET` | `…/reservations` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` (assigned) | All requests — each: `type: "TABLE"`, `customer`, `restaurant`, `statusHistory` oldest→newest |
| `GET` | `…/reservations/:reservationId` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` (assigned) | Single table reservation for that restaurant; **404** if not found for restaurant |
| `GET` | `…/reservations/:reservationId/history` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` (assigned) | Status change entries only (same information is also embedded in list/detail reservation objects) |
| `PATCH` | `…/reservations/:reservationId/status` | `PLATFORM_ADMIN`, `RESTAURANT_ADMIN` (assigned) | `UpdateReservationStatusDto` (lifecycle rules in service) |

**Create (example, shape):** includes `partySize`, `startAt`, `endAt`, guest and seating fields, optional `tableId` — see `CreateReservationDto` in the repo.

**Important business rule:** Do not infer **event** bookings from `restaurantId` alone. Use the **event reservation** routes when `eventId` applies; table and event reserve flows are intentionally separate.

---

## 6. Maintenance and definition of done

- Any **addition, change, or removal** of HTTP routes must update this file and [api-inventory.md](api-inventory.md) in the same commit.  
- Cursor and human contributors: prompts that **change the API** should include these documentation updates.  
- OpenAPI/Swagger at `/docs` and `/docs-json` is a **supplement**; the markdown is the long-form source of truth for prose and product rules.
