# @eventaat/api

NestJS + Prisma backend for eventaat. PostgreSQL is the database.

**Step 4 deliverable:** authentication foundation — `UsersModule`, `AuthModule`,
bcrypt password hashing, JWT issuance, and `POST /auth/register` + `POST /auth/login`.
No business endpoints yet (no restaurants, no reservations, no admin).

## Folder layout

```
apps/api/
├── prisma/
│   ├── schema.prisma         # Role enum + User model
│   └── migrations/
├── src/
│   ├── main.ts               # bootstrap + global ValidationPipe
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts        # POST /auth/register, POST /auth/login
│   │   ├── auth.service.ts           # bcrypt hash/compare + JWT sign
│   │   ├── jwt.strategy.ts           # ready for @UseGuards(JwtAuthGuard)
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt-payload.interface.ts
│   │   └── dto/
│   │       ├── register.dto.ts       # class-validator
│   │       └── login.dto.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   └── users.service.ts          # findByEmail / findById / create / toPublic
│   ├── prisma/
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   └── health/
│       ├── health.controller.ts
│       └── health.module.ts
├── .env.example
└── ...
```

## Local setup

Run from the **monorepo root** (`/Users/amjadmohammed/Documents/Claude/Projects/eventaat`):

```bash
# 1. Install (picks up bcrypt, @nestjs/jwt, passport-jwt, class-validator, etc.)
npm install

# 2. .env (PORT=4000, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN)
cp apps/api/.env.example apps/api/.env
# Then edit apps/api/.env and replace JWT_SECRET — generate one with:
#   openssl rand -hex 32

# 3. Make sure Postgres is running and the migration has been applied
docker start eventaat-pg                                         # or run the docker run from Step 3
npm run prisma:migrate -w @eventaat/api -- --name init_user      # only if not already applied

# 4. Start the API
npm run dev -w @eventaat/api
```

## Test register

```bash
curl -i -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "amjad@example.com",
    "password": "supersecret123",
    "fullName": "Amjad Mohammed",
    "phone": "+97150000000"
  }'
```

Success → `201 Created`:

```json
{
  "user": {
    "id": "0a4d...",
    "email": "amjad@example.com",
    "fullName": "Amjad Mohammed",
    "phone": "+97150000000",
    "role": "CUSTOMER",
    "isActive": true,
    "createdAt": "2026-04-25T...",
    "updatedAt": "2026-04-25T..."
  }
}
```

Note: `passwordHash` is **not** in the response.

Repeat the same call → `409 Conflict`:

```json
{ "statusCode": 409, "message": "Email is already registered", "error": "Conflict" }
```

Bad input (e.g. `password: "abc"`) → `400 Bad Request` with details from class-validator.

## Test login

```bash
curl -i -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "amjad@example.com",
    "password": "supersecret123"
  }'
```

Success → `200 OK`:

```json
{
  "user": { "id": "...", "email": "amjad@example.com", "role": "CUSTOMER", ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Wrong password or unknown email → `401 Unauthorized`:

```json
{ "statusCode": 401, "message": "Invalid credentials", "error": "Unauthorized" }
```

You can decode the token at https://jwt.io to confirm it carries `sub`, `email`,
`role`, `iat`, and `exp`. Use it later as `Authorization: Bearer <token>`.

## Health endpoint (unchanged behaviour)

```bash
curl http://localhost:4000/health
```

Still reports `database: "ok" | "unavailable"` and degrades gracefully when
Postgres is down.

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
