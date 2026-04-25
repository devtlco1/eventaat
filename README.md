# eventaat

Restaurant table reservation platform.

## Structure

```
eventaat/
├── apps/
│   ├── mobile/    # React Native + Expo customer app  (not scaffolded)
│   ├── admin/     # Next.js dashboard                  (not scaffolded)
│   └── api/       # NestJS + Prisma + Postgres + Auth + Restaurants  (Step 6)
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
- Backend: NestJS, Prisma, PostgreSQL, JWT (bcrypt), `@Roles()` RBAC
- Frontend (planned): Next.js (admin), React Native + Expo (mobile)
- Monorepo: npm workspaces
- Node.js 22 (see [Node 22 (local)](#node-22-local))

## Node 22 (local)

The repo is standardized on **Node.js 22** for local work and in Cursor. Install the toolchain with [fnm](https://github.com/Schniz/fnm) (Fast Node Manager):

```bash
brew install fnm
eval "$(fnm env --use-on-cd)"
fnm install 22
fnm use 22
node -v
```

`node -v` should show **v22.x**. Project version pins live in `.nvmrc` and `.node-version` (both: `22`); with `use-on-cd`, entering the repo can auto-select 22 if you have run `fnm install` once.

## Quick start

```bash
npm install
cp apps/api/.env.example apps/api/.env   # set JWT_SECRET

docker run --name eventaat-pg \
  -e POSTGRES_USER=eventaat -e POSTGRES_PASSWORD=eventaat \
  -e POSTGRES_DB=eventaat -p 5432:5432 -d postgres:16

npm run prisma:migrate -w @eventaat/api    # applies init_user + add_restaurant
npm run dev -w @eventaat/api

curl http://localhost:4000/health
```

Per-app docs and full curl walkthroughs: [`apps/api/README.md`](apps/api/README.md).

## Status

- Step 1 — monorepo skeleton
- Step 2 — API foundation (`/health`)
- Step 3 — Prisma + `User` model + DB-aware health
- Step 4 — auth foundation (`/auth/register`, `/auth/login`)
- Step 5 — auth protection + RBAC (`/auth/me`, `@CurrentUser`, `@Roles`, `RolesGuard`)
- Step 6 — restaurants foundation (`Restaurant` model + admin-only create/update)
- Step 7 (next) — reservations
