# BlockWar / 方块战争

<h1 align="center">
  <img src="client/public/img/blockwar-logo.png" height="90" alt="BlockWar">
  <br>
  <strong>BlockWar / 方块战争</strong>
</h1>

<p align="center">
  <a href="README.md">English</a>
</p>

> 一个受 generals.io 启发的实时多人策略小游戏，目前已经重构为 Cloudflare 原生全栈应用。

<p align="center">
  <img src="blockwar-pc.png" width="520" alt="BlockWar 桌面端演示">
  <br>
  <strong>桌面端演示</strong>
</p>

<p align="center">
  <img src="blockwar-mobile.png" width="300" alt="BlockWar 移动端演示">
  <br>
  <strong>移动端演示</strong>
</p>

## 主要能力

- 基于原生 WebSocket 的实时多人房间。
- 大厅、创建房间、转移房主、队伍、观战、准备/强制开局、房间聊天。
- 类 generals.io 玩法：战争迷雾、主城/国王、城市、山地、沼泽、队列移动、投降、排行榜实时更新。
- 支持战国模式、显示国王、死亡后观战、地图尺寸/地形比例调节、变速对局。
- 自定义地图编辑、发布、浏览、搜索、浏览量、收藏，以及 new/hot/best 排序。
- 对局结束后保存回放，并支持回放查看。
- 中英文 UI，以及深色/浅色主题。
- 单个 Cloudflare Worker 同时承载 React SPA、HTTP API、Durable Objects、WebSocket、静态资源和 D1 持久化。

## 当前架构

- **前端：** React 18、Vite、React Router、Tailwind CSS 4、i18next，以及用于迁移旧页面/组件的轻量 Next.js 兼容层。
- **Worker API：** Cloudflare Workers 上的 Hono 路由，统一挂载在 `/api` 下。
- **实时房间：** `RoomDurableObject` 负责房间状态、WebSocket 连接、游戏 tick、玩家操作和回放采集。
- **应用协调：** `AppDurableObject` 负责房间摘要与持久化操作的集中入口。
- **持久化：** Cloudflare D1 保存房间、自定义地图、收藏关系和回放记录；表结构由 `AppDurableObject` 在运行时初始化。
- **共享游戏逻辑：** 核心游戏类型和引擎代码位于 `src/shared/game/`。
- **静态资源：** Vite 将 SPA 构建到 `dist/client`；Wrangler 通过 `ASSETS` binding 提供资源，并支持 SPA fallback。

## 页面路由

| 路由 | 用途 |
| --- | --- |
| `/` | 登录、大厅、Ping 状态、房间列表、创建房间。 |
| `/rooms/:roomId` | 实时游戏房间。 |
| `/mapcreator` | 自定义地图编辑与发布。 |
| `/maps/:mapId` | 自定义地图查看/编辑入口。 |
| `/replays/:replayId` | 回放查看。 |

## API 概览

| 接口 | 用途 |
| --- | --- |
| `GET /api/ping` | 客户端使用的健康检查。 |
| `GET /api/get_rooms` | 获取活跃房间和内置房间。 |
| `GET /api/create_room?name=...` | 创建房间并返回 room id。 |
| `GET /api/get_replay/:replayId` | 获取已保存的回放。 |
| `GET /api/maps` / `POST /api/maps` | 获取或创建自定义地图。 |
| `GET /api/maps/:id` / `PUT /api/maps/:id` / `DELETE /api/maps/:id` | 读取、更新或删除自定义地图。 |
| `GET /api/new` / `GET /api/hot` / `GET /api/best` | 按创建时间、浏览量或收藏数列出地图。 |
| `GET /api/search?q=...` | 按名称或 id 搜索地图。 |
| `POST /api/toggleStar` | 为某个用户收藏或取消收藏地图。 |
| `GET /api/starredMaps?userId=...` | 获取某个用户收藏的地图 id 列表。 |
| `GET /ws/rooms/:roomId` | socket.io 兼容层使用的 WebSocket 入口。 |

## 本地开发

推荐使用 Node.js 20 和 pnpm 10，与 CI 保持一致。

```bash
pnpm install
pnpm types
pnpm dev
```

`pnpm dev` 会同时启动两个进程：

- `pnpm dev:assets`：监听并构建 Vite SPA 到 `dist/client`。
- `pnpm dev:worker`：启动 Wrangler，本地运行 Worker、D1、Durable Objects、WebSocket 和静态资源。

客户端默认通过 `/api` 访问 Worker。Vite 会把迁移后的客户端代码中的
`process.env.NEXT_PUBLIC_SERVER_API` 定义为 `/api`。

## 常用脚本

```bash
pnpm dev             # 监听构建前端资源并启动 wrangler dev
pnpm build           # 构建客户端并执行 TypeScript 检查
pnpm build:client    # 仅构建 Vite 客户端
pnpm typecheck       # 执行 tsc --noEmit
pnpm test            # 使用 Cloudflare Workers pool 运行 Vitest
pnpm check           # 构建客户端、类型检查、运行测试
pnpm types           # 根据 Wrangler bindings 重新生成 worker-configuration.d.ts
pnpm deploy:dry-run  # 构建客户端并验证 Worker 打包
pnpm deploy          # 构建客户端并部署到 Cloudflare Workers
```

## 目录结构

```text
├── client/              # React 页面、组件、hooks、context、样式、多语言文案、资源
├── src/app/             # Vite SPA 入口和 React Router 路由表
├── src/compat/          # Next.js 与 socket.io 兼容层
├── src/shared/game/     # 共享游戏引擎、地图、玩家、回放、房间类型
├── src/worker/          # Hono Worker、Durable Objects、持久化、WebSocket 房间逻辑
├── test/                # API 与 Durable Object 行为的 Vitest 测试
├── wrangler.jsonc       # Cloudflare Worker、静态资源、D1、Durable Object 和路由配置
└── worker-configuration.d.ts
```

## Cloudflare 部署

```bash
pnpm deploy
```

部署前请确认：

- 已经登录 Wrangler，并且账号具备部署 Workers、Durable Objects、D1 和 Workers Assets 的权限。
- 已检查 `wrangler.jsonc`；当前仓库配置的是 `blockwar.01mvp.com` 和 `blockwar-db` D1 数据库。
- 如果 fork 项目，请更新 route、zone、D1 database binding/id 和账号相关配置。
- 修改 bindings 或 Wrangler 配置后，请运行 `pnpm types`。
- 不要手动编辑 `worker-configuration.d.ts`。

## 测试说明

- API 行为通过 `SELF.fetch(...)` 覆盖。
- Durable Object 行为通过 Cloudflare Workers Vitest pool 和 `runInDurableObject(...)` 覆盖。
- 房间/WebSocket 测试当前覆盖双玩家加入、强制开局、收到 `game_started`、回合推进等行为。

## 贡献约定

- 保持 TypeScript 严格模式，并沿用现有风格：2 空格缩进、单引号、分号。
- React 组件和 context 文件使用 `PascalCase`，hooks 使用 `useXxx`，工具模块使用 kebab-case。
- 优先使用 Vite/TypeScript 已配置的路径别名：`@`、`@shared`、`@worker`。
- 开 PR 前请运行 `pnpm check`。
- 提交信息建议使用 `feat:`、`fix:`、`chore:` 等 Conventional Commit 前缀。
- 涉及可见 UI 改动请附截图；涉及 `wrangler.jsonc`、Durable Object bindings、D1 schema、路由或部署行为请在 PR 中特别说明。

## 许可证

本项目使用 GNU General Public License v3.0，详情见 `LICENSE`。
