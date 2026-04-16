import { DurableObject } from 'cloudflare:workers';
import {
  createDefaultRoom,
  LEGACY_SEED_ROOM_IDS,
} from '@shared/game/room-defaults';
import type { RoomPreset } from '@shared/game/room-presets';
import { DEFAULT_ROOM_NAME } from '@shared/game/room-names';
import type { CustomMapData, CustomMapInfo } from '@shared/game/types';
import {
  cloneRoomSummary,
  sanitizeRoomSummary,
  type PlainRoom,
} from './lib/room-summary';

type Env = Cloudflare.Env;
type D1Executor = Pick<D1Database, 'prepare'>;

type RoomRow = {
  id: string;
  room_json: string;
  updated_at: number;
};

type MapRow = {
  id: string;
  name: string;
  width: number;
  height: number;
  creator: string;
  description: string;
  map_tiles_data: string;
  created_at: string;
  views: number;
  star_count: number;
};

type ReplayRow = {
  replay_json: string;
  size_bytes: number;
};

type StarAction = 'increase' | 'decrease';
type StarResult =
  | { ok: true; status: 200 }
  | { ok: false; status: 400 | 404; error: string };

const REPLAY_MAX_BYTES = 150 * 1024;
const textEncoder = new TextEncoder();

const APP_SCHEMA_STATEMENTS = [
  'CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, room_json TEXT NOT NULL, updated_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS maps (id TEXT PRIMARY KEY, name TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, creator TEXT NOT NULL, description TEXT NOT NULL, map_tiles_data TEXT NOT NULL, created_at TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0, star_count INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS stars (user_id TEXT NOT NULL, map_id TEXT NOT NULL, PRIMARY KEY(user_id, map_id))',
  `CREATE TABLE IF NOT EXISTS replays (id TEXT PRIMARY KEY, replay_json TEXT NOT NULL, size_bytes INTEGER NOT NULL CHECK(size_bytes < ${REPLAY_MAX_BYTES}), created_at TEXT NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS idx_rooms_updated_at ON rooms(updated_at)',
  'CREATE INDEX IF NOT EXISTS idx_maps_created_at ON maps(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_maps_views ON maps(views)',
  'CREATE INDEX IF NOT EXISTS idx_maps_star_count ON maps(star_count)',
  'CREATE INDEX IF NOT EXISTS idx_stars_map_id ON stars(map_id)',
  'CREATE INDEX IF NOT EXISTS idx_stars_user_id ON stars(user_id)',
];

function randomId(length = 8) {
  return crypto.randomUUID().replace(/-/g, '').slice(0, length);
}

function mapRowToInfo(map: MapRow): CustomMapInfo {
  return {
    id: map.id,
    name: map.name,
    width: map.width,
    height: map.height,
    creator: map.creator,
    description: map.description,
    createdAt: new Date(map.created_at),
    views: map.views,
    starCount: map.star_count,
  };
}

function byteLength(value: string) {
  return textEncoder.encode(value).byteLength;
}

function hasPlayers(room: PlainRoom) {
  return room.players.length > 0;
}

function hasHumanPlayers(room: PlainRoom) {
  return room.players.some((player) => !player.isBot);
}

export class AppDurableObject extends DurableObject<Env> {
  private initialization: Promise<void> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private async initialize() {
    for (const statement of APP_SCHEMA_STATEMENTS) {
      await this.env.DB.prepare(statement).run();
    }
    await this.cleanupLegacySeedRooms();
  }

  private async ensureInitialized() {
    if (!this.initialization) {
      this.initialization = this.initialize().catch((error) => {
        console.error('AppDurableObject initialization failed', error);
        this.initialization = null;
        throw error;
      });
    }

    await this.initialization;
  }

  private async queryAll<T>(query: string, ...values: unknown[]) {
    const statement = this.env.DB.prepare(query);
    const result =
      values.length > 0
        ? await statement.bind(...values).all<T>()
        : await statement.all<T>();
    return result.results;
  }

  private async queryFirst<T>(query: string, ...values: unknown[]) {
    const statement = this.env.DB.prepare(query);
    return values.length > 0
      ? await statement.bind(...values).first<T>()
      : await statement.first<T>();
  }

  private async execute(query: string, ...values: unknown[]) {
    const statement = this.env.DB.prepare(query);
    if (values.length > 0) {
      await statement.bind(...values).run();
      return;
    }

    await statement.run();
  }

  private async executeBatch(statements: D1PreparedStatement[]) {
    if (statements.length === 0) {
      return;
    }

    await this.env.DB.batch(statements);
  }

  private createSession() {
    return this.env.DB.withSession('first-primary');
  }

  private async reconcileRoomSummary(room: PlainRoom): Promise<PlainRoom | null> {
    const liveRoom = await this.env.ROOMS
      .getByName(room.id)
      .reconcilePersistedSummary(room);

    if (!liveRoom) {
      await this.deleteRoom(room.id);
      return null;
    }

    if (JSON.stringify(room) !== JSON.stringify(liveRoom)) {
      await this.execute(
        'UPDATE rooms SET room_json = ?, updated_at = ? WHERE id = ?',
        JSON.stringify(liveRoom),
        Date.now(),
        liveRoom.id
      );
    }

    return liveRoom;
  }

  private async cleanupLegacySeedRooms() {
    await this.executeBatch(
      LEGACY_SEED_ROOM_IDS.map((roomId) =>
        this.env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(roomId)
      )
    );
  }

  private async getMapRow(
    mapId: string,
    executor: D1Executor = this.env.DB
  ): Promise<MapRow | null> {
    return await executor
      .prepare('SELECT * FROM maps WHERE id = ?')
      .bind(mapId)
      .first<MapRow>();
  }

  async listRooms(): Promise<Record<string, PlainRoom>> {
    await this.ensureInitialized();
    const rows = await this.queryAll<RoomRow>('SELECT id, room_json FROM rooms');
    const rooms: Record<string, PlainRoom> = {};

    for (const row of rows) {
      const room = await this.reconcileRoomSummary(
        JSON.parse(row.room_json) as PlainRoom
      );
      if (room) {
        rooms[row.id] = room;
      }
    }

    return rooms;
  }

  async getRoom(roomId: string): Promise<PlainRoom | null> {
    const room = await this.getStoredRoom(roomId);
    if (!room) {
      return null;
    }

    return await this.reconcileRoomSummary(room);
  }

  async getStoredRoom(roomId: string): Promise<PlainRoom | null> {
    await this.ensureInitialized();
    const row = await this.queryFirst<RoomRow>(
      'SELECT id, room_json FROM rooms WHERE id = ?',
      roomId
    );

    if (!row) {
      return null;
    }

    return sanitizeRoomSummary(JSON.parse(row.room_json) as PlainRoom);
  }

  async upsertRoom(room: PlainRoom): Promise<void> {
    await this.ensureInitialized();
    const sanitizedRoom = sanitizeRoomSummary(room);

    if (
      hasPlayers(room) &&
      (sanitizedRoom.players.length === 0 || !hasHumanPlayers(sanitizedRoom)) &&
      !sanitizedRoom.keepAlive
    ) {
      await this.deleteRoom(sanitizedRoom.id);
      return;
    }

    await this.execute(
      `
        INSERT INTO rooms (id, room_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          room_json = excluded.room_json,
          updated_at = excluded.updated_at
      `,
      sanitizedRoom.id,
      JSON.stringify(sanitizedRoom),
      Date.now()
    );
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.ensureInitialized();
    await this.execute('DELETE FROM rooms WHERE id = ?', roomId);
  }

  async createRoom(roomName = DEFAULT_ROOM_NAME, preset: RoomPreset = 'standard') {
    await this.ensureInitialized();
    const roomId = randomId();
    const room = createDefaultRoom(roomId, roomName, preset);
    await this.upsertRoom(cloneRoomSummary(room));

    return {
      success: true,
      roomId,
    };
  }

  async listMaps(): Promise<CustomMapInfo[]> {
    await this.ensureInitialized();
    return (await this.queryAll<MapRow>('SELECT * FROM maps ORDER BY created_at DESC')).map(
      mapRowToInfo
    );
  }

  async createMap(map: CustomMapData) {
    await this.ensureInitialized();
    await this.execute(
      `
        INSERT INTO maps (
          id, name, width, height, creator, description, map_tiles_data, created_at, views, star_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      `,
      map.id,
      map.name,
      map.width,
      map.height,
      map.creator,
      map.description,
      JSON.stringify(map.mapTilesData),
      new Date().toISOString()
    );

    return { success: true };
  }

  async getMap(mapId: string, incrementViews = true): Promise<CustomMapData | null> {
    await this.ensureInitialized();
    const session = this.createSession();
    const row = await this.getMapRow(mapId, session);

    if (!row) {
      return null;
    }

    if (incrementViews) {
      await session
        .prepare('UPDATE maps SET views = views + 1 WHERE id = ?')
        .bind(mapId)
        .run();
    }

    return {
      id: row.id,
      name: row.name,
      width: row.width,
      height: row.height,
      creator: row.creator,
      description: row.description,
      mapTilesData: JSON.parse(row.map_tiles_data) as CustomMapData['mapTilesData'],
    };
  }

  async updateMap(mapId: string, map: CustomMapData) {
    await this.ensureInitialized();
    const session = this.createSession();
    await session
      .prepare(
        `
          UPDATE maps
          SET name = ?, width = ?, height = ?, creator = ?, description = ?, map_tiles_data = ?
          WHERE id = ?
        `
      )
      .bind(
        map.name,
        map.width,
        map.height,
        map.creator,
        map.description,
        JSON.stringify(map.mapTilesData),
        mapId
      )
      .run();

    const row = await this.getMapRow(mapId, session);
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      width: row.width,
      height: row.height,
      creator: row.creator,
      description: row.description,
      mapTilesData: JSON.parse(row.map_tiles_data) as CustomMapData['mapTilesData'],
    };
  }

  async deleteMap(mapId: string) {
    await this.ensureInitialized();
    await this.executeBatch([
      this.env.DB.prepare('DELETE FROM maps WHERE id = ?').bind(mapId),
      this.env.DB.prepare('DELETE FROM stars WHERE map_id = ?').bind(mapId),
    ]);

    return { success: true };
  }

  async listMapsByOrder(order: 'new' | 'hot' | 'best') {
    await this.ensureInitialized();
    const orderBy =
      order === 'new'
        ? 'created_at DESC'
        : order === 'hot'
          ? 'views DESC'
          : 'star_count DESC';

    return (await this.queryAll<MapRow>(`SELECT * FROM maps ORDER BY ${orderBy} LIMIT 25`)).map(
      mapRowToInfo
    );
  }

  async searchMaps(term: string) {
    await this.ensureInitialized();
    return (
      await this.queryAll<MapRow>(
        `
          SELECT * FROM maps
          WHERE name LIKE '%' || ? || '%' OR id = ?
          ORDER BY created_at DESC
          LIMIT 25
        `,
        term,
        term
      )
    ).map(mapRowToInfo);
  }

  async toggleStar(userId: string, mapId: string, action: StarAction): Promise<StarResult> {
    await this.ensureInitialized();
    const session = this.createSession();
    const map = await this.getMapRow(mapId, session);
    if (!map) {
      return { ok: false, status: 404, error: 'Map not found' };
    }

    const existing = await session
      .prepare('SELECT user_id FROM stars WHERE user_id = ? AND map_id = ?')
      .bind(userId, mapId)
      .first<{ user_id: string }>();

    if (action === 'increase') {
      if (existing) {
        return { ok: false, status: 400, error: 'You have already starred this map' };
      }

      await session
        .prepare('INSERT INTO stars (user_id, map_id) VALUES (?, ?)')
        .bind(userId, mapId)
        .run();
      await session
        .prepare('UPDATE maps SET star_count = star_count + 1 WHERE id = ?')
        .bind(mapId)
        .run();
      return { ok: true, status: 200 };
    }

    if (!existing) {
      return { ok: false, status: 400, error: 'You have not starred this map yet' };
    }

    await session
      .prepare('DELETE FROM stars WHERE user_id = ? AND map_id = ?')
      .bind(userId, mapId)
      .run();
    await session
      .prepare('UPDATE maps SET star_count = MAX(star_count - 1, 0) WHERE id = ?')
      .bind(mapId)
      .run();
    return { ok: true, status: 200 };
  }

  async getStarredMaps(userId: string) {
    await this.ensureInitialized();
    return (
      await this.queryAll<{ map_id: string }>(
        'SELECT map_id FROM stars WHERE user_id = ?',
        userId
      )
    ).map((row) => row.map_id);
  }

  async saveReplay(replay: unknown): Promise<string | null> {
    await this.ensureInitialized();
    const replayJson = JSON.stringify(replay);
    const sizeBytes = byteLength(replayJson);

    if (sizeBytes >= REPLAY_MAX_BYTES) {
      console.warn('Skipping oversized replay', {
        sizeBytes,
        limitBytes: REPLAY_MAX_BYTES,
      });
      return null;
    }

    const replayId = randomId(10);
    await this.execute(
      `
        INSERT INTO replays (id, replay_json, size_bytes, created_at)
        VALUES (?, ?, ?, ?)
      `,
      replayId,
      replayJson,
      sizeBytes,
      new Date().toISOString()
    );
    return replayId;
  }

  async getReplay(replayId: string) {
    await this.ensureInitialized();
    const row = await this.queryFirst<ReplayRow>(
      'SELECT replay_json, size_bytes FROM replays WHERE id = ?',
      replayId
    );

    if (!row) {
      return null;
    }

    return JSON.parse(row.replay_json) as unknown;
  }
}
