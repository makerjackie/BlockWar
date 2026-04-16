# Repository Guidelines

## Documentation
- `README.md` is the default public README and should stay in English.
- `README.zh-CN.md` is the Simplified Chinese companion. Keep it aligned whenever user-facing setup, architecture, route, API, or deployment details change.
- Link from `README.md` to `README.zh-CN.md`, and back from the Chinese README to `README.md`.
- Do not claim a command was verified unless it was run in the current session.

## Project Structure & Module Organization
- `client/` contains the React UI: `components/`, `pages/`, `hooks/`, `context/`, `lib/`, `styles/`, `public/` assets, and locale JSON files.
- `src/app/` is the Vite SPA entry and React Router route table.
- `src/compat/` provides lightweight Next.js and socket.io compatibility shims used by migrated client pages/components.
- `src/shared/game/` holds shared Worker-side game engine types and logic. The client still has UI-facing mirrors under `client/lib/`; keep data shapes compatible when changing gameplay or map data.
- `src/worker/` contains the Hono Worker, `AppDurableObject`, `RoomDurableObject`, D1 persistence helpers, room summaries, and WebSocket logic.
- `test/` stores Vitest coverage for API and Durable Object behavior. Build output lands in `dist/client/`; local Worker state lives in `.wrangler/`.
- `worker-configuration.d.ts` is generated from Wrangler bindings; do not edit it by hand.

## Architecture Notes
- The app deploys as one Cloudflare Worker that serves the React SPA through the `ASSETS` binding, exposes Hono API routes under `/api`, and handles room WebSockets at `/ws/rooms/:roomId`.
- `AppDurableObject` coordinates global room/map/replay operations and initializes D1 tables at runtime from `APP_SCHEMA_STATEMENTS` in `src/worker/app-do.ts`.
- `RoomDurableObject` owns per-room WebSocket connections, room state, game ticks, player actions, and replay capture.
- `wrangler.jsonc` currently defines the `DB`, `APP`, `ROOMS`, `ASSETS`, custom domain route, and Durable Object migration settings.

## Tech Stack Snapshot
- Frontend app: React 18 + TypeScript + Vite 7 SPA, with routes defined through `react-router-dom` in `src/app/App.tsx`.
- Styling system: Tailwind CSS v4 via `@tailwindcss/vite`; Tailwind is imported from `client/styles/globals.css` with `@import "tailwindcss";`.
- UI foundations: shared theme tokens and component classes live in `client/styles/globals.css`, including `--bw-*` CSS variables plus reusable classes such as `bw-button`, `bw-input`, `bw-panel-hard`, `bw-page-copy`, `bw-title`, and `menu-container`.
- Theme handling: light/dark mode is driven by `data-theme` on `document.documentElement`; both modes must be supported whenever UI colors, surfaces, borders, or text styles change.
- Localization: `react-i18next`/`i18next` with locale files under `client/public/locales/`.
- Backend/runtime: Cloudflare Workers + Wrangler + Hono, with Durable Objects for app/room state and D1 for persistence.
- Realtime transport: room gameplay uses the WebSocket route `/ws/rooms/:roomId` through the compatibility shim in `src/compat/socket-io-client.ts`.
- Testing/build tooling: Vitest with the Cloudflare Workers pool, `tsc` for type checks, and Vite for client builds.

## UI & Tailwind Conventions
- Keep new UI work in Tailwind utility classes and the existing shared component classes from `client/styles/globals.css`; do not introduce a second styling framework.
- Prefer existing semantic design tokens (`var(--bw-ink)`, `var(--bw-panel-strong)`, `var(--bw-line)`, etc.) over hard-coded hex values or one-off inline colors, especially for text, borders, and panel backgrounds.
- Reuse the established BlockWar visual language: uppercase labels, strong contrast, compact spacing, square corners, and the existing `bw-*` button/panel/input patterns before inventing new variants.
- When a component needs custom styling beyond Tailwind utilities, extend the shared styles in `client/styles/globals.css` or use theme variables instead of scattering repeated inline styles across components.
- Any visible UI change must be checked for both `data-theme='dark'` and `data-theme='light'`; avoid assumptions that `text-zinc-*` or `bg-zinc-*` classes will always remain readable without theme overrides.
- Keep responsive behavior aligned with the current codebase: mobile-first Tailwind classes, then layer `sm:`, `md:`, and larger breakpoints only where needed.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies. Match CI with Node 20 and `pnpm` 10.
- `pnpm dev` starts the local stack: Vite watches static assets and Wrangler runs the Worker.
- `pnpm build` builds the client and runs TypeScript checks.
- `pnpm build:client` builds only the Vite client into `dist/client/`.
- `pnpm typecheck` runs `tsc --noEmit`.
- `pnpm test` runs `test/**/*.test.ts` with Vitest and the Cloudflare Workers pool.
- `pnpm check` is the pre-PR gate: client build, typecheck, and tests.
- `pnpm types` regenerates Wrangler types after binding or config changes.
- `pnpm deploy:dry-run` validates deploy packaging; `pnpm deploy` builds and deploys.

## Coding Style & Naming Conventions
- Use TypeScript with strict typing; prefer explicit types on public helpers and Worker payloads.
- Follow the existing style: 2-space indentation, single quotes, and semicolons.
- Use `PascalCase` for React components and context files, `useXxx` for hooks, and kebab-case for utility modules such as `room-do.ts` or `map-diff.ts`.
- Prefer configured path aliases: `@`, `@shared`, and `@worker`.
- There is no dedicated lint/format script yet, so keep imports tidy and match surrounding file structure before submitting.

## Testing Guidelines
- Add or update Vitest tests in `test/` and name them `*.test.ts`.
- Cover API behavior through `SELF.fetch(...)`.
- Cover Durable Object behavior through the Cloudflare Workers pool and `runInDurableObject(...)`.
- For room/WebSocket changes, cover join/start/game tick behavior where practical.
- Run `pnpm test` for focused changes and `pnpm check` before opening a PR.

## Commit & Pull Request Guidelines
- Prefer Conventional Commit subjects like `feat:`, `fix:`, and `chore:`. Older bracketed messages exist, but the colon style is the current baseline.
- Keep commit messages short, imperative, and scoped to one change.
- PRs should summarize gameplay/API impact, link related issues, list verification steps, and include screenshots for visible UI changes.
- Highlight changes to `wrangler.jsonc`, Durable Object bindings, D1 schema statements, migrations, routes, or deployment behavior.

## Security & Configuration Tips
- Never commit `.env`, `.wrangler/`, `dist/`, or generated artifacts.
- When changing bindings or Durable Objects, update `wrangler.jsonc`, run `pnpm types`, and keep migrations in sync with code.
- When changing D1 schema, update `APP_SCHEMA_STATEMENTS`, related persistence logic, and tests.
- If forking or deploying to another Cloudflare account, update the route, zone, D1 database id, and account-specific settings in `wrangler.jsonc`.
