# Habbo Clone — Phase 1

See [`PLAN.md`](./PLAN.md) for the full architecture and build-order plan.

Phase 1 adds real accounts on top of the Phase 0 movement-sync skeleton:
register/log in on the client, the server issues a JWT backed by a
Postgres `User` table (via Prisma), and joining the game room now carries
your verified identity instead of a random guest name.

## Prerequisites

- Node.js 20+
- Docker (for Postgres — MinIO is also provisioned for later, not used yet)

## 1. Start Postgres

From the repo root:

```bash
docker compose up -d
```

Postgres is now on `localhost:5432` (user/pass/db: `habbo`).

## 2. Set up the server

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and set a real `JWT_SECRET` (any random string is fine for
local dev — just don't use the placeholder in anything public).

Generate the Prisma client and create the database tables:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

`prisma generate` needs internet access the first time (it downloads a
small query-engine binary) — if that fails behind a restrictive network,
that's what to check first.

Start the server:

```bash
npm run dev
```

You should see `[server] Colyseus listening on ws://localhost:2567`.

## 3. Set up the client

In another terminal:

```bash
cd client
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000` — you'll be redirected to `/login`. Register
an account (3–20 letters/numbers/underscores for the username, 8+
character password), and you'll land on the game page logged in as that
user. Open a second browser (or an incognito window) and register a
second account to see two real, authenticated avatars synced live.

## What's new in Phase 1

- `server/prisma/schema.prisma` — `User`, `House`, `Room`, `Asset`, `Book`,
  `PlacedObject` models (House/Room/Asset aren't wired into any routes
  yet — that's the next step)
- `server/src/auth.ts` — password hashing (bcrypt) and JWT sign/verify
- `server/src/routes/auth.ts` — `POST /auth/register`, `POST /auth/login`
- `server/src/rooms/HouseRoom.ts` — `onAuth` now verifies the JWT if one
  is supplied (guest join without a token still works for quick testing)
- `client/src/lib/auth.ts` — calls the server's auth endpoints, persists
  the token in `localStorage`
- `client/src/app/login/page.tsx` — login/register form
- `client/src/app/page.tsx` — redirects to `/login` if there's no token

## Next steps

Per `PLAN.md` Phase 1: build out House/Room creation (a logged-in user
creates a house, invites a friend, gets assigned a personal room), and
have `HouseRoom` load a specific house/room from Postgres instead of
one shared space for everyone.
