# @eventaat/api

NestJS + Prisma backend for eventaat. PostgreSQL is the database.

**Step 6 deliverable:** restaurants foundation.
- New `Restaurant` model + migration `20260425120000_add_restaurant`.
- `RestaurantsModule` with CRUD-ish endpoints (no DELETE in MVP — use `isActive=false`).
- Create/Update locked to `PLATFORM_ADMIN`. List/Read open to any authenticated user (active only; admins see inactive too).

## Endpoints (Step 6 surface)

| Method | Path                | Auth                                  |
|--------|---------------------|---------------------------------------|
| POST   | `/auth/register`    | public                                |
| POST   | `/auth/login`       | public                                |
| GET    | `/auth/me`          | Bearer                                |
| GET    | `/auth/admin-check` | Bearer + `PLATFORM_ADMIN`             |
| POST   | `/restaurants`      | Bearer + `PLATFORM_ADMIN`             |
| GET    | `/restaurants`      | Bearer (admin sees inactive too)      |
| GET    | `/restaurants/:id`  | Bearer (404 on inactive for non-admin)|
| PATCH  | `/restaurants/:id`  | Bearer + `PLATFORM_ADMIN`             |
| GET    | `/health`           | public                                |

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
