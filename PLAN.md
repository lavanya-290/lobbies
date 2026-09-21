# Habbo-Style Multiplayer House Game — Project Plan

## 1. Concept

A small Habbo-style multiplayer world where players create and join shared
houses with friends. Each house contains shared spaces plus personal rooms
that players can deeply customize. The wider world contains public social
locations (cafés, libraries, parks, game rooms). Books placed in the library
are fetched from real-world metadata (Google Books), giving the library an
emergent "citizen recommendation" quality. AI is an optional, decoupled
content-generation seam — not a dependency of the core game.

## 2. Stack (all open source)

| Layer | Choice | License |
|---|---|---|
| Game engine | Phaser 3 | MIT |
| Language | TypeScript | Apache/MIT |
| Web/app shell | Next.js | MIT |
| Multiplayer server | Colyseus | MIT |
| Database | PostgreSQL | PostgreSQL License (OSS) |
| Object/asset storage | MinIO (S3-compatible, self-hosted) | AGPLv3 |
| Map editor | Tiled | GPL/BSD (tool only, not a runtime dependency) |
| Pixel art tool | Pixelorama | MIT |
| Free asset packs | Kenney (CC0), select OpenGameArt (check each license) | varies |

No paid or rate-limited API is required for the core game to function.

## 3. Content pipeline

Content is split into four independent tiers, unified behind one
`ContentProvider`-style interface so none of them are structurally required
by the others:

1. **Handmade core assets** — avatars, base tiles, signature furniture.
   Authored once in Pixelorama.
2. **Procedural generator** — a TypeScript renderer that takes a JSON
   "recipe" (shape / material / color / style) and draws furniture, books,
   plants, posters, etc. programmatically. Main lever for variety without
   art-team time or AI.
3. **Player-provided content** — image uploads (paintings, photos) stored in
   MinIO, and the real book-cover fetch (Google Books API → cache →
   optional pixelation).
4. **AI (optional, later)** — sits outside the core loop entirely. If a free
   API key disappears, nothing in the game breaks.

## 4. Book / library subsystem

- Player types a title → Google Books API returns metadata + cover URL.
- Cache by Google volume ID / ISBN so the same book is never reprocessed.
- Image pipeline: crop → resize (~32×48 or 40×60) → color quantize →
  nearest-neighbor upscale → optional outline → optional auto-generated
  spine for shelf display.
- Per-player toggle: real cover vs. pixelated cover.
- `placedBy` on the book record makes the shelf an implicit
  citizen-curated recommendation list.

## 5. Data model (minimum viable)

```
User         id, username, avatarConfig
House        id, ownerId, layoutId
Room         id, houseId, type(shared|personal), ownerId(nullable), tilemapRef
PlacedObject id, roomId, assetId, x, y, rotation, placedBy, metadata(json)
Asset        id, type(handmade|procedural|book|upload), sourceRecipe(json)|sourceUrl
Book         id, googleVolumeId, title, author, coverAssetId
```

`PlacedObject.metadata` carries type-specific data (book info, procedural
recipe, etc.) so Phaser's rendering layer stays generic — it just draws
`Asset`s at positions.

## 6. Build order

**Phase 0 — Skeleton (this scaffold)**
- Colyseus server + Postgres running locally
- Next.js shell with placeholder auth
- One Phaser scene loaded inside Next.js, with a moving avatar synced via
  a Colyseus room

**Phase 1 — Core loop**
- Login → avatar appears → create house → invite friend → assign bedroom →
  both walk around → place a handmade furniture item each → return to
  shared room
- Use 5–10 handmade/Kenney assets only; no procedural generator yet

  *Progress:* real auth is done — `/auth/register` and `/auth/login` on the
  server issue JWTs backed by a Postgres `User` table (via Prisma), and the
  client has a login/register page that gates the game and passes the
  verified username into the Colyseus room. Still to do in this phase:
  the House/Room data model beyond `User`, splitting `HouseRoom` so it
  loads a specific house/room instead of one shared space, and swapping
  the placeholder rectangle for a real sprite.

**Phase 2 — Procedural asset generator**
- Recipe → renderer → PNG → asset registry, proven on one object type
  (chairs) first, then extended to tables/books/plants/posters
- Buildable as an isolated script/service, not inside the game server

**Phase 3 — Library/book system**
- Google Books integration, cache table, pixelation pipeline, shelf UI

**Phase 4 — Public world**
- Café, park, library, game room as separate Tiled maps, reusing the same
  room/object system

**Phase 5 — Player uploads + polish**
- Image uploads to MinIO, moderation/size limits, `ContentProvider`
  extension seam left clean for an optional future AI provider

## 7. Open decisions to pin down early

- **Auth**: roll your own vs. self-hosted Auth.js/Keycloak. Affects the
  Next.js setup immediately.
- **Hosting**: Docker Compose locally to start; VPS target for prod
  (Colyseus + Postgres + MinIO).
- **Tile size / avatar resolution**: pick now (e.g. 32px or 48px) — every
  asset, handmade and procedural, is built against this.
- **Procedural renderer approach**: canvas-based Node script vs.
  SVG→PNG pipeline — worth a short spike before Phase 2.

## 8. What's in this scaffold

```
habbo-clone/
├── PLAN.md
├── README.md
├── docker-compose.yml
├── docker/
│   └── minio/                  (created at runtime)
├── server/                     Colyseus + TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            server bootstrap
│       └── rooms/
│           ├── HouseRoom.ts    room logic
│           └── schema/
│               └── HouseState.ts
└── client/                     Next.js + Phaser + TypeScript
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   └── page.tsx
        └── game/
            ├── PhaserGame.tsx  React wrapper, mounts Phaser
            ├── main.ts         Phaser game config
            └── scenes/
                └── MainScene.ts
```

This is Phase 0: it boots, connects a client to a Colyseus room, and
renders synced moving avatars in Phaser inside a Next.js page. Everything
after this is additive.
