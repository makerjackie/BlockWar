import { describe, expect, it } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import type { AppDurableObject } from '../src/worker/app-do';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Cloudflare.Env {}
}

describe('AppDurableObject', () => {
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

  it('drops oversized replays', async () => {
    const stub = env.APP.getByName(`app-${crypto.randomUUID().slice(0, 8)}`);

    await runInDurableObject(stub, async (instance: AppDurableObject) => {
      const replayId = await instance.saveReplay({
        payload: 'x'.repeat(160 * 1024),
      });

      expect(replayId).toBeNull();
    });
  });
});
