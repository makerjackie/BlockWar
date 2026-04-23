import { describe, expect, it } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import Player from '@shared/game/player';
import type { RoomDurableObject } from '../src/worker/room-do';

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

describe('player latency reporting', () => {
  it('stores and broadcasts the latest reported player latency', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'report_latency',
          data: [73.4],
        });

        expect(room.players[0].latencyMs).toBe(73);
        expect(events).toContainEqual({
          connectionId: '*',
          event: 'player_latency',
          data: ['player-a', 73],
        });
      }
    );
  });
});
