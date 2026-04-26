# eventaat — Product Blueprint

**Version:** 1.0 (MVP baseline)  
**Last updated:** 2026-04-25

This document describes the product vision, principles, and roadmap for **eventaat** as a restaurant discovery and **reservation request** platform. It reflects the current rebuilt system and uses the original project only as *product* inspiration, not as a template for code or architecture.

**Local development setup (tooling, ports, Docker):** see [local-development.md](local-development.md).

**HTTP API contract (all routes, auth, and inventory for engineers):** [api-reference.md](api-reference.md), [api-inventory.md](api-inventory.md). Route changes are **not** complete until those files are updated in the same work (see the root [README.md](../README.md#api-documentation)). Optional OpenAPI: `/docs` and `/docs-json` on the running API.

The HTTP API enforces request validation globally (class-validator on DTOs): invalid payloads, unknown body properties on typed routes, and malformed query values should fail with **400** before business logic runs. Details: [`apps/api/README.md`](../apps/api/README.md#request-validation).

---

## 1. Product Vision

**eventaat** is a **restaurant discovery and reservation request** platform. Customers do not “lock a table” in a rigid e-commerce flow. Instead, they **submit booking requests** with their needs; **restaurants** review those requests in context of real operations and **accept, hold, reject, or complete** them. Customers can **track** how their request progresses.

The platform serves three audiences: **diners (customers)**, **restaurant operators**, and **platform operators**, each with clear permissions and tools.

| Dimension | Description |
|----------|-------------|
| **Primary value** | Connect hungry customers with restaurants through **structured requests** and **transparent status**, not through mandatory table pickers. |
| **Discovery** | Today: browse and open restaurants. Future: richer discovery, filters, and content (see [Discovery Module](#10-discovery-module)). |
| **Reservations** | **Request-based**: customer → restaurant review → status updates → customer visibility in-app. |
| **Scale** | Start with a solid MVP; grow into events, offers, notifications, and optional payments in controlled phases. |

---

## 2. Core Product Principle

**eventaat is not a fixed table selection system.**

- **Fixed table booking** (customer must pick Table 5) is the wrong mental model for most real restaurants and creates false precision.
- **Request-based** flow matches how many venues work: the guest asks for a time and party; the house decides *where* and *whether* to seat them.

| Concept | Product meaning |
|--------|-----------------|
| **Table** | Still modeled in the system (capacity, operations, optional assignment). **Table selection is optional** for the customer. An admin may assign or associate a table **internally** when confirming. |
| **Customer** | Submits **party, time window, preferences, and notes**; does not need to choose a table. |
| **Restaurant** | Reviews the **request**, sets **HELD** / **CONFIRMED** / **REJECTED** / etc., and runs service as usual. |

**Canonical flow:**  
`customer request` → `restaurant review` → `status update` → `customer tracking` (e.g. My Reservations).

---

## 3. User Roles

| Role | Code | Description |
|------|------|-------------|
| **Customer** | `CUSTOMER` | End user who signs in, browses restaurants, submits reservation **requests**, and views request status. |
| **Restaurant admin** | `RESTAURANT_ADMIN` | Operator assigned to one or more restaurants. Manages **that** restaurant’s reservations and (in future) profile and events, within permissions. |
| **Platform admin** | `PLATFORM_ADMIN` | eventaat staff: full user and restaurant management, admin assignments, and (later) catalog/city/category governance. |

### What each role can do (MVP+)

| Capability | Customer | Restaurant admin | Platform admin |
|------------|----------|------------------|----------------|
| Sign in / session | Yes | Yes | Yes |
| List restaurants (active) | Yes | Yes | Yes (incl. inactive as needed) |
| Submit reservation **request** | Yes | — | — |
| View own reservation requests / status | Yes (e.g. My Reservations) | — | — |
| List / manage **this** restaurant’s reservations | — | If **assigned** to that restaurant | Yes (any) |
| Update reservation status (hold, confirm, reject, cancel, complete) | — | If assigned | Yes |
| Create/edit restaurants, assign `RESTAURANT_ADMIN` | — | — | Yes |
| User directory / role management | — | — | Yes |

---

## 4. Current MVP Modules

The following **exist in the current rebuilt system** and form the base for all future work.

| Module | Notes |
|--------|--------|
| **Auth** | JWT-based login; protected routes. |
| **Users / RBAC** | Roles: `CUSTOMER`, `RESTAURANT_ADMIN`, `PLATFORM_ADMIN`; role-guarded APIs. |
| **Restaurants** | CRUD (platform), listing, detail; active flag. |
| **Restaurant admin assignments** | Many-to-many link: which `RESTAURANT_ADMIN` manages which restaurant. |
| **Request-based reservations** | `tableId` optional; rich request fields; status workflow. |
| **Event nights (foundation)** | `RestaurantEvent` with **PENDING** → **APPROVED/REJECTED** by **platform**; **customers** see only **APPROVED**, **active**, **upcoming** events. |
| **Event reservations (booking for an event night)** | **Separate** from table reservations: `EventReservation` links `customerId`, `restaurantId`, and `eventId`. New requests start **PENDING**; **restaurant** (or platform) **CONFIRM** or **REJECT**; **capacity** (when set on the event) is enforced on **confirm** (only **CONFIRMED** party sizes count; **PENDING/REJECTED/CANCELLED** do not). No payment, no image upload. |
| **Mobile customer app** | Expo: **Home** is **events-first**, then **restaurants**; **Event detail** (event request: party + optional note) vs **Restaurant detail** (table request) are separate. **My Reservations** lists **EVENT** and **TABLE** sections. |
| **Admin dashboard** | Next.js: **business** shell (**Step 41**; **41B** **polish**): **fixed** **collapsible** **sidebar**; **header** page **title** + **bell**; **shared** table/filter **styling** and **dark** **mode**; **Notification** list errors fixed (**plain** **API** errors surfaced); **restaurant** **names** on reservation rows **enriched** when the API omits the nested `restaurant`; **table** **bookings** show **status-appropriate** **actions** only. Menu: **Dashboard**, **Restaurants**, **Event nights**, **Restaurant (table) bookings**, **Notifications**, **Users** (platform only). **Operations** / **Pending work** **redirect**; table vs event **guest** flows **separate**. **Paged** tables (**20** / client). Staff **POST** **`/restaurants/:id/reservations/admin`**. **58** **HTTP** routes. **No** **AppIcons** changes. Earlier steps (**40C–E**) **account** / **theme** / **browser QA** remain. |
| **My Reservations** | Customer list: **event** requests and **table** requests, clearly separated. API responses use explicit `type: "TABLE" \| "EVENT"`, with **oldest→newest** `statusHistory` and optional **detail GETs** for a single request so the mobile app and admin can show a consistent timeline. |
| **In-app notifications** | Stored `Notification` rows; **no push, email, or SMS** in MVP. Customers get alerts when a restaurant (or platform) **confirms/rejects** a request; **assigned restaurant admins** get alerts when a **customer cancels** (table or event). Exposed as `GET`/`PATCH` under `/me/notifications` for any authenticated role (own inbox only). Tapping/clicking a notification should open the correct **table** or **event** reservation context; flows stay **separate**. |
| **Reservation status management** | Admins can move requests through the business states (see [§5](#5-reservation-lifecycle)). |

**Architecture note:** Monorepo with API (NestJS + Prisma + PostgreSQL), admin web app, and mobile app; **this blueprint does not prescribe file layout**—only product behavior and phased priorities.

---

## 5. Reservation Lifecycle

### Statuses

| Status | Meaning (business) |
|--------|---------------------|
| **PENDING** | Request submitted; restaurant has not decided. |
| **HELD** | Restaurant is soft-holding the slot (e.g. checking capacity or VIP policy). |
| **CONFIRMED** | Restaurant accepts the booking for the agreed window. |
| **REJECTED** | Restaurant cannot accommodate (or customer request is declined). |
| **CANCELLED** | Booking will not happen (customer or restaurant-driven cancellation, depending on future rules). |
| **COMPLETED** | Visit or slot has passed; service completed from an ops perspective. |

### Business-level transitions (illustrative)

- **PENDING** → **HELD** / **CONFIRMED** / **REJECTED** (main decision path).
- **HELD** → **CONFIRMED** / **REJECTED** / **CANCELLED** (clarify or release).
- **CONFIRMED** → **CANCELLED** (before service) or **COMPLETED** (after service).
- **REJECTED** / **CANCELLED** / **COMPLETED** are typically **terminal** for the customer’s “open request” experience.

Exact **allowed** transitions can be **hardened in Phase 2** (validation + audit) so the API and admin UI stay aligned. Today the product intent is: **restaurant** drives operational truth; **customer** always sees the **current** status.

---

## 6. Reservation Request Data

Important data carried by a reservation (conceptual model; field names may match API/DB).

| Field | Description |
|-------|-------------|
| **Restaurant** | Which venue the request targets. |
| **Customer** | Account submitting the request. |
| **Party size** | How many guests. |
| **startAt / endAt** | Requested time window. |
| **guestType** | e.g. family, youth, mixed, business, other. |
| **seatingPreference** | e.g. indoor, outdoor, no preference. |
| **bookingType** | e.g. standard, event night, VIP, occasion, other. |
| **customerPhone** | Optional contact for the venue. |
| **specialRequest** (and optional **occasionNote** where modeled) | Free text: diet, occasion, access needs. |
| **tableId** (optional) | If ever used, for internal or advanced flows—not required for a valid customer request. |

**API product behavior:** list/detail responses may **embed** restaurant (and table when present) so clients avoid redundant lookups for display.

---

## 7. Restaurant Profile (Future Modules)

Not required for the reservation MVP, but **expected** to deepen discovery and trust.

- **Photos** and visual identity
- **Menu URL** (link-out or future in-app)
- **Location / maps URL**
- **Contacts** (phone, social)
- **City / area** (partially in MVP; richer later)
- **Kitchen types** (cuisine tags)
- **Features** (outdoor, parking, family-friendly, etc.)
- **Privacy / atmosphere** tags
- **Opening hours** (structured; ties to availability logic later)

These support **search**, **filters**, and **cards** in discovery without changing the request-based reservation core.

---

## 8. Event Nights / Special Events (Foundation started)

Restaurants can publish **one-off or recurring event nights** (live music, set menus, VIP nights, etc.).

| Aspect | Product intent |
|--------|----------------|
| **Event entity** (implemented) | `RestaurantEvent`: title, description, start/end, **PENDING/REJECTED/APPROVED** (+ **CANCELLED** in model), free/paid, capacity, **platform approval** before customers see a listing, optional URLs and menu/entertainment text. **Images:** URL fields only; uploads later. |
| **Governance** | **Restaurant (or platform) admin** creates; status defaults to **PENDING**; only **platform admin** can **review** to **APPROVE** or **REJECT** (with reason). A **rejected** event that the restaurant **edits** returns to **PENDING** for a new review. **Deactivate** = soft hide (`isActive` false). |
| **Customer visibility** | **Approved**, **active**, **upcoming** (`endsAt` after “now”) events only; only for **active** restaurants. |
| **Entertainment** | Optional text (e.g. act / program). |
| **Booking** | *Not in current phase.* **Event booking requests** (apply for a seat) will be parallel to table **reservation** requests, with a similar **status** story. |
| **Link to kitchen** | `bookingType` in reservations still applies to **table** requests; **event** booking is a follow-on. |

**Not yet:** event-specific **booking** (dedicated request flow), deposits, notifications, image upload — see Offers, notifications, and payments sections below.

---

## 9. Offers Module (Future)

| Element | Description |
|---------|-------------|
| **Offer** | Title, description, **date range**, optional **image**, **active/inactive**, **linked restaurant**. |
| **Use** | Marketing: “20% off lunch,” “free dessert on Fridays.” |

**Relation to reservations:** offers may **nudge** discovery; redemption rules and POS integration are **out of scope** until later phases.

---

## 10. Discovery Module (Future)

| Feature | Description |
|---------|-------------|
| **Filter by city / area** | Geographic discovery. |
| **Filter by kitchen / features** | From enriched profiles. |
| **Favorites** | Saved restaurants for a customer. |
| **Stories / highlights** | Editorial or UGC-style surfacing (product decision later). |

**MVP today:** browse + search-light behavior (list + open detail). **Full discovery** follows profile completeness and content.

---

## 11. Notifications Module (Future)

Events that should eventually notify users (push/email/SMS TBD):

| Event | Recipients |
|-------|------------|
| Reservation **submitted** | Customer (acknowledgment), optionally restaurant. |
| Status **changed** (incl. held, confirmed, rejected) | Customer; restaurant as needed. |
| **Event** booking update | Parity with reservation status changes. |

**MVP today:** no notification channel—customers **refresh** or open **My Reservations**. Notifications are a **dedicated phase** to avoid low-quality spam and to design consent and frequency.

---

## 12. Payment / Deposit (Future Only)

| Topic | Stance |
|------|--------|
| **VIP booking** / **event deposit** / **prepaid** reservations | **Not in MVP.** Product space for later. |
| **Refunds / cancellation** | Tied to policy and payments—define after deposit flow exists. |

**Principle:** nail **request → status** without money movement first; add payments when business rules and compliance are clear.

---

## 13. Platform Admin Roadmap

| Area | Now | Later |
|------|-----|--------|
| **Users** | List, create, roles, active flag | — |
| **Restaurants** | Create/edit, active | Catalog hooks for cities/categories |
| **Assign restaurant admins** | Yes | — |
| **System activity** | Indirect (via data) | Dashboards, audit, support tools |
| **Cities / categories / features** | — | Governed taxonomies for discovery |

---

## 14. Restaurant Admin Roadmap

| Area | Now | Later |
|------|-----|--------|
| **Review reservation requests** | Yes (per assigned restaurant) | — |
| **Hold / confirm / reject / complete** | Yes (per product policy) | Stricter lifecycle rules in Phase 2 |
| **Restaurant profile** | Basic fields | [§7](#7-restaurant-profile-future-modules) |
| **Events / offers** | [§8](#8-event-nights--special-events-foundation-started): create events, **platform review**, **event reservation requests** (separate from table flow), customer visibility | [§9](#9-offers-module-future) and richer events |

---

## 15. Customer App Roadmap

| Stage | Capabilities |
|-------|----------------|
| **Now (MVP)** | Register / login, **Home** (events then restaurants), **Event detail** + **event reservation request** (separate from table booking), **Restaurant detail** + **table reservation request**, **My Reservations** (EVENT and TABLE). |
| **Next** | Clearer **history** and **lifecycle** transparency (align with Phase 2). |
| **Later** | broad **offers** surfacing, **favorites**, **rich discovery**. |

**Journey summary:** *find* → *request* → *track* → (future) *engage* with events and offers.

---

## 16. Development Roadmap (Phased)

| Phase | Focus | Outcome |
|-------|--------|--------|
| **1** | **Reservation MVP** | Request-based model, mobile + admin, status workflow | **Largely complete** |
| **2** | **Lifecycle hardening + history** | Status transition rules, audit or history records, better admin/customer visibility | **Next major engineering** |
| **3** | **Restaurant profile completeness** | Photos, hours, links, tags—feeds discovery |
| **4** | **Events / event nights** | Event entities, **platform approval**, customer list, **event reservations** (request/approve, capacity on confirm) — *foundation + booking* |
| **5** | **Offers** | Content + basic surfacing |
| **6** | **Discovery + favorites** | Filters, saved list |
| **7** | **Notifications** | Timely, consented, reliable |
| **8** | **Payments / deposits** | VIP, events, prepay, refunds—after rules are stable |

Phases 3–8 can be **partially parallel** where dependencies allow, but **lifecycle hardening (Phase 2)** should precede **heavy event/commerce** work so event bookings don’t repeat ambiguity.

---

## 17. Next Recommended Engineering Step

**Status:** reservation history and a dedicated **event reservation** flow (separate from table reservations) are implemented. **Step 36** (reservation **detail and status history consistency**): all list and detail responses expose a clear `type` discriminator, embedded **status history** in **chronological** order, and **customer/ restaurant/ event** context as documented in `docs/api-reference.md`—so users are not left guessing whether a screen refers to a **table** or **event** request. **Step 37** (in-app **notification foundation**): key reservation status transitions create **database notifications**; mobile and admin show a minimal list with read state—**no** push or external messages yet. **Step 38**: notifications are **actionable**—the customer app opens the matching **detail** screen; the admin app jumps to the restaurant’s **table** or **event** list with a highlighted row, without mixing the two product flows.

**Previously recommended: Step 26 — Reservation status history and lifecycle hardening** (largely addressed; further hardening remains in Phase 2)

**Why this before events/offers:**

1. **Events** will introduce a **second** booking-like object; both need a **credible status story** and **admin accountability**. Hardening reservations first sets the pattern.
2. **Support and trust** require **what changed, when, and by whom** (at least for admins; customer-facing “timeline” is optional in the same phase).
3. **Business rules** (which transitions are legal) are easier to encode once a **history** or **state machine** is explicit, avoiding one-off special cases in events later.

**Scope hint (not implementation):** optional audit table or event log, transition validation, admin visibility, and customer-safe summary—without bloating the MVP app surface.

---

## Assumptions (document-level)

- **Single region / locale** is acceptable for early MVP; multi-language and RTL are future UX work, not required for this blueprint to hold.
- **“Availability”** in the app may remain a **helper**; **truth** is always restaurant confirmation through **status**, not a grid of guaranteed tables.
- **Payments** are intentionally absent until the product and ops model justify them.

---

*End of product blueprint.*
