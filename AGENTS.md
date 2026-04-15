# Repository Guidelines

## Project Structure & Module Organization
- `client/` contains the React UI: `components/`, `pages/`, `hooks/`, `context/`, `lib/`, `styles/`, and `public/` assets.
- `src/app/` is the Vite SPA entry, `src/worker/` contains the Hono Worker and Durable Objects, `src/shared/` holds the shared game engine, and `src/compat/` provides Next.js/socket.io compatibility shims.
- `test/` stores Vitest coverage for API and Durable Object behavior. Build output lands in `dist/client/`; local Worker state lives in `.wrangler/`.
- `worker-configuration.d.ts` is generated from Wrangler bindings; do not edit it by hand.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies. Match CI with Node 20 and `pnpm` 10.
- `pnpm dev` starts the local stack: Vite watches static assets and Wrangler runs the Worker.
- `pnpm build` builds the client and runs TypeScript checks.
- `pnpm test` runs `test/**/*.test.ts` with Vitest and the Cloudflare Workers pool.
- `pnpm check` is the pre-PR gate: build, typecheck, and tests.
- `pnpm types` regenerates Wrangler types after binding or config changes; `pnpm deploy:dry-run` validates deploy packaging.

## Coding Style & Naming Conventions
- Use TypeScript with strict typing; prefer explicit types on public helpers and Worker payloads.
- Follow the existing style: 2-space indentation, single quotes, and semicolons.
- Use `PascalCase` for React components and context files, `useXxx` for hooks, and kebab-case for utility modules such as `room-do.ts` or `map-diff.ts`.
- Prefer path aliases where configured: `@`, `@shared`, and `@worker`.
- There is no dedicated lint/format script yet, so keep imports tidy and match surrounding file structure before submitting.

## Testing Guidelines
- Add or update Vitest tests in `test/` and name them `*.test.ts`.
- Cover the changed behavior directly: API routes via `SELF.fetch(...)`, Durable Objects via `runInDurableObject(...)`.
- Run `pnpm test` for focused changes and `pnpm check` before opening a PR.

## Commit & Pull Request Guidelines
- Prefer Conventional Commit subjects like `feat:`, `fix:`, and `chore:`. Older bracketed messages exist, but the colon style is the current baseline.
- Keep commit messages short, imperative, and scoped to one change.
- PRs should summarize gameplay/API impact, link related issues, list verification steps, and include screenshots for visible UI changes.
- Highlight changes to `wrangler.jsonc`, Durable Object bindings, migrations, routes, or deployment behavior.

## Security & Configuration Tips
- Never commit `.env`, `.wrangler/`, `dist/`, or generated artifacts.
- When changing bindings or Durable Objects, update `wrangler.jsonc`, run `pnpm types`, and keep migrations in sync with code.
