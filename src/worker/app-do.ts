import { DurableObject } from 'cloudflare:workers';
import {
  createDefaultRoom,
  LEGACY_SEED_ROOM_IDS,
} from '@shared/game/room-defaults';
import type { RoomPreset } from '@shared/game/room-presets';
import { DEFAULT_ROOM_NAME } from '@shared/game/room-names';
import { TileType, type CustomMapData, type CustomMapInfo } from '@shared/game/types';
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

type SessionRow = {
  id: string;
  token: string;
  username: string;
};

type MapOwnerRow = {
  map_id: string;
  session_id: string;
};

type RoomPlayerTokenRow = {
  player_id: string;
};

type SessionIdentity = {
  id: string;
  token: string;
  username: string;
};

type StarAction = 'increase' | 'decrease';
type StarResult =
  | { ok: true; status: 200 }
  | { ok: false; status: 400 | 404; error: string };

type MutationResult<T> =
  | { ok: true; status: 200; value: T }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

type CustomMapValidationResult =
  | { ok: true; value: CustomMapData }
  | { ok: false; error: string };

const REPLAY_MAX_BYTES = 150 * 1024;
const MAX_USERNAME_LENGTH = 20;
const MAX_CUSTOM_MAP_ID_LENGTH = 64;
const MAX_CUSTOM_MAP_NAME_LENGTH = 80;
const MAX_CUSTOM_MAP_DESCRIPTION_LENGTH = 2_000;
const MAX_CUSTOM_MAP_SIDE = 40;
const MAX_CUSTOM_MAP_CELLS = MAX_CUSTOM_MAP_SIDE * MAX_CUSTOM_MAP_SIDE;
const MAX_CUSTOM_TILE_UNITS = 999_999;
const MAX_CUSTOM_TILE_PRIORITY = 999_999;
const UNSAFE_NAME_CHARS = /[<>&"'`]/g;
const VALID_CUSTOM_TILE_TYPES = new Set<number>([
  TileType.King,
  TileType.City,
  TileType.Fog,
  TileType.Obstacle,
  TileType.Plain,
  TileType.Mountain,
  TileType.Swamp,
]);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const COMPRESSED_REPLAY_PREFIX = 'gz:';

const APP_SCHEMA_STATEMENTS = [
  'CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, room_json TEXT NOT NULL, updated_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS maps (id TEXT PRIMARY KEY, name TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, creator TEXT NOT NULL, description TEXT NOT NULL, map_tiles_data TEXT NOT NULL, created_at TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0, star_count INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS map_owners (map_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, created_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS stars (user_id TEXT NOT NULL, map_id TEXT NOT NULL, PRIMARY KEY(user_id, map_id))',
  'CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, username TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS room_player_tokens (token TEXT PRIMARY KEY, room_id TEXT NOT NULL, player_id TEXT NOT NULL, session_id TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, UNIQUE(room_id, player_id))',
  `CREATE TABLE IF NOT EXISTS replays (id TEXT PRIMARY KEY, replay_json TEXT NOT NULL, size_bytes INTEGER NOT NULL CHECK(size_bytes < ${REPLAY_MAX_BYTES}), created_at TEXT NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS idx_rooms_updated_at ON rooms(updated_at)',
  'CREATE INDEX IF NOT EXISTS idx_maps_created_at ON maps(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_maps_views ON maps(views)',
  'CREATE INDEX IF NOT EXISTS idx_maps_star_count ON maps(star_count)',
  'CREATE INDEX IF NOT EXISTS idx_map_owners_session_id ON map_owners(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_stars_map_id ON stars(map_id)',
  'CREATE INDEX IF NOT EXISTS idx_stars_user_id ON stars(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
  'CREATE INDEX IF NOT EXISTS idx_room_player_tokens_session_id ON room_player_tokens(session_id)',
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

function sanitizeUsername(value: string | null | undefined) {
  const raw = (value ?? '').trim().slice(0, MAX_USERNAME_LENGTH);
  const escaped = raw.replace(UNSAFE_NAME_CHARS, '');
  return escaped.length > 0 ? escaped : '';
}

function validateCustomMapData(
  value: unknown,
  creator: string,
  mapIdOverride?: string
): CustomMapValidationResult {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'Invalid map payload' };
  }

  const input = value as Partial<CustomMapData>;
  const idSource = mapIdOverride ?? input.id;
  const id = typeof idSource === 'string' ? idSource.trim() : '';
  const name = typeof input.name === 'string'
    ? input.name.trim().slice(0, MAX_CUSTOM_MAP_NAME_LENGTH)
    : '';
  const description = typeof input.description === 'string'
    ? input.description.trim().slice(0, MAX_CUSTOM_MAP_DESCRIPTION_LENGTH)
    : '';

  if (!id || id.length > MAX_CUSTOM_MAP_ID_LENGTH) {
    return { ok: false, error: 'Invalid map id' };
  }
  if (!name) {
    return { ok: false, error: 'Map name cannot be empty' };
  }

  const normalizedWidth = Number(input.width);
  const normalizedHeight = Number(input.height);
  if (
    !Number.isSafeInteger(normalizedWidth) ||
    !Number.isSafeInteger(normalizedHeight) ||
    normalizedWidth < 1 ||
    normalizedHeight < 1 ||
    normalizedWidth > MAX_CUSTOM_MAP_SIDE ||
    normalizedHeight > MAX_CUSTOM_MAP_SIDE ||
    normalizedWidth * normalizedHeight > MAX_CUSTOM_MAP_CELLS
  ) {
    return { ok: false, error: 'Invalid map size' };
  }

  if (!Array.isArray(input.mapTilesData) || input.mapTilesData.length !== normalizedWidth) {
    return { ok: false, error: 'Map tile data does not match width' };
  }

  const mapTilesData: CustomMapData['mapTilesData'] = [];

  for (let x = 0; x < normalizedWidth; x += 1) {
    const column = input.mapTilesData[x];
    if (!Array.isArray(column) || column.length !== normalizedHeight) {
      return { ok: false, error: 'Map tile data does not match height' };
    }

    const sanitizedColumn: CustomMapData['mapTilesData'][number] = [];
    for (let y = 0; y < normalizedHeight; y += 1) {
      const tile = column[y];
      if (!Array.isArray(tile) || tile.length !== 5) {
        return { ok: false, error: 'Invalid tile payload' };
      }

      const [tileType, team, unitsCount, isAlwaysRevealed, priority] = tile;
      if (!Number.isSafeInteger(tileType) || !VALID_CUSTOM_TILE_TYPES.has(tileType)) {
        return { ok: false, error: 'Invalid tile type' };
      }
      if (team !== null && !Number.isSafeInteger(team)) {
        return { ok: false, error: 'Invalid tile owner' };
      }
      if (
        !Number.isSafeInteger(unitsCount) ||
        unitsCount < 0 ||
        unitsCount > MAX_CUSTOM_TILE_UNITS
      ) {
        return { ok: false, error: 'Invalid tile unit count' };
      }
      if (typeof isAlwaysRevealed !== 'boolean') {
        return { ok: false, error: 'Invalid visibility flag' };
      }
      if (
        !Number.isSafeInteger(priority) ||
        priority < 0 ||
        priority > MAX_CUSTOM_TILE_PRIORITY
      ) {
        return { ok: false, error: 'Invalid king priority' };
      }

      sanitizedColumn.push([
        tileType as TileType,
        team as number | null,
        unitsCount,
        isAlwaysRevealed,
        priority,
      ]);
    }

    mapTilesData.push(sanitizedColumn);
  }

  return {
    ok: true,
    value: {
      id,
      name,
      width: normalizedWidth,
      height: normalizedHeight,
      creator,
      description,
      mapTilesData,
    },
  };
}

function parseStoredCustomMap(row: MapRow): CustomMapData | null {
  try {
    const result = validateCustomMapData(
      {
        id: row.id,
        name: row.name,
        width: row.width,
        height: row.height,
        creator: row.creator,
        description: row.description,
        mapTilesData: JSON.parse(row.map_tiles_data) as unknown,
      },
      row.creator,
      row.id
    );

    if (!result.ok) {
      console.warn('Skipping invalid stored map payload', {
        mapId: row.id,
        reason: result.error,
      });
      return null;
    }

    return result.value;
  } catch (error) {
    console.warn('Failed to parse stored map payload', {
      mapId: row.id,
      error,
    });
    return null;
  }
}

function byteLength(value: string) {
  return textEncoder.encode(value).byteLength;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function compressReplayJson(value: string) {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  await writer.write(textEncoder.encode(value));
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function decompressReplayJson(value: string) {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  await writer.write(base64ToBytes(value));
  await writer.close();
  return textDecoder.decode(await new Response(stream.readable).arrayBuffer());
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

  private createDbSession() {
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

  private async getMapOwnerRow(
    mapId: string,
    executor: D1Executor = this.env.DB
  ): Promise<MapOwnerRow | null> {
    return await executor
      .prepare('SELECT map_id, session_id FROM map_owners WHERE map_id = ?')
      .bind(mapId)
      .first<MapOwnerRow>();
  }

  private async getSessionRowByToken(
    token: string,
    executor: D1Executor = this.env.DB
  ): Promise<SessionRow | null> {
    return await executor
      .prepare('SELECT id, token, username FROM sessions WHERE token = ?')
      .bind(token)
      .first<SessionRow>();
  }

  private async touchSessionRow(sessionId: string, username?: string) {
    if (username) {
      await this.execute(
        'UPDATE sessions SET username = ?, last_seen_at = ? WHERE id = ?',
        username,
        new Date().toISOString(),
        sessionId
      );
      return;
    }

    await this.execute(
      'UPDATE sessions SET last_seen_at = ? WHERE id = ?',
      new Date().toISOString(),
      sessionId
    );
  }

  async ensureSession(token: string | null | undefined, username: string): Promise<SessionIdentity> {
    await this.ensureInitialized();
    const sanitizedUsername = sanitizeUsername(username);

    if (!sanitizedUsername) {
      throw new Error('Username is required');
    }

    const normalizedToken = token?.trim() ?? '';
    if (normalizedToken) {
      const existing = await this.getSessionRowByToken(normalizedToken);
      if (existing) {
        const nextUsername =
          existing.username === sanitizedUsername ? undefined : sanitizedUsername;
        await this.touchSessionRow(existing.id, nextUsername);
        return {
          id: existing.id,
          token: existing.token,
          username: nextUsername ?? existing.username,
        };
      }
    }

    const now = new Date().toISOString();
    const session = {
      id: randomId(16),
      token: crypto.randomUUID(),
      username: sanitizedUsername,
    };
    await this.execute(
      `
        INSERT INTO sessions (id, token, username, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      session.id,
      session.token,
      session.username,
      now,
      now
    );

    return session;
  }

  async getSession(token: string | null | undefined): Promise<SessionIdentity | null> {
    await this.ensureInitialized();
    const normalizedToken = token?.trim() ?? '';
    if (!normalizedToken) {
      return null;
    }

    const session = await this.getSessionRowByToken(normalizedToken);
    if (!session) {
      return null;
    }

    await this.touchSessionRow(session.id);
    return session;
  }

  async issueReconnectToken(
    sessionId: string,
    roomId: string,
    playerId: string
  ): Promise<string> {
    await this.ensureInitialized();
    const token = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.execute(
      `
        INSERT INTO room_player_tokens (
          token, room_id, player_id, session_id, created_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(room_id, player_id) DO UPDATE SET
          token = excluded.token,
          session_id = excluded.session_id,
          last_seen_at = excluded.last_seen_at
      `,
      token,
      roomId,
      playerId,
      sessionId,
      now,
      now
    );

    return token;
  }

  async resolveReconnectToken(
    token: string | null | undefined,
    roomId: string,
    sessionId: string
  ): Promise<string | null> {
    await this.ensureInitialized();
    const normalizedToken = token?.trim() ?? '';
    if (!normalizedToken) {
      return null;
    }

    const row = await this.queryFirst<RoomPlayerTokenRow>(
      `
        SELECT player_id
        FROM room_player_tokens
        WHERE token = ? AND room_id = ? AND session_id = ?
      `,
      normalizedToken,
      roomId,
      sessionId
    );

    if (!row) {
      return null;
    }

    await this.execute(
      'UPDATE room_player_tokens SET last_seen_at = ? WHERE token = ?',
      new Date().toISOString(),
      normalizedToken
    );

    return row.player_id;
  }

  async revokeReconnectToken(roomId: string, playerId: string): Promise<void> {
    await this.ensureInitialized();
    await this.execute(
      'DELETE FROM room_player_tokens WHERE room_id = ? AND player_id = ?',
      roomId,
      playerId
    );
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

  async createMap(
    map: unknown,
    sessionId: string,
    creator: string
  ): Promise<MutationResult<{ success: true }>> {
    await this.ensureInitialized();
    const validated = validateCustomMapData(map, creator);
    if (!validated.ok) {
      return { ok: false, status: 400, error: validated.error };
    }

    const existing = await this.getMapRow(validated.value.id);
    if (existing) {
      return { ok: false, status: 409, error: 'Map id already exists' };
    }

    const now = new Date().toISOString();
    await this.executeBatch([
      this.env.DB.prepare(
        `
          INSERT INTO maps (
            id, name, width, height, creator, description, map_tiles_data, created_at, views, star_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
        `
      ).bind(
        validated.value.id,
        validated.value.name,
        validated.value.width,
        validated.value.height,
        validated.value.creator,
        validated.value.description,
        JSON.stringify(validated.value.mapTilesData),
        now
      ),
      this.env.DB.prepare(
        'INSERT INTO map_owners (map_id, session_id, created_at) VALUES (?, ?, ?)'
      ).bind(validated.value.id, sessionId, now),
    ]);

    return { ok: true, status: 200, value: { success: true } };
  }

  async getMap(mapId: string, incrementViews = true): Promise<CustomMapData | null> {
    await this.ensureInitialized();
    const session = this.createDbSession();
    const row = await this.getMapRow(mapId, session);

    if (!row) {
      return null;
    }

    const map = parseStoredCustomMap(row);
    if (!map) {
      return null;
    }

    if (incrementViews) {
      await session
        .prepare('UPDATE maps SET views = views + 1 WHERE id = ?')
        .bind(mapId)
        .run();
    }

    return map;
  }

  async updateMap(
    mapId: string,
    map: unknown,
    sessionId: string,
    creator: string
  ): Promise<MutationResult<CustomMapData>> {
    await this.ensureInitialized();
    const validated = validateCustomMapData(map, creator, mapId);
    if (!validated.ok) {
      return { ok: false, status: 400, error: validated.error };
    }

    const session = this.createDbSession();
    const row = await this.getMapRow(mapId, session);
    if (!row) {
      return { ok: false, status: 404, error: 'Map not found' };
    }

    const owner = await this.getMapOwnerRow(mapId, session);
    if (!owner || owner.session_id !== sessionId) {
      return { ok: false, status: 403, error: 'You do not own this map' };
    }

    await session
      .prepare(
        `
          UPDATE maps
          SET name = ?, width = ?, height = ?, creator = ?, description = ?, map_tiles_data = ?
          WHERE id = ?
        `
      )
      .bind(
        validated.value.name,
        validated.value.width,
        validated.value.height,
        validated.value.creator,
        validated.value.description,
        JSON.stringify(validated.value.mapTilesData),
        mapId
      )
      .run();

    return { ok: true, status: 200, value: validated.value };
  }

  async deleteMap(
    mapId: string,
    sessionId: string
  ): Promise<MutationResult<{ success: true }>> {
    await this.ensureInitialized();
    const map = await this.getMapRow(mapId);
    if (!map) {
      return { ok: false, status: 404, error: 'Map not found' };
    }

    const owner = await this.getMapOwnerRow(mapId);
    if (!owner || owner.session_id !== sessionId) {
      return { ok: false, status: 403, error: 'You do not own this map' };
    }

    await this.executeBatch([
      this.env.DB.prepare('DELETE FROM maps WHERE id = ?').bind(mapId),
      this.env.DB.prepare('DELETE FROM map_owners WHERE map_id = ?').bind(mapId),
      this.env.DB.prepare('DELETE FROM stars WHERE map_id = ?').bind(mapId),
    ]);

    return { ok: true, status: 200, value: { success: true } };
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
    const normalizedTerm = term.trim();
    if (!normalizedTerm) {
      return [];
    }

    return (
      await this.queryAll<MapRow>(
        `
          SELECT * FROM maps
          WHERE name LIKE '%' || ? || '%' OR id = ?
          ORDER BY created_at DESC
          LIMIT 25
        `,
        normalizedTerm,
        normalizedTerm
      )
    ).map(mapRowToInfo);
  }

  async toggleStar(sessionId: string, mapId: string, action: StarAction): Promise<StarResult> {
    await this.ensureInitialized();
    const session = this.createDbSession();
    const map = await this.getMapRow(mapId, session);
    if (!map) {
      return { ok: false, status: 404, error: 'Map not found' };
    }

    const existing = await session
      .prepare('SELECT user_id FROM stars WHERE user_id = ? AND map_id = ?')
      .bind(sessionId, mapId)
      .first<{ user_id: string }>();

    if (action === 'increase') {
      if (existing) {
        return { ok: false, status: 400, error: 'You have already starred this map' };
      }

      await session
        .prepare('INSERT INTO stars (user_id, map_id) VALUES (?, ?)')
        .bind(sessionId, mapId)
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
      .bind(sessionId, mapId)
      .run();
    await session
      .prepare('UPDATE maps SET star_count = MAX(star_count - 1, 0) WHERE id = ?')
      .bind(mapId)
      .run();
    return { ok: true, status: 200 };
  }

  async getStarredMaps(sessionId: string) {
    await this.ensureInitialized();
    return (
      await this.queryAll<{ map_id: string }>(
        'SELECT map_id FROM stars WHERE user_id = ?',
        sessionId
      )
    ).map((row) => row.map_id);
  }

  async saveReplay(replay: unknown): Promise<string | null> {
    await this.ensureInitialized();
    const replayJson = JSON.stringify(replay);
    const compressedReplay = await compressReplayJson(replayJson);
    const sizeBytes = compressedReplay.byteLength;

    if (sizeBytes >= REPLAY_MAX_BYTES) {
      console.warn('Skipping oversized replay', {
        rawSizeBytes: byteLength(replayJson),
        sizeBytes,
        limitBytes: REPLAY_MAX_BYTES,
      });
      return null;
    }

    const replayPayload = `${COMPRESSED_REPLAY_PREFIX}${bytesToBase64(compressedReplay)}`;

    const replayId = randomId(10);
    await this.execute(
      `
        INSERT INTO replays (id, replay_json, size_bytes, created_at)
        VALUES (?, ?, ?, ?)
      `,
      replayId,
      replayPayload,
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

    if (row.replay_json.startsWith(COMPRESSED_REPLAY_PREFIX)) {
      const replayJson = await decompressReplayJson(
        row.replay_json.slice(COMPRESSED_REPLAY_PREFIX.length)
      );
      return JSON.parse(replayJson) as unknown;
    }

    return JSON.parse(row.replay_json) as unknown;
  }
}
