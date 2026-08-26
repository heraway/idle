# Idle — odd jobs, done nearby

Idle is a mobile marketplace for no-experience, no-paperwork local work: lawn mowing,
hair braiding, babysitting, moving help, cleaning, dog walking, and anything in between.
Anyone can post a job, workers bid their own price, progress is tracked live with a
checklist and photos, and payment sits in escrow until the job is confirmed done.

Built as a portfolio project. **MIT licensed — free to fork, run, and extend.**

> ⚠️ **Status: reference implementation.** The data model, API, and mobile screens are
> real and runnable. Payments (escrow) and ID verification are wired against a clean
> provider interface with a working mock/sandbox implementation — swap in real Stripe
> Connect / Persona-Onfido-Stripe Identity keys to go live. This is called out
> everywhere it applies so nobody mistakes the mock for the real thing.

---

## 1. What's in the box

| Area | Feature |
|---|---|
| Jobs | Post a job (title, description, category, location, pay rate, duration, # workers needed, hours/day willing to hire, optional ID-verification requirement) |
| Bidding | Workers browse/search and submit a bid at their own price; poster accepts one or more bids |
| Search | Filter by location (radius), pay rate, duration, category, workers needed, ID-verified-only |
| Messaging | Per-job chat thread between poster and hired worker(s) |
| Checklist | Poster-defined task list on the job; worker ticks tasks off in real time, optional photo per tick |
| Proof-of-work | Required "before" photo of the site at job start and "after" photo at completion, shown side by side |
| Escrow | Poster funds escrow when a bid is accepted; funds release to the worker when the poster confirms completion, or route to dispute/admin review |
| Trust | Two-way star rating + "like" system after every completed job, shown on public profiles |
| ID verification | Optional per-job requirement; worker uploads a government ID + selfie, verified against a provider, status shown to the poster (poster never sees the raw ID) |
| Safety | In-app SOS/share-location-with-contact, block & report, admin ban/suspend, content moderation queue |
| Admin | Dashboard to oversee jobs/users, cancel jobs, suspend or ban accounts, review disputes and ID-verification flags |
| Legal | Terms of Service, Privacy Policy, Liability Waiver, ID Verification Consent, Community Guidelines — all in `/LEGAL`, all required to accept at signup |
| Theme | Full light + dark theme, system-default aware |

## 2. Why this stack

| Layer | Choice | Why |
|---|---|---|
| Mobile app | **React Native + Expo, TypeScript** | One codebase → iOS, Android, and web. Free to build, free to run in Expo Go, huge ecosystem, and the most portfolio-relevant cross-platform stack right now. |
| Backend API | **Node.js + Express, TypeScript** | Same language as the client (less context-switching, faster to reason about end to end), enormous library support, trivial to deploy free-tier (Render/Railway/Fly.io). |
| Database | **PostgreSQL + Prisma ORM** | Relational data (jobs ↔ bids ↔ users ↔ ratings ↔ escrow) is a textbook relational problem; Prisma gives type-safe queries and painless migrations. |
| Auth | JWT (access + refresh) | Stateless, works cleanly across mobile clients. |
| File storage | Pluggable `storage.service.ts` (local disk in dev, S3-compatible in prod) | Keeps photo/ID uploads free during development. |
| Payments/escrow | Pluggable `escrow.service.ts`, mock provider included, **Stripe Connect** shaped | Stripe Connect is the standard way to hold buyer funds and pay out a third party (the worker) — exactly an escrow model. |
| ID verification | Pluggable `idVerification.service.ts`, mock provider included, **Stripe Identity / Persona** shaped | Both offer document + selfie liveness verification via a simple API; the interface here matches either. |

Everything costs $0 to run locally. The only cost to "go live" for real is turning on a
real Stripe Connect account and a real ID-verification provider, both pay-per-use.

## 3. Repo layout

```
idle-app/
├── LEGAL/                       ToS, Privacy Policy, Waiver, ID-consent, Guidelines
├── backend/
│   ├── prisma/schema.prisma     full data model (11 models — see below)
│   └── src/
│       ├── index.ts             Express app entry point, mounts every router
│       ├── routes/              auth, users, jobs, bids, checklist, messages,
│       │                        ratings, escrow, reports, verification, admin
│       ├── middleware/          auth guard, admin/superadmin guard, rate limits, errors
│       ├── services/            escrow (mock), ID verification (mock), notifications, uploads
│       └── utils/                jwt, ApiError, asyncHandler
└── mobile/
    ├── App.tsx                  wires ThemeProvider + AuthProvider + RootNavigator
    └── src/
        ├── theme/               light/dark design tokens
        ├── context/             ThemeContext, AuthContext
        ├── api/                 typed fetch client (JSON + multipart upload)
        ├── navigation/          RootNavigator (auth stack ↔ main app stack/tabs)
        ├── components/          Button, Card, Badge, Input, EmptyState
        └── screens/
            ├── Auth/            Consent, Login, Register
            ├── Jobs/            Feed (search+filters), Detail, PostJob, ReportUser
            ├── Chat/            per-job messaging + checklist proof photos
            ├── Profile/         profile, theme switcher, legal doc viewer
            ├── Verification/    ID verification consent + status
            └── Admin/           overview, users, jobs, reports tabs
```

## 4. Data model highlights (`backend/prisma/schema.prisma`)

- `User` — profile, role (`WORKER` / `POSTER` / both / `ADMIN`), rating average, like
  count, account status (`ACTIVE / SUSPENDED / BANNED`), ID-verification status.
- `Job` — everything the poster defines: pay, location (lat/lng + radius search),
  duration, workers needed, hours/day willing to hire, `requiresIdVerification` flag,
  status machine (`OPEN → IN_PROGRESS → COMPLETED / CANCELLED / DISPUTED`).
- `Bid` — a worker's proposed price + message; poster accepts one (or several, if
  `workersNeeded > 1`).
- `ChecklistItem` — ordered tasks on a job; `completedAt`, optional `photoUrl`.
- `JobPhoto` — `BEFORE` / `AFTER` / `CHECKLIST` proof photos.
- `Message` — per-job chat.
- `Rating` — bidirectional (poster→worker and worker→poster), `stars` + optional
  `liked` boolean + comment.
- `Escrow` — state machine (`PENDING → FUNDED → RELEASED / REFUNDED /
  DISPUTED_HOLD`), amount, provider reference id.
- `IdVerification` — provider reference, status, never stores the raw document —
  only a verification result and expiry.
- `Report` — user- or job-reports, feeds the admin moderation queue.
- `AdminAction` — audit log of every admin action (ban, suspend, cancel job, resolve
  dispute) — required for accountability.

## 5. Safety measures implemented

1. **Optional ID verification per job.** A poster can require any bidder to be
   ID-verified before their bid is even shown, for higher-risk jobs (in-home work,
   jobs involving a driver's license, etc). Workers verify once; status is reusable
   across jobs.
2. **Escrow, not direct payment.** A poster's payment is captured up front and only
   released to the worker after the poster confirms the checklist/after-photo — the
   worker isn't paid nothing after finishing, and the poster can't just not pay.
3. **Before/after photo evidence** — objective proof the job matches what was asked,
   reduces "he-said/she-said" disputes.
4. **Two-way ratings** — bad actors on either side surface quickly; profiles below a
   rating threshold get a visible warning badge.
5. **Block & report** on any user or job, with a required reason, feeding the admin
   moderation queue.
6. **Admin oversight** — suspend/ban accounts, cancel jobs, force-refund escrow,
   resolve disputes, all logged to `AdminAction` for auditability.
7. **In-app location share** — while a job is `IN_PROGRESS`, either party can share
   live location with an emergency contact for the duration of the job (see
   `EscrowScreen`/job detail — flagged as a v1.1 roadmap item in code comments where
   not yet wired to a real maps SDK).
8. **Mandatory legal consent at signup** — see `/LEGAL`. Users must explicitly accept
   ToS + Liability Waiver before posting or bidding, and separately consent before any
   ID document upload.
9. **No document ever shown to the other party** — the poster only ever sees a
   ✅/❌ verified badge, never the ID image itself. Only admins (for fraud/legal
   investigation) and the verification provider ever touch the raw document.

## 6. Running it locally

### Backend
```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, JWT secrets
npm install
npx prisma migrate dev    # creates the Postgres schema
npm run dev                # http://localhost:4000
```

### Mobile
```bash
cd mobile
npm install
npx expo start             # scan the QR code with Expo Go, or press i / a
```

`docker-compose.yml` at the repo root spins up a local Postgres instance if you don't
have one:
```bash
docker compose up -d
```

## 7. API surface (backend/src/index.ts)

| Prefix | Covers |
|---|---|
| `/auth` | register (mandatory ToS consent), login |
| `/users` | current-user profile, public trust profile |
| `/jobs` | create, `/search` (category/location-radius/pay/duration/workers filters), get one, before/after photos, cancel |
| `/bids` | place, withdraw, accept (assigns worker + opens escrow gate) |
| `/checklist` | add item, tick off with optional photo, submit job, hirer confirm-complete |
| `/messages` | per-job chat, text or photo |
| `/ratings` | star + like rating, only after `COMPLETED` |
| `/escrow` | fund, release, refund, freeze-on-dispute (mock provider, Stripe-Connect-shaped) |
| `/reports` | file a report (auto-freezes escrow + disputes the job), admin resolve queue |
| `/verification` | start ID-verification session (consent-gated), status, dev-only mock-complete |
| `/admin` | overview stats, user suspend/ban/reinstate/role, job force-cancel (auto-refunds), audit log |

## 8. Roadmap / not-yet-built (clearly marked as `// TODO` in code)

- Real Stripe Connect onboarding flow for workers (payout accounts) — see `escrow.service.ts`
- Real ID-verification provider (Stripe Identity / Persona) — see `idVerification.service.ts`
- Push notifications via Expo (`notification.service.ts` logs to console today)
- Real-time chat via the included `socket.io` dependency (currently polls every 4s)
- Live map view for job locations (currently list + distance badge)
- Automated content moderation (profanity/image scanning) ahead of the human queue
- Multi-language support

## 9. License

MIT — see `LICENSE`. Use it, fork it, ship it.
