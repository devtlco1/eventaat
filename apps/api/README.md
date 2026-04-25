# @eventaat/api

NestJS + Prisma backend for eventaat. PostgreSQL is the database.

**Step 5 deliverable:** auth protection + RBAC foundation.
- `GET /auth/me` (Bearer-token protected) returns the current user.
- `@CurrentUser()` parameter decorator pulls the user off the request.
- `@Roles(...)` + `RolesGuard` lock routes down to specific roles.
- `GET /auth/admin-check` is a tiny verification endpoint for RolesGuard
  (restricted to `PLATFORM_ADMIN`); no business endpoints yet.

## Folder layout

```
apps/api/src/auth/
├── auth.module.ts
├── auth.controller.ts          # /register, /login, /me, /admin-check
├── auth.service.ts
├── jwt.strategy.ts
├── jwt-auth.guard.ts
├── jwt-payload.interface.ts
├── current-user.decorator.ts   # @CurrentUser()
├── roles.decorator.ts          # @Roles('PLATFORM_ADMIN', ...)
├── roles.guard.ts              # checks request.user.role against @Roles()
└── dto/
    ├── register.dto.ts
    └── login.dto.ts
```

## Endpoints (Step 5 surface)

| Method | Path                | Auth                                 |
|--------|---------------------|--------------------------------------|
| POST   | `/auth/register`    | public                               |
| POST   | `/auth/login`       | public                               |
| GET    | `/auth/me`          | Bearer token (any authenticated user)|
| GET    | `/auth/admin-check` | Bearer token + role `PLATFORM_ADMIN` |
| GET    | `/health`           | public                               |

## Local setup

From the **monorepo root** (`/Users/amjadmohammed/Documents/Claude/Projects/eventaat`):

```bash
npm install
cp apps/api/.env.example apps/api/.env   # set JWT_SECRET (e.g. `openssl rand -hex 32`)
docker start eventaat-pg                  # or docker run from Step 3
npm run prisma:migrate -w @eventaat/api -- --name init_user   # only if not yet applied
npm run dev -w @eventaat/api
```

## Test the protected endpoints

### 1. Register a user (or skip if you already have one)

```bash
curl -s -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"amjad@example.com","password":"supersecret123","fullName":"Amjad Mohammed"}'
```

### 2. Log in and store the token

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"amjad@example.com","password":"supersecret123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

echo "$TOKEN"
```

### 3. Call `GET /auth/me` with the Bearer token

```bash
curl -i http://localhost:4000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Expected `200 OK`:

```json
{
  "id": "...",
  "email": "amjad@example.com",
  "fullName": "Amjad Mohammed",
  "phone": null,
  "role": "CUSTOMER",
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 4. Confirm `401 Unauthorized` without a token

```bash
curl -i http://localhost:4000/auth/me
```

Expected:

```
HTTP/1.1 401 Unauthorized
{"statusCode":401,"message":"Unauthorized"}
```

Same response for a malformed or expired token.

### 5. Confirm RBAC works — `403 Forbidden` when role is wrong

A freshly registered user has `role = CUSTOMER`. Calling the
`PLATFORM_ADMIN`-only endpoint should be rejected:

```bash
curl -i http://localhost:4000/auth/admin-check \
  -H "Authorization: Bearer $TOKEN"
```

Expected:

```
HTTP/1.1 403 Forbidden
{"statusCode":403,"message":"Insufficient role","error":"Forbidden"}
```

To see the success path, promote your user in the database, log in again to
mint a fresh token, and re-call `/auth/admin-check`:

```bash
docker exec -it eventaat-pg psql -U eventaat -d eventaat \
  -c "UPDATE users SET role='PLATFORM_ADMIN' WHERE email='amjad@example.com';"

# log in again to get a NEW token that carries the updated role
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"amjad@example.com","password":"supersecret123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

curl -i http://localhost:4000/auth/admin-check \
  -H "Authorization: Bearer $TOKEN"
# → 200 OK  {"ok":true,"user":{...,"role":"PLATFORM_ADMIN"}}
```

> The role is encoded in the JWT at login time. After changing a user's role
> in the DB, they must log in again for the new token to reflect it.

## Scripts

| Script              | What it does                                                    |
|---------------------|-----------------------------------------------------------------|
| `dev`               | Build `@eventaat/shared`, then run NestJS in watch mode         |
| `build`             | Build `@eventaat/shared`, then `nest build` to `dist/`          |
| `start`             | Run the compiled server (`node dist/main.js`)                   |
| `typecheck`         | `tsc --noEmit`                                                  |
| `prisma:generate`   | Regenerate the Prisma client                                    |
| `prisma:migrate`    | Run `prisma migrate dev`                                        |
| `prisma:studio`     | Open Prisma Studio                                              |
