# Local development (eventaat)

This guide is the **canonical** setup for a reliable local developer workflow. It covers the API, admin dashboard, and mobile (Expo). Product behavior is documented in [`eventaat-product-blueprint.md`](eventaat-product-blueprint.md).

---

## A. Prerequisites

- **Node 22** via [fnm](https://github.com/Schniz/fnm) (Fast Node Manager), aligned with the repo’s `.nvmrc` / `.node-version`
- **Docker Desktop** (or compatible engine) for PostgreSQL
- **PostgreSQL in Docker** — this repo standardizes on container name **`eventaat-pg`**
- **Expo Go** on your iPhone for on-device API testing of the mobile app
- A terminal in the **repository root** for `npm` scripts (unless a command explicitly `cd`’s)

---

## B. First-time setup

1. **Node 22**

   ```bash
   fnm install 22
   fnm use 22
   node -v   # should show v22.x
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **API environment**

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

   Edit `apps/api/.env`:

   - Set a strong **`JWT_SECRET`** (e.g. `openssl rand -hex 32`).
   - Keep **`PORT=4000`** (default).
   - Ensure **`DATABASE_URL`** points at your local Postgres (the `eventaat-pg` container matches `.env.example` if you use the same user/password/DB name).

4. **Mobile: LAN IP and API URL**

   The phone must reach your Mac, not `localhost`. Create or edit `apps/mobile/.env` and set the API base your Expo app will call, using **your Mac’s LAN IP** (e.g. Wi‑Fi settings → IP address), not `127.0.0.1`:

   ```env
   EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
   ```

   (Replace `192.168.x.x` with your real IP.)

---

## C. Start the database

If the container already exists:

```bash
docker start eventaat-pg
```

If you need to create it (once):

```bash
docker run --name eventaat-pg \
  -e POSTGRES_USER=eventaat \
  -e POSTGRES_PASSWORD=eventaat \
  -e POSTGRES_DB=eventaat \
  -p 5432:5432 -d postgres:16
```

Apply migrations when the API is set up (from repo root):

```bash
npm run prisma:migrate -w @eventaat/api
```

(Use the API package’s `prisma:migrate` as needed; for a clean DB, follow [`apps/api/README.md`](../apps/api/README.md) for migrate vs deploy.)

---

## D. Start the API reliably

The API is most predictable when you **generate Prisma Client**, **build** once, then run **`api:start`**. `api:dev` (watch mode) is available but can be heavier; if watch misbehaves, use **build + start** again.

```bash
npm run api:generate
npm run api:build
npm run api:start
```

Health check:

```bash
curl http://localhost:4000/health
```

**API reference (browsing):** with the API up, you can open [http://localhost:4000/docs](http://localhost:4000/docs) (Swagger UI) and [http://localhost:4000/docs-json](http://localhost:4000/docs-json) (OpenAPI JSON). The canonical handoff for developers remains the repo **[api-reference.md](api-reference.md)** and **[api-inventory.md](api-inventory.md)** — see the root [README.md](../README.md#api-documentation).

**Optional (watch / hot reload):**

```bash
npm run api:dev
```

If the dev process is slow or noisy, prefer **`api:build` + `api:start`**.

**Validation:** the API uses a global `ValidationPipe` (whitelist + reject unknown body fields, class-transformer for DTOs). If the admin or mobile app sends a **400** on a route that used to work, check for typos, extra properties in JSON bodies, and query string types (e.g. `partySize` must be numeric for availability). See [`apps/api/README.md`](../apps/api/README.md#request-validation).

---

## E. Start the admin dashboard (Next.js, **webpack**)

The admin app **must** use **webpack** (not Turbopack) in `package.json` scripts. Root scripts use the app’s `dev` / `build` definitions.

In the same shell (or a new one), so `NODE_ENV` is not set to `production` by mistake:

```bash
unset NODE_ENV
npm run admin:dev
```

Open: **http://localhost:3000/login**

Use **localhost** in the browser, not the LAN IP, for the admin app during dev (Next dev is bound to your Mac).

The post-login layout (**Step 41** / **41B**) uses a **fixed** left sidebar on `md+` (the **main** area scrolls), **webpack**-only, **collapse/expand** with localStorage, **wordmark** on top, **icon + label** (expanded) or **icon-only** (collapsed), and at the **bottom** **Account** (`/dashboard/account`), a compact **light/dark** **theme** control, and **Logout** (icon when collapsed). **Header** shows the **current** **page** **title** and the **notification** **bell**. **Visible** nav: **Dashboard**, **Restaurants**, **Event nights**, **Restaurant bookings**, **Notifications**, and **Users** (platform admin only). Legacy paths such as **Operations**, **Pending work**, and **reservations/…** **redirect** (they are not in the menu). A **notification bell** in the header has an unread badge and a short dropdown, with light polling. **List tables** use **client-side** pagination (default **20** rows, **20/50/100**). **POST** **`/restaurants/:id/reservations/admin`** allows staff to create a table booking for a **customer** id. Before `npm run admin:build`, run **`unset NODE_ENV`**. For **admin** **dark** **mode** QA, use the **sidebar** **theme** control and check **tables** and **forms**. **No AppIcons** changes in this work.

---

## F. Start the mobile app (Expo)

1. Set **`EXPO_PUBLIC_API_URL`** in `apps/mobile/.env` to `http://YOUR_MAC_IP:4000` (see [B. First-time setup](#b-first-time-setup)).
2. From the repo root:

   ```bash
   npm run mobile:dev
   ```

3. In the terminal UI, start **Expo Go** on the iPhone and **scan the QR code**.

---

## G. Common troubleshooting

| Symptom | What to check |
|--------|----------------|
| **Docker not running** | Open Docker Desktop; `docker ps` should work. |
| **Database unavailable** | `docker start eventaat-pg`, `DATABASE_URL` in `apps/api/.env`, and port 5432 not used by another Postgres. |
| **Mobile: “Network request failed”** | Phone and Mac on the same network; `EXPO_PUBLIC_API_URL` uses the **Mac’s LAN IP**, not `localhost`; API running on port 4000; Mac firewall not blocking. |
| **Prisma / client out of date** | Run `npm run api:generate` after schema changes; then `npm run api:build`. |
| **Admin “hangs” on start or build** | Ensure scripts use **`--webpack`**, not default Turbopack. Do not run `next dev` without `next dev -p 3000 --webpack`. |
| **Duplicate React / invalid hook call** | Single React 19.1.0 for admin via root `overrides`; from repo root run `npm install`; avoid a second `react` copy under `apps/admin` only. |
| **Corrupt `node_modules` or odd errors** | Remove `node_modules` and lock if needed, then `npm install` from **repo root**. |
| **`api:start` fails: `Cannot find module '.../parsePhoneNumberWithError_.js'`** (from `class-validator` / `libphonenumber-js`) | A broken install can omit files (duplicate filenames with extra spaces in `node_modules` also suggest this). From **repo root**: `npm ci`, or reinstall the `libphonenumber-js` package, then `npm run api:build` and `npm run api:start` again. |
| **`EADDRINUSE` on port 3000** (admin `npm run admin:dev`) | Another app is using the port. Stop the other process or run admin on a different port only if you know how to set `PORT` for Next. |
| **Wrong working directory** | Monorepo commands must be run from **`eventaat/`** root, or with explicit `-w @eventaat/...` as in this doc. |

---

## H. Current stable run order

1. Start **Docker Desktop**
2. `docker start eventaat-pg`
3. `npm run api:generate`
4. `npm run api:build`
5. `npm run api:start` (or `api:dev` if you prefer watch)
6. In another shell: `unset NODE_ENV` then `npm run admin:dev`
7. In another shell: `npm run mobile:dev` (with `EXPO_PUBLIC_API_URL` set)

**Quality checks (optional):**

```bash
npm run check:api
npm run check:admin
npm run check:mobile
```

The same **generate + typecheck + API build + admin typecheck + admin build + mobile typecheck** flow runs in **GitHub Actions** on pushes and PRs to `main` (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). Use the commands above to fix failures locally before they hit CI.

### Admin dashboard browser QA (Step 40E)

After **API** (4000) and **admin** (3000) are up, do a **manual** pass: **`/login`** (valid `PLATFORM_ADMIN` and `RESTAURANT_ADMIN` if you have test accounts, bad password → error, `CUSTOMER` or no token must not see **`/dashboard`** as an authenticated app). Open each **sidebar** route, **`/dashboard/account`**, theme toggle, **logout**; on **bookings** pages, try **filters**, **open from notifications** (query `reservationId` / `eventReservationId`), and **mark read / mark all** on **Notifications**. CI and typecheck do **not** replace this. **No AppIcons** changes; **no new** API for this step unless a bug must be fixed.

---

## Quick reference (root scripts)

| Script | Purpose |
|--------|---------|
| `api:generate` | `prisma generate` for the API |
| `api:build` | Build Nest API to `dist/` |
| `api:start` | Run `node dist/main.js` (port 4000) |
| `api:dev` | Nest watch (may be heavier) |
| `admin:dev` | Next.js dev, **webpack**, port 3000 |
| `admin:build` | Next.js production build, **webpack** |
| `mobile:dev` | `expo start` |
| `mobile:typecheck` | Typecheck mobile package |
| `check:api` / `check:admin` / `check:mobile` | Typecheck each app |

**Ports:** API **4000**, admin **3000**.

Deeper API details: [`apps/api/README.md`](../apps/api/README.md).
