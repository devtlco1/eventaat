# eventaat

Restaurant table reservation platform.

## Structure

```
eventaat/
├── apps/
│   ├── mobile/    # React Native + Expo customer app  (not scaffolded)
│   ├── admin/     # Next.js dashboard                  (not scaffolded)
│   └── api/       # NestJS + Prisma + Postgres         (Step 3)
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
- Backend: NestJS, Prisma, PostgreSQL
- Frontend (planned): Next.js (admin), React Native + Expo (mobile)
- Monorepo: npm workspaces
- Node.js 20+

## Quick start

From the repo root:

```bash
# 1. Install everything
npm install

# 2. API env
cp apps/api/.env.example apps/api/.env

# 3. Start Postgres locally
docker run --name eventaat-pg \
  -e POSTGRES_USER=eventaat \
  -e POSTGRES_PASSWORD=eventaat \
  -e POSTGRES_DB=eventaat \
  -p 5432:5432 -d postgres:16

# 4. Create + apply the first migration (User model)
npm run prisma:migrate -w @eventaat/api -- --name init_user

# 5. Run the API on port 4000
npm run dev -w @eventaat/api

# 6. Health check
curl http://localhost:4000/health
```

Per-app docs: [`apps/api/README.md`](apps/api/README.md).

## Status

- Step 1 — monorepo skeleton
- Step 2 — API foundation (NestJS + `/health`)
- Step 3 — first Prisma model (`User` + `Role`), `/health` reports DB status
- Step 4 (next) — auth (registration + login)
