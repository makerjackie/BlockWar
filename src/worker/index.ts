import { Hono } from 'hono';
import type { RoomPreset } from '@shared/game/room-defaults';
import { AppDurableObject } from './app-do';
import { RoomDurableObject } from './room-do';

type Env = {
  Bindings: Cloudflare.Env;
};

function hasFileExtension(pathname: string) {
  const lastSegment = pathname.split('/').at(-1) ?? '';
  return lastSegment.includes('.');
}

const api = new Hono<Env>();

api.get('/ping', (c) => c.json(''));

api.get('/get_rooms', async (c) => {
  return c.json(await c.env.APP.getByName('global').listRooms());
});

api.get('/create_room', async (c) => {
  const roomName = c.req.query('name') ?? 'Untitled';
  const rawPreset = c.req.query('preset');
  const preset: RoomPreset = rawPreset === 'warring_state' ? rawPreset : 'standard';
  const result = await c.env.APP.getByName('global').createRoom(roomName, preset);
  return c.json(result);
});

api.get('/get_replay/:replayId', async (c) => {
  const replay = await c.env.APP.getByName('global').getReplay(c.req.param('replayId'));
  if (!replay) {
    return c.json({ error: 'Replay not found' }, 404);
  }
  return c.json(replay);
});

api.get('/maps', async (c) => {
  return c.json(await c.env.APP.getByName('global').listMaps());
});

api.post('/maps', async (c) => {
  const body = await c.req.json();
  const result = await c.env.APP.getByName('global').createMap(body);
  return c.json(result);
});

api.get('/maps/:id', async (c) => {
  const map = await c.env.APP.getByName('global').getMap(c.req.param('id'), true);
  if (!map) {
    return c.body(null, 404);
  }
  return c.json(map);
});

api.put('/maps/:id', async (c) => {
  const body = await c.req.json();
  return c.json(
    await c.env.APP.getByName('global').updateMap(c.req.param('id'), body)
  );
});

api.delete('/maps/:id', async (c) => {
  return c.json(
    await c.env.APP.getByName('global').deleteMap(c.req.param('id'))
  );
});

api.get('/new', async (c) =>
  c.json(await c.env.APP.getByName('global').listMapsByOrder('new'))
);
api.get('/hot', async (c) =>
  c.json(await c.env.APP.getByName('global').listMapsByOrder('hot'))
);
api.get('/best', async (c) =>
  c.json(await c.env.APP.getByName('global').listMapsByOrder('best'))
);

api.get('/search', async (c) => {
  const term = c.req.query('q');
  if (!term) {
    return c.json({ error: 'Invalid query parameter' }, 400);
  }
  return c.json(await c.env.APP.getByName('global').searchMaps(term));
});

api.post('/toggleStar', async (c) => {
  const { userId, mapId, action } = await c.req.json<{
    userId?: string;
    mapId?: string;
    action?: string;
  }>();

  if (!userId || !mapId || !action) {
    return c.json({ error: 'Invalid request payload' }, 400);
  }
  if (action !== 'increase' && action !== 'decrease') {
    return c.json({ error: 'Invalid star action' }, 400);
  }

  const result = await c.env.APP.getByName('global').toggleStar(userId, mapId, action);
  if (!result.ok) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json({ success: true });
});

api.get('/starredMaps', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) {
    return c.json({ error: 'User ID is required' }, 400);
  }
  return c.json(await c.env.APP.getByName('global').getStarredMaps(userId));
});

const app = new Hono<Env>();

app.route('/api', api);

app.get('/ws/rooms/:roomId', async (c) => {
  const stub = c.env.ROOMS.getByName(c.req.param('roomId'));
  return await stub.fetch(c.req.raw);
});

app.all('*', async (c) => {
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  if (c.req.method !== 'GET') {
    return assetResponse;
  }

  const { pathname } = new URL(c.req.url);
  if (hasFileExtension(pathname)) {
    return assetResponse;
  }

  return await c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)));
});

export default app;
export { AppDurableObject, RoomDurableObject };
