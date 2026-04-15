# BlockWar / 方块战争

<h1 align="center">
  <img src="client/public/img/favicon.png" style="height: 90px;" alt="BlockWar">
  <br>
  <strong>BlockWar / 方块战争</strong>
</h1>

> 一个部署在 Cloudflare 上的实时多人策略小游戏，灵感来自 generals.io。

<h5 align="center">
<img src="gennia-pc.png" width="400" >

BlockWar desktop demo

<img src="gennia-mobile.png" width="300" >

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
pnpm deploy:dry-run
```

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
