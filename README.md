# eventaat

Restaurant table reservation platform.

## Structure

```
eventaat/
├── apps/
│   ├── mobile/    # React Native + Expo customer app  (not scaffolded)
│   ├── admin/     # Next.js dashboard                  (not scaffolded)
│   └── api/       # NestJS + Prisma + Postgres + Auth  (Step 4)
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
- Backend: NestJS, Prisma, PostgreSQL, JWT auth (bcrypt)
- Frontend (planned): Next.js (admin), React Native + Expo (mobile)
- Monorepo: npm workspaces
- Node.js 20+

## Quick start

```bash
# 1. Install everything
npm install

# 2. API env
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set a real JWT_SECRET (e.g. `openssl rand -hex 32`)

# 3. Postgres
docker run --name eventaat-pg \
  -e POSTGRES_USER=eventaat -e POSTGRES_PASSWORD=eventaat \
  -e POSTGRES_DB=eventaat -p 5432:5432 -d postgres:16

# 4. Migrate
npm run prisma:migrate -w @eventaat/api -- --name init_user

# 5. Run on port 4000
npm run dev -w @eventaat/api

# 6. Smoke tests
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
- Step 4 — auth foundation (`/auth/register`, `/auth/login`, JWT, bcrypt)
- Step 5 (next) — restaurants
