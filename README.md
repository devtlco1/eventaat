# eventaat

Restaurant table reservation platform.

## Structure

```
eventaat/
├── apps/
│   ├── mobile/    # React Native + Expo customer app  (not scaffolded)
│   ├── admin/     # Next.js dashboard                  (not scaffolded)
│   └── api/       # NestJS + Prisma + Postgres + Auth + RBAC  (Step 5)
├── packages/
│   └── shared/    # Shared TypeScript types/constants  (built to dist/)
├── package.json   # npm workspaces root
└── tsconfig.base.json
```

## Roles

- `customer` — uses the mobile app
- `restaurant_admin` — manages reservations for their restaurant
- `platform_admin` — manages restaurants on the platform

## Tech

- TypeScript everywhere
- Backend: NestJS, Prisma, PostgreSQL, JWT auth (bcrypt), `@Roles()` RBAC
- Frontend (planned): Next.js (admin), React Native + Expo (mobile)
- Monorepo: npm workspaces
- Node.js 20+

## Quick start

```bash
npm install
cp apps/api/.env.example apps/api/.env   # set JWT_SECRET

docker run --name eventaat-pg \
  -e POSTGRES_USER=eventaat -e POSTGRES_PASSWORD=eventaat \
  -e POSTGRES_DB=eventaat -p 5432:5432 -d postgres:16

npm run prisma:migrate -w @eventaat/api -- --name init_user
npm run dev -w @eventaat/api

# Smoke tests
curl http://localhost:4000/health
curl -X POST http://localhost:4000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"supersecret","fullName":"A B"}'
```

Per-app docs: [`apps/api/README.md`](apps/api/README.md).

## Status

- Step 1 — monorepo skeleton
- Step 2 — API foundation (`/health`)
- Step 3 — Prisma + `User` model + DB-aware health
- Step 4 — auth foundation (`/auth/register`, `/auth/login`)
- Step 5 — auth protection + RBAC (`/auth/me`, `@CurrentUser`, `@Roles`, `RolesGuard`)
- Step 6 (next) — restaurants
