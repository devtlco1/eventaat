# eventaat

Restaurant table reservation platform.

**Local development:** **[docs/local-development.md](docs/local-development.md)** (Node 22, Docker Postgres, API, admin with webpack, Expo). **Product vision & roadmap:** **[docs/eventaat-product-blueprint.md](docs/eventaat-product-blueprint.md)**.

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

## Project status

Milestones in place: monorepo foundation; **API** (Nest, health) + **Prisma/PostgreSQL**; **auth** (JWT, register/login) and **RBAC**; **users** (platform management); **restaurants** (CRUD, assignments for restaurant admins); **request-based reservations** (optional table) with **availability** helper; **reservation status history** and lifecycle rules; **event nights (restaurant events)** with **platform approval** (PENDING → APPROVED/REJECTED) and **customer-only visibility** of approved, active, upcoming events; **admin** (Next.js, webpack) and **mobile** (Expo) apps; **My Reservations**; **operating settings**; **customer cancellation** (eligible requests); **restaurant profile** metadata and contacts; **global request validation** (DTO / `ValidationPipe`); documented local workflow; **CI** (see above). **API usage & validation** detail: [apps/api/README.md#request-validation](apps/api/README.md#request-validation).

## Current MVP capabilities

- **Customer** can sign in, browse restaurants, and submit a **reservation request** (not fixed table selection)
- **Customer** can see **My Reservations** with **status and history**
- **Customer** can **cancel** eligible requests (e.g. pending/held/confirmed, before start time) where rules allow
- **Platform / restaurant admin** can manage **restaurants**, **assign restaurant admins**, and update **reservation status**
- **Admin** can manage **operating settings** and **restaurant profile** (URLs, descriptions, **contacts**)
- **Restaurant / platform admins** can create and manage **event nights**; **platform admins** **approve** or **reject** pending events; **customers** only see **approved, active, upcoming** events (admin UI: **Events** under each restaurant)
- **CI** on `main` validates **API, admin, and mobile** (generate, typecheck, build) — [workflow](.github/workflows/ci.yml)

## Current recommended next work

- Event **booking** flow (separate from table-request reservations) — *event nights are modeled and approved, but not bookable as events yet*
- Offers (later)
- Discovery / favorites (later)
- Notifications (later)
- Payments / deposits (later)

*(Roadmap context: [eventaat-product-blueprint.md](docs/eventaat-product-blueprint.md).)*
