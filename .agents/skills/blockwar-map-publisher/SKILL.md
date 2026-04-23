---
name: blockwar-map-publisher
description: Use when creating, seeding, or publishing BlockWar custom maps for this repository. Covers live size limits, custom map payload shape, session-based publishing to /api/maps, restrained use of always-revealed tiles ("亮灯"), and verification through both /api/maps/:id and /maps/:id.
---

# BlockWar Map Publisher

Use this skill when the user asks to add BlockWar maps to the live backend or local Worker/D1 database.

## Live Constraints

- The production backend currently caps custom map width and height at `40` via `MAX_CUSTOM_MAP_SIDE` in [`src/worker/app-do.ts`](../../../../src/worker/app-do.ts).
- Do not promise a live `50x50` map unless that limit is raised and deployed first.
- The payload must be valid `CustomMapData`:
  - `id`, `name`, `width`, `height`, `creator`, `description`
  - `mapTilesData`: outer length `width`, inner length `height`
- Each tile is a five-tuple:
  - `[tileType, team, unitsCount, isAlwaysRevealed, priority]`
- Common tile types for authored maps:
  - `0`: King
  - `1`: City
  - `4`: Plain
  - `5`: Mountain
  - `6`: Swamp

## Practical Publishing Rules

- Kings are the map's "王都". Usually place `4-8` kings with `unitsCount = 1`.
- Keep kings unrevealed by default. If the room uses `revealKing`, the game will expose them anyway.
- Mountains should create fronts and choke points, not hard-lock entire regions.
- Swamps can represent rivers, sea lanes, marsh belts, cursed ground, or attrition corridors.
- Neutral cities are the best way to create mid-map contests. Typical authored values:
  - flank city: `10-15`
  - lane anchor: `15-20`
  - center objective: `25-35`

## "亮灯" Policy

`isAlwaysRevealed` is an information-design tool, not a default.

- Use it sparingly for:
  - major public landmarks
  - central objectives
  - named canals, straits, or river crossings that should be common knowledge
- Avoid overusing it on:
  - every mountain
  - every river tile
  - kings, unless the map is intentionally designed around open information
- If the user wants full fog-of-war pressure, keep almost all authored tiles unrevealed.

## Workflow

1. Design the map with:
   - enough spacing between capitals
   - at least one meaningful midline contest
   - mountains and swamps that shape routes without breaking reachability
2. Generate a JSON payload.
3. Publish with the bundled script:

```bash
node .agents/skills/blockwar-map-publisher/scripts/publish_map.mjs \
  --origin https://blockwar.01mvp.com \
  --username jackie \
  --file /absolute/path/to/map.json
```

4. Verify both:
   - `GET /api/maps/:id`
   - `GET /maps/:id`

## Verification Notes

- The live site requires a session token before `POST /api/maps`.
- The bundled publisher script handles:
  - session bootstrap through `POST /api/session`
  - map publish through `POST /api/maps`
  - API verification
  - public page verification
- The public page check must use `GET`, not `HEAD`. The SPA fallback can return `404` on `HEAD` even when the actual page works with `GET`.

## Bundled Scripts

- `scripts/generate_preset_maps.mjs`
  - Emits example large maps for this repo's live constraints.
  - Current presets include China-themed, world-themed, and weird/fun arena layouts.
- `scripts/publish_map.mjs`
  - Publishes one JSON file to the chosen BlockWar origin and prints the resulting URLs.

## When 50x50 Is Required

If the user explicitly needs `50x50` on the live site:

1. Raise the backend limit in [`src/worker/app-do.ts`](../../../../src/worker/app-do.ts).
2. Re-run validation and tests.
3. Deploy the Worker.
4. Only then publish the larger map.
