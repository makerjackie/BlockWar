# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlockWar is a real-time multiplayer strategy game inspired by generals.io, built as a Cloudflare-native full-stack application. The entire application runs on a single Cloudflare Worker that serves the React SPA, HTTP API, Durable Objects, WebSockets, and static assets.

## Development Commands

```bash
# Development
pnpm dev              # Run concurrent dev mode (Vite watch + Wrangler dev)
pnpm dev:assets       # Build client assets in watch mode only
pnpm dev:worker       # Run Wrangler dev only

# Building
pnpm build            # Build client + typecheck (pre-deploy)
pnpm build:client     # Build Vite client only
pnpm typecheck        # Run TypeScript checks without emitting

# Testing
pnpm test             # Run Vitest with Cloudflare Workers pool
pnpm check            # Full validation: build + typecheck + test

# Deployment
pnpm deploy:dry-run   # Validate Worker packaging
pnpm deploy           # Build client and deploy to Cloudflare

# Types
pnpm types            # Regenerate worker-configuration.d.ts from Wrangler bindings
```

## Architecture

### Single Worker Deployment Model

The entire application is served by one Cloudflare Worker (`src/worker/index.ts`) using Hono for routing:

- `/api/*` - HTTP API endpoints (Hono routes)
- `/ws/rooms/:roomId` - WebSocket upgrade endpoint (proxied to RoomDurableObject)
- `/*` - Static assets served via ASSETS binding with SPA fallback

### Durable Objects

**AppDurableObject** (`src/worker/app-do.ts`):
- Singleton instance (name: "global")
- Manages D1 database schema initialization
- Centralizes room summaries and active room list
- Handles custom map CRUD, stars, and search
- Stores and retrieves replay records
- Issues and validates guest session tokens

**RoomDurableObject** (`src/worker/room-do.ts`):
- One instance per room (name: roomId)
- Manages WebSocket connections for all players in a room
- Runs game tick loop (turn-based updates)
- Handles player actions (move, surrender, chat)
- Manages bot AI via `lib/bot-engine.ts`
- Captures replay data during gameplay
- Persists room state to D1 via AppDurableObject

### Identity Model

The app uses a **guest session model** instead of traditional authentication:

1. Client requests session via `POST /api/session` with username
2. AppDurableObject issues a session token (stored in D1 `sessions` table)
3. Client sends token via `x-blockwar-session` header for protected operations
4. Session authorizes custom map ownership, starring, and room reconnects
5. Each room seat gets a rotating reconnect token for WebSocket rejoins

### Shared Game Logic

Core game engine code lives in `src/shared/game/`:

- `map.ts` - GameMap class with tile generation, fog of war, move validation
- `player.ts` - Player class with territory, army, and king tracking
- `game-record.ts` - GameRecord class for replay capture and playback
- `map-diff.ts` - MapDiff class for efficient tile change tracking
- `types.ts` - Shared types (Room, TileType, CustomMapData, etc.)
- `constants.ts` - Game constants (colors, team limits, speeds)

**Important**: Move validation happens in `GameMap.commendable()` which rejects non-cardinal moves. All callers (human players, bots, replay) must use this centralized validation.

### Client Architecture

- **Entry**: `src/app/main.tsx` renders React Router with route table in `src/app/App.tsx`
- **Pages**: `client/pages/` contains route components (lobby, room, map creator, tutorial, changelog)
- **Components**: `client/components/` contains reusable UI components
- **Hooks**: `client/hooks/` contains custom React hooks
- **Context**: `client/context/` contains React context providers
- **Compatibility Layer**: `src/compat/` provides Next.js and socket.io shims for migrated code

### WebSocket Protocol

The app uses a custom socket.io-compatible protocol:

1. Client connects to `/ws/rooms/:roomId` via WebSocket
2. RoomDurableObject accepts WebSocket upgrade
3. Messages are JSON packets: `{ type: string, data: unknown[] }`
4. Client uses `src/compat/socket-io-client.ts` shim for socket.io-like API
5. Server uses `buildPacket()` helper in `room-do.ts` to construct packets

### D1 Database Schema

Tables are initialized by AppDurableObject on first access:

- `rooms` - Room state snapshots (id, room_json, updated_at)
- `replays` - Compressed replay records (id, replay_json, size_bytes, created_at)
- `custom_maps` - User-created maps (id, name, width, height, creator, map_tiles_data, views, star_count)
- `sessions` - Guest session tokens (id, token, username, created_at)
- `map_owners` - Map ownership (map_id, session_id)
- `map_stars` - Map stars (map_id, session_id)
- `room_player_tokens` - Reconnect tokens (room_id, player_id, token, expires_at)

## Path Aliases

Configured in both `vite.config.ts` and `tsconfig.json`:

- `@` → `./client`
- `@shared` → `./src/shared`
- `@worker` → `./src/worker`

## Code Style

- TypeScript strict mode enabled
- 2-space indentation, single quotes, semicolons
- PascalCase for React components and context files
- `useXxx` naming for custom hooks
- kebab-case for utility modules
- Conventional Commits: `feat:`, `fix:`, `chore:`

## Testing

Tests use Vitest with `@cloudflare/vitest-pool-workers` for Durable Object testing:

- API tests use `SELF.fetch(...)` to test HTTP endpoints
- Durable Object tests use `runInDurableObject(...)` to test room logic
- Tests are in `test/` directory
- Run single test file: `pnpm test <filename>`

## Deployment Configuration

`wrangler.jsonc` is configured for `blockwar.01mvp.com`:

- **Route**: `blockwar.01mvp.com` on zone `01mvp.com`
- **D1 Database**: `blockwar-db` (binding: `DB`)
- **Durable Objects**: `ROOMS` (RoomDurableObject), `APP` (AppDurableObject)
- **Assets**: `dist/client` (binding: `ASSETS`)
- **Compatibility**: `nodejs_compat` flag enabled

**Important**: If forking, update route, zone, D1 database ID, and run `pnpm types` after changing bindings.

## Common Patterns

### Accessing Durable Objects

```typescript
// AppDurableObject (singleton)
const appStub = env.APP.getByName('global');
const rooms = await appStub.listRooms();

// RoomDurableObject (per-room)
const roomStub = env.ROOMS.getByName(roomId);
const response = await roomStub.fetch(request);
```

### Session Validation

```typescript
const session = await env.APP
  .getByName('global')
  .getSession(request.headers.get('x-blockwar-session'));

if (!session) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Room State Updates

Room state changes flow through RoomDurableObject:

1. Client sends WebSocket message (e.g., `attack` with from/to points)
2. RoomDurableObject validates action and updates game state
3. RoomDurableObject broadcasts state diff to all connected clients
4. RoomDurableObject persists room snapshot to D1 via AppDurableObject

### Bot Integration

Bots are managed by RoomDurableObject:

- Created via `createManagedBotPlayer()` in `lib/bot-engine.ts`
- Bot moves planned by `planBotMove()` during game tick
- Bots use same move validation as human players (`GameMap.commendable()`)
- Bots can be added on-demand or at game start

## Important Constraints

- Replay max size: 150 KB (compressed with gzip)
- Custom map max dimensions: 40x40
- Custom map name max length: 80 characters
- Username max length: 20 characters
- Disconnect grace period: 15 seconds before removing player
- Game speeds: 0.25x, 0.5x, 1x, 2x, 4x (multiplier on base tick rate)

## Recent Stability Improvements

- Move validation centralized in `GameMap.commendable()` to prevent diagonal moves
- `MapDiff` optimized to compare tile tuples directly instead of using `flat()` + `JSON.stringify()`
- Leaderboard computed once per tick and reused for all players
- Host reassignment fixed to avoid resetting host on unrelated disconnects
- Mobile drag interactions improved to handle diagonal swipes and gesture cancellation
- High-frequency debug logs suppressed in production builds
