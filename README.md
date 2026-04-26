# eventaat

Restaurant table reservation platform.

**Local development:** follow **[docs/local-development.md](docs/local-development.md)** for a stable workflow (Node 22, Docker Postgres, API, admin with webpack, Expo).

## Structure

```
eventaat/
├── apps/
│   ├── mobile/    # React Native + Expo customer app
│   ├── admin/     # Next.js dashboard (webpack dev/build; see local-development.md)
│   └── api/       # NestJS + Prisma + PostgreSQL
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
- Frontend: Next.js (admin), React Native + Expo (mobile)
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

Full setup, ports, Expo LAN IP, and a stable run order: **[docs/local-development.md](docs/local-development.md)**.

Minimal API smoke test after following that doc:

```bash
curl http://localhost:4000/health
```

API details, curl examples, and **request validation** (global DTO `ValidationPipe`): [`apps/api/README.md`](apps/api/README.md#request-validation).

## CI (GitHub Actions)

On every **push** or **pull request** to `main`, [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on Node **22** with `npm ci`, then: `api:generate`, `check:api`, `api:build`, `check:admin`, `admin:build`, and `check:mobile`. No database or migrations — only compile-time checks. The **Quality checks** block in [docs/local-development.md](docs/local-development.md) lists the same commands to run locally.

## Status

- Step 1 — monorepo skeleton
- Step 2 — API foundation (`/health`)
- Step 3 — Prisma + `User` model + DB-aware health
- Step 4 — auth foundation (`/auth/register`, `/auth/login`)
- Step 5 — auth protection + RBAC (`/auth/me`, `@CurrentUser`, `@Roles`, `RolesGuard`)
- Step 6 — restaurants foundation (`Restaurant` model + admin-only create/update)
- Step 7 (next) — reservations
