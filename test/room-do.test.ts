import { describe, expect, it } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import { DEFAULT_ROOM_NAME, formatCreatorRoomName } from '@shared/game/room-names';
import Player from '@shared/game/player';
import type { RoomDurableObject } from '../src/worker/room-do';
import { cloneRoomSummary } from '../src/worker/lib/room-summary';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Cloudflare.Env {}
}

type CapturedEvent = {
  connectionId: string;
  event: string;
  data: unknown[];
};

function captureEvents(instance: RoomDurableObject) {
  const events: CapturedEvent[] = [];
  (instance as any).send = (
    connectionId: string,
    event: string,
    ...data: unknown[]
  ) => {
    events.push({ connectionId, event, data });
  };
  (instance as any).broadcast = (event: string, ...data: unknown[]) => {
    events.push({ connectionId: '*', event, data });
  };
  return events;
}

async function createStartedRoom(instance: RoomDurableObject, roomId: string) {
  const events = captureEvents(instance);
  const room = await (instance as any).ensureRoom(roomId);
  room.players.push(
    new Player('player-a', 'socket-a', 'Alice', 1, 1),
    new Player('player-b', 'socket-b', 'Bob', 2, 2)
  );

  await (instance as any).syncRoomSummary();
  await (instance as any).startGame();
  (instance as any).clearGameLoop();
  events.length = 0;

  return { events, room };
}

describe('RoomDurableObject', () => {
  it('starts a game and advances turns', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(
          new Player('player-a', 'socket-a', 'Alice', 1, 1),
          new Player('player-b', 'socket-b', 'Bob', 2, 2)
        );

        await (instance as any).syncRoomSummary();
        await (instance as any).startGame();

        expect(room.gameStarted).toBe(true);
        expect(room.map).toBeTruthy();
        expect(room.players.every((player: Player) => player.king)).toBe(true);

        const turnBefore = room.map.turn;
        await (instance as any).runGameTick();
        expect(room.map.turn).toBe(turnBefore + 1);

        (instance as any).clearGameLoop();
      }
    );
  });

  it('lets a room host add a bot and start a bot match', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'add_bot',
          data: [],
        });

        expect(room.players).toHaveLength(2);
        expect(room.players[1].isBot).toBe(true);
        expect(events.some((item) => item.event === 'update_room')).toBe(true);

        await (instance as any).handlePacket('socket-a', {
          type: 'force_start',
          data: [],
        });

        expect(room.gameStarted).toBe(true);
        expect(room.players.every((player: Player) => player.king)).toBe(true);

        (instance as any).clearGameLoop();
      }
    );
  });

  it('moves a bot forward after a few real game ticks', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'add_bot',
          data: [],
        });
        await (instance as any).handlePacket('socket-a', {
          type: 'force_start',
          data: [],
        });

        const bot = room.players.find((player: Player) => player.isBot);
        expect(bot).toBeTruthy();

        for (let index = 0; index < 6; index += 1) {
          await (instance as any).runGameTick();
        }

        expect(bot!.operatedTurn).toBeGreaterThan(0);
        expect(bot!.land.length).toBeGreaterThan(1);
      }
    );
  });

  it('deletes bot-only rooms after the last human leaves', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).syncRoomSummary();
        await (instance as any).handlePacket('socket-a', {
          type: 'add_bot',
          data: [],
        });
        await (instance as any).handleDisconnect('socket-a');

        expect(await (instance as any).app.getRoom(roomId)).toBeNull();
      }
    );
  });

  it('rehydrates persisted room state before handling hibernated websocket messages', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));
        await (instance as any).syncRoomSummary();

        (instance as any).room = null;
        (instance as any).sockets.set('socket-a', {
          readyState: WebSocket.OPEN,
        });

        await instance.webSocketMessage(
          {
            deserializeAttachment: () => ({
              connectionId: 'socket-a',
              roomId,
              playerId: 'player-a',
            }),
          } as WebSocket,
          JSON.stringify({ type: 'get_room_info', data: [] })
        );

        expect(events.some((item) => item.event === 'update_room')).toBe(true);
        expect((instance as any).room.players[0].id).toBe('player-a');
      }
    );
  });

  it('does not allow a player to surrender another player', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);

        await (instance as any).handlePacket('socket-a', {
          type: 'surrender',
          data: ['player-b'],
        });

        expect(room.players[1].isDead).toBe(false);
        expect(events.some((item) => item.event === 'error')).toBe(true);
      }
    );
  });

  it('rejects malformed and diagonal attacks', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);
        const player = room.players[0];
        const map = room.map!;
        map.turn = 1;

        await (instance as any).handlePacket('socket-a', {
          type: 'attack',
          data: [null, { x: 0, y: 0 }, 'false'],
        });

        const from = { x: player.king!.x, y: player.king!.y };
        const to = {
          x: from.x < map.width - 1 ? from.x + 1 : from.x - 1,
          y: from.y < map.height - 1 ? from.y + 1 : from.y - 1,
        };

        await (instance as any).handlePacket('socket-a', {
          type: 'attack',
          data: [from, to, false],
        });

        const attackFailures = events.filter((item) => item.event === 'attack_failure');
        expect(attackFailures).toHaveLength(2);
        expect(events.some((item) => item.event === 'attack_success')).toBe(false);
        expect(player.operatedTurn).toBe(0);
      }
    );
  });

  it('ends and cleans up games with no remaining alive teams', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);

        for (const player of room.players) {
          (instance as any).handleNeutralized(room, player);
        }

        await (instance as any).runGameTick();

        expect(room.gameStarted).toBe(false);
        expect(room.forceStartNum).toBe(0);
        expect(
          events.some(
            (item) => item.event === 'game_ended' && Array.isArray(item.data[0])
          )
        ).toBe(true);
      }
    );
  });

  it('cleans a started room immediately when every player disconnects', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { room } = await createStartedRoom(instance, roomId);

        await (instance as any).handleDisconnect('socket-a');
        await (instance as any).handleDisconnect('socket-b');

        expect(room.gameStarted).toBe(false);
        expect(room.players).toHaveLength(0);
        expect(await (instance as any).app.getRoom(roomId)).toBeNull();
      }
    );
  });

  it('prunes stale full room summaries before accepting a direct join', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const staleRoom = await (instance as any).ensureRoom(roomId);
        staleRoom.maxPlayers = 2;
        staleRoom.players.push(
          new Player('player-a', 'stale-socket-a', 'Alice', 1, 1),
          new Player('player-b', 'stale-socket-b', 'Bob', 2, 2)
        );
        await (instance as any).app.upsertRoom(cloneRoomSummary(staleRoom));
        (instance as any).room = null;

        await (instance as any).handleJoin(
          'socket-c',
          roomId,
          'Carol',
          ''
        );

        const room = (instance as any).room;
        expect(room.players).toHaveLength(1);
        expect(room.players[0].username).toBe('Carol');
        expect(events.some((item) => item.event === 'reject_join')).toBe(false);
      }
    );
  });

  it('replaces fallback room titles with the first host name on join', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.roomName = DEFAULT_ROOM_NAME;

        await (instance as any).handleJoin('socket-a', roomId, 'Alice', '');

        expect(room.roomName).toBe(formatCreatorRoomName('Alice'));
        expect(room.players[0]?.isRoomHost).toBe(true);
      }
    );
  });

  it('rejects unsafe room setting keys', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'change_room_setting',
          data: ['players', []],
        });

        expect(room.players).toHaveLength(1);
        expect(events.some((item) => item.event === 'error')).toBe(true);
      }
    );
  });
});
