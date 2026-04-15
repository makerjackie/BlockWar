import { DurableObject } from 'cloudflare:workers';
import { createDefaultRoom, seedRoomIds } from '@shared/game/room-defaults';
import type {
  CustomMapData,
  CustomMapInfo,
} from '@shared/game/types';
import { cloneRoomSummary, type PlainRoom } from './lib/room-summary';

type Env = Cloudflare.Env;

type RoomRow = {
  id: string;
  room_json: string;
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
};

type StarAction = 'increase' | 'decrease';

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

export class AppDurableObject extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          room_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS maps (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          creator TEXT NOT NULL,
          description TEXT NOT NULL,
          map_tiles_data TEXT NOT NULL,
          created_at TEXT NOT NULL,
          views INTEGER NOT NULL DEFAULT 0,
          star_count INTEGER NOT NULL DEFAULT 0
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS stars (
          user_id TEXT NOT NULL,
          map_id TEXT NOT NULL,
          PRIMARY KEY(user_id, map_id)
        );
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS replays (
          id TEXT PRIMARY KEY,
          replay_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      for (const roomId of seedRoomIds) {
        const room = createDefaultRoom(roomId);
        this.ctx.storage.sql.exec(
          `
            INSERT INTO rooms (id, room_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO NOTHING
          `,
          room.id,
          JSON.stringify(room),
          Date.now()
        );
      }
    });
  }

  async listRooms(): Promise<Record<string, PlainRoom>> {
    const rows = this.ctx.storage.sql
      .exec<RoomRow>('SELECT id, room_json FROM rooms')
      .toArray();

    return rows.reduce<Record<string, PlainRoom>>((acc, row) => {
      acc[row.id] = JSON.parse(row.room_json) as PlainRoom;
      return acc;
    }, {});
  }

  async getRoom(roomId: string): Promise<PlainRoom | null> {
    const row = this.ctx.storage.sql
      .exec<RoomRow>('SELECT id, room_json FROM rooms WHERE id = ?', roomId)
      .toArray()[0];

    if (!row) {
      return null;
    }

    return JSON.parse(row.room_json) as PlainRoom;
  }

  async upsertRoom(room: PlainRoom): Promise<void> {
    this.ctx.storage.sql.exec(
      `
        INSERT INTO rooms (id, room_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          room_json = excluded.room_json,
          updated_at = excluded.updated_at
      `,
      room.id,
      JSON.stringify(room),
      Date.now()
    );
  }

  async deleteRoom(roomId: string): Promise<void> {
    if (seedRoomIds.includes(roomId)) {
      const room = createDefaultRoom(roomId);
      this.ctx.storage.sql.exec(
        'UPDATE rooms SET room_json = ?, updated_at = ? WHERE id = ?',
        JSON.stringify(cloneRoomSummary(room)),
        Date.now(),
        roomId
      );
      return;
    }

    this.ctx.storage.sql.exec('DELETE FROM rooms WHERE id = ?', roomId);
  }

  async createRoom(roomName = 'Untitled') {
    const roomId = randomId();
    const room = createDefaultRoom(roomId, roomName);
    await this.upsertRoom(cloneRoomSummary(room));

    return {
      success: true,
      roomId,
    };
  }

  async listMaps(): Promise<CustomMapInfo[]> {
    return this.ctx.storage.sql
      .exec<MapRow>('SELECT * FROM maps ORDER BY created_at DESC')
      .toArray()
      .map(mapRowToInfo);
  }

  async createMap(map: CustomMapData) {
    this.ctx.storage.sql.exec(
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
    const row = this.ctx.storage.sql
      .exec<MapRow>('SELECT * FROM maps WHERE id = ?', mapId)
      .toArray()[0];

    if (!row) {
      return null;
    }

    if (incrementViews) {
      this.ctx.storage.sql.exec(
        'UPDATE maps SET views = views + 1 WHERE id = ?',
        mapId
      );
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
    this.ctx.storage.sql.exec(
      `
        UPDATE maps
        SET name = ?, width = ?, height = ?, creator = ?, description = ?, map_tiles_data = ?
        WHERE id = ?
      `,
      map.name,
      map.width,
      map.height,
      map.creator,
      map.description,
      JSON.stringify(map.mapTilesData),
      mapId
    );

    return await this.getMap(mapId, false);
  }

  async deleteMap(mapId: string) {
    this.ctx.storage.sql.exec('DELETE FROM maps WHERE id = ?', mapId);
    this.ctx.storage.sql.exec('DELETE FROM stars WHERE map_id = ?', mapId);
    return { success: true };
  }

  async listMapsByOrder(order: 'new' | 'hot' | 'best') {
    const orderBy =
      order === 'new'
        ? 'created_at DESC'
        : order === 'hot'
          ? 'views DESC'
          : 'star_count DESC';

    return this.ctx.storage.sql
      .exec<MapRow>(`SELECT * FROM maps ORDER BY ${orderBy} LIMIT 25`)
      .toArray()
      .map(mapRowToInfo);
  }

  async searchMaps(term: string) {
    return this.ctx.storage.sql
      .exec<MapRow>(
        `
          SELECT * FROM maps
          WHERE name LIKE '%' || ? || '%' OR id = ?
          ORDER BY created_at DESC
          LIMIT 25
        `,
        term,
        term
      )
      .toArray()
      .map(mapRowToInfo);
  }

  async toggleStar(userId: string, mapId: string, action: StarAction) {
    const existing = this.ctx.storage.sql
      .exec<{ user_id: string }>(
        'SELECT user_id FROM stars WHERE user_id = ? AND map_id = ?',
        userId,
        mapId
      )
      .toArray()[0];

    if (action === 'increase') {
      if (existing) {
        return { ok: false, status: 400, error: 'You have already starred this map' };
      }
      this.ctx.storage.sql.exec(
        'INSERT INTO stars (user_id, map_id) VALUES (?, ?)',
        userId,
        mapId
      );
      this.ctx.storage.sql.exec(
        'UPDATE maps SET star_count = star_count + 1 WHERE id = ?',
        mapId
      );
      return { ok: true, status: 200 };
    }

    if (!existing) {
      return { ok: false, status: 400, error: 'You have not starred this map yet' };
    }

    this.ctx.storage.sql.exec(
      'DELETE FROM stars WHERE user_id = ? AND map_id = ?',
      userId,
      mapId
    );
    this.ctx.storage.sql.exec(
      'UPDATE maps SET star_count = MAX(star_count - 1, 0) WHERE id = ?',
      mapId
    );
    return { ok: true, status: 200 };
  }

  async getStarredMaps(userId: string) {
    return this.ctx.storage.sql
      .exec<{ map_id: string }>(
        'SELECT map_id FROM stars WHERE user_id = ?',
        userId
      )
      .toArray()
      .map((row) => row.map_id);
  }

  async saveReplay(replay: unknown): Promise<string> {
    const replayId = randomId(10);
    this.ctx.storage.sql.exec(
      `
        INSERT INTO replays (id, replay_json, created_at)
        VALUES (?, ?, ?)
      `,
      replayId,
      JSON.stringify(replay),
      new Date().toISOString()
    );
    return replayId;
  }

  async getReplay(replayId: string) {
    const row = this.ctx.storage.sql
      .exec<ReplayRow>('SELECT replay_json FROM replays WHERE id = ?', replayId)
      .toArray()[0];

    if (!row) {
      return null;
    }

    return JSON.parse(row.replay_json) as unknown;
  }
}
