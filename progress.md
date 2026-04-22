Original prompt: http://localhost:8787/rooms/c8630c15 我现在在房间里头，选择那个自定义地图里头，点击那个搜索的时候，整个屏幕就变白了，就无法正常搜索，好像是有bug. index-BDjOzSXT.js:8 🌐 i18next is made possible by our own product, Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙

- 2026-04-22: Reproduced the failure path from logs. Opening the custom-map search tab sends `/api/search?q=` with an empty query.
- 2026-04-22: Root cause is split across both sides: the Worker returned `400 { error }` for empty queries, and `MapExplorer` cast the JSON response to `CustomMapInfo[]` before calling `.map(...)`, which crashes the modal.
- 2026-04-22: Patched the Worker to treat blank search terms as an empty result set, and hardened `MapExplorer` to skip empty search requests and normalize non-array payloads to `[]`.
- 2026-04-22: Added regression coverage for `/api/search?q=` and for the map-explorer request/response helpers.
- 2026-04-22: Verified in Chrome on `http://localhost:8787/rooms/c8630c15` that `地图 -> 选择自定义地图 -> 搜索` no longer whitescreens. Empty search now shows `No maps found.`, and typing `test` returns matching maps.
- TODO: Consider replacing the generic empty-search message with a dedicated localized hint such as “Enter a map name or ID to search.”
