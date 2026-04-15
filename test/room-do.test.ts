import { describe, expect, it } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import Player from '@shared/game/player';
import type { RoomDurableObject } from '../src/worker/room-do';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Cloudflare.Env {}
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
});
