Original prompt: http://localhost:8787/rooms/c8630c15 我现在在房间里头，选择那个自定义地图里头，点击那个搜索的时候，整个屏幕就变白了，就无法正常搜索，好像是有bug. index-BDjOzSXT.js:8 🌐 i18next is made possible by our own product, Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙

- 2026-04-22: Reproduced the failure path from logs. Opening the custom-map search tab sends `/api/search?q=` with an empty query.
- 2026-04-22: Root cause is split across both sides: the Worker returned `400 { error }` for empty queries, and `MapExplorer` cast the JSON response to `CustomMapInfo[]` before calling `.map(...)`, which crashes the modal.
- 2026-04-22: Patched the Worker to treat blank search terms as an empty result set, and hardened `MapExplorer` to skip empty search requests and normalize non-array payloads to `[]`.
- 2026-04-22: Added regression coverage for `/api/search?q=` and for the map-explorer request/response helpers.
- 2026-04-22: Verified in Chrome on `http://localhost:8787/rooms/c8630c15` that `地图 -> 选择自定义地图 -> 搜索` no longer whitescreens. Empty search now shows `No maps found.`, and typing `test` returns matching maps.
- TODO: Consider replacing the generic empty-search message with a dedicated localized hint such as “Enter a map name or ID to search.”
- 2026-04-23: Investigated the “queued movement stops after a few steps” report. Root cause is server-side move validation allowing attacks from tiles with zero movable units, so a long queued route could keep accepting requests while moving 0 units.
- 2026-04-23: Patched shared/client move validation to require at least one movable unit and added Durable Object regression coverage for a 1-unit source tile attack.
- 2026-04-23: Verification passed with `pnpm test test/room-do.test.ts`, `pnpm test test/attack-queue.test.ts`, `pnpm typecheck`, and `pnpm build:client`.
- 2026-04-23: Playwright smoke on `http://localhost:8787` produced a clean login-page screenshot with no console errors. A deeper headless room-join smoke got stuck in the joining gate while repeatedly reconnecting WebSockets; that looks unrelated to the zero-movable-unit movement fix and needs separate investigation if we want to automate full in-room browser coverage.
- 2026-04-23: Follow-up investigation found a second client-side issue: queued path preview did not budget unit depletion at all, so the UI could draw routes longer than the stack could actually sustain even when the backend was behaving correctly.
- 2026-04-23: Added client-side projected-route simulation so queue preview now stops once the selected stack would run out of movable units, including half-move forecasting and queue undo/clear state restoration.
- 2026-04-23: Verified the queue-preview fix with `pnpm test test/projected-moves.test.ts`, `pnpm test test/attack-queue.test.ts test/room-do.test.ts`, `pnpm typecheck`, and `pnpm build:client`.
