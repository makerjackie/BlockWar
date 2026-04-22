import { describe, expect, it } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import { createDefaultRoom } from '@shared/game/room-defaults';
import type { AppDurableObject } from '../src/worker/app-do';
import { cloneRoomSummary } from '../src/worker/lib/room-summary';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Cloudflare.Env {}
}

describe('AppDurableObject', () => {
  it('defaults legacy room summaries to the standard preset', async () => {
    const stub = env.APP.getByName(`app-${crypto.randomUUID().slice(0, 8)}`);
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;

    await runInDurableObject(stub, async (instance: AppDurableObject) => {
      const room = cloneRoomSummary(createDefaultRoom(roomId));
      delete room.preset;

      await (instance as any).ensureInitialized();
      await (instance as any).execute(
        'INSERT INTO rooms (id, room_json, updated_at) VALUES (?, ?, ?)',
        room.id,
        JSON.stringify(room),
        Date.now()
      );

      const rooms = await instance.listRooms();
      expect(rooms[roomId]?.preset).toBe('standard');
    });
  });

  it('removes stale custom rooms that have no live sockets', async () => {
    const stub = env.APP.getByName(`app-${crypto.randomUUID().slice(0, 8)}`);
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;

    await runInDurableObject(stub, async (instance: AppDurableObject) => {
      const room = cloneRoomSummary(createDefaultRoom(roomId));
      room.players = Array.from({ length: room.maxPlayers }, (_, index) => ({
        id: `player-${index}`,
        socket_id: `stale-socket-${index}`,
        username: `Player ${index}`,
        color: index + 1,
        team: index + 1,
        disconnected: false,
      }));

      await (instance as any).ensureInitialized();
      await (instance as any).execute(
        'INSERT INTO rooms (id, room_json, updated_at) VALUES (?, ?, ?)',
        room.id,
        JSON.stringify(room),
        Date.now()
      );

      const rooms = await instance.listRooms();
      expect(rooms[roomId]).toBeUndefined();
      expect(await instance.getRoom(roomId)).toBeNull();
    });
  });

  it('resets stale keep-alive rooms that have no live sockets', async () => {
    const stub = env.APP.getByName(`app-${crypto.randomUUID().slice(0, 8)}`);
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;

    await runInDurableObject(stub, async (instance: AppDurableObject) => {
      const room = cloneRoomSummary(createDefaultRoom(roomId));
      room.keepAlive = true;
      room.players = [
        {
          id: 'player-a',
          socket_id: 'stale-socket-a',
          username: 'Alice',
          color: 1,
          team: 1,
          disconnected: false,
        },
      ];

      await (instance as any).ensureInitialized();
      await (instance as any).execute(
        'INSERT INTO rooms (id, room_json, updated_at) VALUES (?, ?, ?)',
        room.id,
        JSON.stringify(room),
        Date.now()
      );

      const rooms = await instance.listRooms();
      expect(rooms[roomId]?.players).toHaveLength(0);
      expect(rooms[roomId]?.gameStarted).toBe(false);
      expect(await instance.getRoom(roomId)).toMatchObject({
        id: roomId,
        keepAlive: true,
        players: [],
      });
    });
  });

  it('removes stale custom rooms that only contain disconnected players', async () => {
    const stub = env.APP.getByName(`app-${crypto.randomUUID().slice(0, 8)}`);
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;

    await runInDurableObject(stub, async (instance: AppDurableObject) => {
      const room = cloneRoomSummary(createDefaultRoom(roomId));
      room.gameStarted = true;
      room.mapGenerated = true;
      room.forceStartNum = 2;
      room.players = [
        {
          id: 'player-a',
          socket_id: 'socket-a',
          username: 'Alice',
          color: 1,
          team: 1,
          forceStart: true,
          disconnected: true,
        },
        {
          id: 'player-b',
          socket_id: 'socket-b',
          username: 'Bob',
          color: 2,
          team: 2,
          forceStart: true,
          disconnected: true,
        },
      ];

      await (instance as any).ensureInitialized();
      await (instance as any).execute(
        'INSERT INTO rooms (id, room_json, updated_at) VALUES (?, ?, ?)',
        room.id,
        JSON.stringify(room),
        Date.now()
      );

      const rooms = await instance.listRooms();
      expect(rooms[roomId]).toBeUndefined();
      expect(await instance.getRoom(roomId)).toBeNull();
    });
  });

  it('stores small replays in D1', async () => {
    const stub = env.APP.getByName(`app-${crypto.randomUUID().slice(0, 8)}`);

    await runInDurableObject(stub, async (instance: AppDurableObject) => {
      const replay = {
        players: [{ id: 'player-1', username: 'Alice' }],
        mapWidth: 4,
        mapHeight: 4,
        gameRecordTurns: [{ data: [16], turn: 1, lead: [] }],
        messagesRecord: [{ player: null, content: 'welcome', turn: 1 }],
      };

      const replayId = await instance.saveReplay(replay);
      expect(replayId).toHaveLength(10);
      expect(await instance.getReplay(replayId!)).toEqual(replay);
    });
  });

  it('stores replays that exceed the raw limit but compress below it', async () => {
    const stub = env.APP.getByName(`app-${crypto.randomUUID().slice(0, 8)}`);

    await runInDurableObject(stub, async (instance: AppDurableObject) => {
      const replay = {
        payload: 'x'.repeat(220 * 1024),
      };

      const replayId = await instance.saveReplay(replay);
      expect(replayId).toHaveLength(10);
      expect(await instance.getReplay(replayId!)).toEqual(replay);
    });
  });

  it('drops replays that are still oversized after compression', async () => {
    const stub = env.APP.getByName(`app-${crypto.randomUUID().slice(0, 8)}`);

    await runInDurableObject(stub, async (instance: AppDurableObject) => {
      const bytes = new Uint8Array(160 * 1024);
      for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
        crypto.getRandomValues(bytes.subarray(offset, offset + 64 * 1024));
      }
      const payload = Array.from(bytes, (value) =>
        value.toString(16).padStart(2, '0')
      ).join('');
      const replayId = await instance.saveReplay({ payload });

      expect(replayId).toBeNull();
    });
  });

  it('scopes reconnect tokens to the issuing session and room', async () => {
    const stub = env.APP.getByName(`app-${crypto.randomUUID().slice(0, 8)}`);

    await runInDurableObject(stub, async (instance: AppDurableObject) => {
      const ownerSession = await instance.ensureSession(null, 'Alice');
      const otherSession = await instance.ensureSession(null, 'Bob');
      const token = await instance.issueReconnectToken(
        ownerSession.id,
        'room-alpha',
        'player-a'
      );

      expect(
        await instance.resolveReconnectToken(token, 'room-alpha', ownerSession.id)
      ).toBe('player-a');
      expect(
        await instance.resolveReconnectToken(token, 'room-beta', ownerSession.id)
      ).toBeNull();
      expect(
        await instance.resolveReconnectToken(token, 'room-alpha', otherSession.id)
      ).toBeNull();

      await instance.revokeReconnectToken('room-alpha', 'player-a');
      expect(
        await instance.resolveReconnectToken(token, 'room-alpha', ownerSession.id)
      ).toBeNull();
    });
  });
});
