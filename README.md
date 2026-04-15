# BlockWar / 方块战争

<h1 align="center">
  <img src="client/public/img/blockwar-logo.png" style="height: 90px;" alt="BlockWar">
  <br>
  <strong>BlockWar / 方块战争</strong>
</h1>

> 一个部署在 Cloudflare 上的实时多人策略小游戏，灵感来自 generals.io。

<h5 align="center">
<img src="blockwar-pc.png" width="400" >

BlockWar desktop demo

<img src="blockwar-mobile.png" width="300" >

BlockWar mobile demo
</h5>

## 当前架构

- **前端**：React + Vite + Material UI
- **后端**：Hono on Cloudflare Workers
- **实时房间**：Cloudflare Durable Objects + WebSocket
- **持久化**：App Durable Object(SQLite storage) 保存大厅、地图、收藏与回放
- **共享游戏内核**：`src/shared/game/`

## 主要能力

- 房间大厅 / 创建房间
- 房间级 WebSocket 对战
- 战争迷雾、战国模式、观战
- 自定义地图发布与浏览
- 回放存储与查看
- 单 Worker 部署前后端

## 本地开发

```bash
pnpm install
pnpm types
pnpm dev
```

默认会同时：

- 用 Vite 监听构建前端静态资源
- 用 Wrangler 在本地启动 Worker + Durable Objects

## 构建与测试

```bash
pnpm build
pnpm test
pnpm check
pnpm types
pnpm deploy:dry-run
```

## 开发与贡献约定

- 推荐使用 Node 20 与 `pnpm` 10，尽量与 GitHub Actions 保持一致。
- 日常本地开发使用 `pnpm dev`；提交前至少执行一次 `pnpm check`。
- 修改 `wrangler.jsonc`、Durable Object 绑定或其他 Cloudflare 资源后，请运行 `pnpm types` 更新 `worker-configuration.d.ts`。
- 测试位于 `test/*.test.ts`，API 建议通过 `SELF.fetch(...)` 验证，Durable Object 建议通过 `runInDurableObject(...)` 验证。
- TypeScript 保持严格模式，沿用现有风格：2 空格缩进、单引号、分号；React 组件使用 `PascalCase`，hooks 使用 `useXxx` 命名。
- 提交信息建议使用 `feat:`、`fix:`、`chore:` 这类 Conventional Commit 前缀；涉及 UI 变更时，PR 最好附截图。

## 已验证内容

- TypeScript `pnpm typecheck`
- 前端打包 `pnpm build:client`
- Worker 干跑构建 `pnpm deploy:dry-run`
- Vitest 自动化测试（API / 房间 DO）
- 本地 WebSocket 冒烟：双玩家加入、强制开局、收到 `game_started` 与持续 `game_update`

## 目录说明

```text
├── client/              # 复用的 React 组件、页面、样式、文案、资源
├── src/app/             # Vite SPA 入口
├── src/compat/          # Next.js / socket.io 兼容层
├── src/shared/game/     # 共享游戏规则与类型
├── src/worker/          # Hono Worker、Durable Objects、房间/存储逻辑
└── test/                # Vitest 自动化测试
```

## 部署

```bash
pnpm deploy
```

部署前请先确认你已经登录 Wrangler，并具备 Cloudflare Workers / Durable Objects 权限。
