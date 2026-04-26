# @eventaat/api

NestJS + Prisma backend for eventaat. PostgreSQL is the database.

**API documentation (all endpoints, roles, examples):** see the monorepo **[`docs/api-reference.md`](../../docs/api-reference.md)** and the compact **[`docs/api-inventory.md`](../../docs/api-inventory.md)**. With the server running: **OpenAPI** at `/docs` and `/docs-json` (e.g. [http://localhost:4000/docs](http://localhost:4000/docs)). New or changed routes must update those two markdown files in the **same commit** (see the root [README.md](../../README.md#api-documentation)).

## Request validation

All DTO-typed request bodies and query objects are validated by a global `ValidationPipe` in `src/main.ts`: **`whitelist: true`**, **`forbidNonWhitelisted: true`**, **`transform: true`**, and **`transformOptions: { enableImplicitConversion: true }`**. Client mistakes typically return **400** with a `message` array (Nest’s default), before controllers run. Do not rely on unknown JSON fields being ignored—they are **rejected** for routes that use a DTO.

**Quick 400 examples**

```bash
# login: not an email
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"nope","password":"x"}'
# → 400

# reservation: unknown property (if you pass a DTO and a field not on CreateReservationDto)
# → 400 with forbidNonWhitelisted
```

**Step 6 deliverable:** restaurants foundation.
- New `Restaurant` model + migration `20260425120000_add_restaurant`.
- `RestaurantsModule` with CRUD-ish endpoints (no DELETE in MVP — use `isActive=false`).
- Create/Update locked to `PLATFORM_ADMIN`. List/Read open to any authenticated user (active only; admins see inactive too).

## Endpoints (legacy snapshot — use docs instead)

> **Source of truth:** the complete route list, roles, and tables are in **[`docs/api-reference.md`](../../docs/api-reference.md)** and **[`docs/api-inventory.md`](../../docs/api-inventory.md)**. The app exposes **59** HTTP operations across health, auth, users, me, and restaurants (including **POST** **`/users`** for platform admin user creation, `PATCH` **`/me/profile`** and **`/me/password`**, table and event flows, in-app **notifications** under `me/notifications`, **staff** read-only `GET` **`/me/reservation-operations`**, **POST** **`/restaurants/:id/reservations/admin`** (staff create for a customer), and **detail GETs** under `me/…` reservations and `restaurants/…/reservations` / `…/event-reservations`).

The sections below (event nights, event reservations) retain useful curl context; they do not list every table-reservation or profile route. Prefer the `docs/api-*.md` files when wiring clients.

### Restaurant event nights

Under each restaurant, scoped routes (all require Bearer; **customers** get **approved / active / upcoming** events only; **review** is **platform** only). Migration: `add_restaurant_events` (Prisma: `restaurant_events` table).

- `GET|POST /restaurants/:restaurantId/events` — list / create (create: **restaurant** or **platform** admin, assignment applies).
- `GET|PATCH|DELETE /restaurants/:restaurantId/events/:eventId` — get / update / soft-deactivate (DELETE sets `isActive=false`; it does not remove the row).
- `PATCH /restaurants/:restaurantId/events/:eventId/review` — `APPROVE` or `REJECT` **PENDING** only (platform only).

### Event reservations (booking for a specific event)

These are **not** the same as table reservations: each row is tied to `eventId` + `restaurantId` + `customerId`. A new request starts **PENDING**; a **restaurant** or **platform** admin can **CONFIRM** or **REJECT**. If the event has a `capacity`, confirmation checks that the sum of **CONFIRMED** `partySize` would not exceed it (pending and rejected requests do not consume capacity). Migration: `20260502120000_add_event_reservations`.

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/restaurants/:restaurantId/events/:eventId/reservations` | Bearer + `CUSTOMER` (body: `partySize`, optional `specialRequest`) |
| `GET` | `/me/event-reservations` | Bearer + `CUSTOMER` — my event reservation list |
| `PATCH` | `/me/event-reservations/:eventReservationId/cancel` | Bearer + `CUSTOMER` (optional `note`); allowed while PENDING/CONFIRMED and before the event has ended |
| `GET` | `/restaurants/:restaurantId/event-reservations?eventId=` | Bearer + `RESTAURANT_ADMIN` (assigned) or `PLATFORM_ADMIN` |
| `PATCH` | `/restaurants/:restaurantId/event-reservations/:eventReservationId/status` | Bearer + same; body: `status` = `CONFIRMED` or `REJECTED`, optional `rejectionReason`, `note` |

**No** payment and **no** event image upload in this step.

## Local setup

Use **Node.js 22** in this monorepo (root `.nvmrc` and [root README setup](../../README.md#node-22-local). Paths below assume a clone of the repository.)

From the **monorepo root**:

```bash
npm install
cp apps/api/.env.example apps/api/.env   # set JWT_SECRET if you haven't
docker start eventaat-pg                  # or docker run from earlier steps

# Apply the new restaurant migration
npm run prisma:migrate -w @eventaat/api

# Run the API on port 4000
npm run dev -w @eventaat/api
```

`prisma migrate dev` (no `--name`) detects that
`prisma/migrations/20260425120000_add_restaurant/` is unapplied and runs it,
then regenerates the Prisma client so `prisma.restaurant.*` is typed.

## Test as PLATFORM_ADMIN

You need a user with role `PLATFORM_ADMIN`. From a fresh DB:

```bash
# 1. Register a normal user (defaults to CUSTOMER)
curl -s -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@eventaat.com","password":"supersecret123","fullName":"Platform Admin"}'

# 2. Promote them in the DB
docker exec -it eventaat-pg psql -U eventaat -d eventaat \
  -c "UPDATE users SET role='PLATFORM_ADMIN' WHERE email='admin@eventaat.com';"

# 3. Log in to mint a token that carries the new role
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@eventaat.com","password":"supersecret123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")
```

### Create a restaurant

```bash
curl -i -X POST http://localhost:4000/restaurants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Al Halabi",
    "description": "Levantine grill in JLT.",
    "phone": "+97144000000",
    "address": "Cluster X, JLT",
    "city": "Dubai",
    "area": "JLT",
    "latitude": 25.069,
    "longitude": 55.140
  }'
# → 201 Created
# {
#   "id": "...",
#   "name": "Al Halabi",
#   ...
#   "latitude": "25.0690000",      <-- Decimal serializes as string
#   "longitude": "55.1400000",
#   "isActive": true,
#   "createdAt": "...",
#   "updatedAt": "..."
# }
```

> **Note on `Decimal` fields**: Prisma returns `latitude`/`longitude` as
> `Prisma.Decimal`, which serializes to a JSON **string** to preserve precision.
> Clients should parse with `Number(...)` if they need a JS number.

### Update a restaurant (e.g., deactivate it)

```bash
RESTAURANT_ID="<paste-id-from-create-response>"

curl -i -X PATCH "http://localhost:4000/restaurants/$RESTAURANT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"isActive": false}'
# → 200 OK
```

### Non-admin attempting create/update → 403

```bash
# Get a customer token
CUSTOMER_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"amjad@example.com","password":"supersecret123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

curl -i -X POST http://localhost:4000/restaurants \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"X","address":"Y","city":"Z"}'
# → 403 Forbidden  {"statusCode":403,"message":"Insufficient role",...}
```

## Test listing / viewing

```bash
# As any authenticated user — returns ACTIVE restaurants only
curl -s http://localhost:4000/restaurants \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | python3 -m json.tool

# As PLATFORM_ADMIN — returns ALL restaurants (incl. inactive)
curl -s http://localhost:4000/restaurants \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool

# Single restaurant — 200 if active or you're admin, 404 otherwise
curl -i "http://localhost:4000/restaurants/$RESTAURANT_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
# (after deactivation above) → 404 Not Found

curl -i "http://localhost:4000/restaurants/$RESTAURANT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# → 200 OK with the (inactive) record

# No token → 401
curl -i http://localhost:4000/restaurants
```

Bad UUID in the path:

```bash
curl -i http://localhost:4000/restaurants/not-a-uuid \
  -H "Authorization: Bearer $CUSTOMER_TOKEN"
# → 400 Bad Request from ParseUUIDPipe
```

## Scripts

| Script              | What it does                                                    |
|---------------------|-----------------------------------------------------------------|
| `dev`               | Build `@eventaat/shared`, then run NestJS in watch mode         |
| `build`             | Build `@eventaat/shared`, then `nest build` to `dist/`          |
| `start`             | Run the compiled server (`node dist/main.js`)                   |
| `typecheck`         | `tsc --noEmit`                                                  |
| `prisma:generate`   | Regenerate the Prisma client                                    |
| `prisma:migrate`    | Run `prisma migrate dev` (applies pending migrations)           |
| `prisma:studio`     | Open Prisma Studio                                              |
