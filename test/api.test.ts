import { describe, expect, it } from 'vitest';
import { SELF } from 'cloudflare:test';
import { formatCreatorRoomName } from '@shared/game/room-names';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Cloudflare.Env {}
}

async function createSession(username: string) {
  const response = await SELF.fetch('http://example.com/api/session', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ username }),
  });

  expect(response.ok).toBe(true);
  return (await response.json()) as { token: string; username: string };
}

function withSession(token: string, headers: Record<string, string> = {}) {
  return {
    ...headers,
    'x-blockwar-session': token,
  };
}

describe('BlockWar API', () => {
  it('lists active rooms and creates new preset rooms', async () => {
    const initialResponse = await SELF.fetch('http://example.com/api/get_rooms');
    expect(initialResponse.ok).toBe(true);

    const initialRooms = (await initialResponse.json()) as Record<
      string,
      { roomName: string; warringStatesMode?: boolean; revealKing?: boolean }
    >;
    expect(initialRooms['1']).toBeUndefined();
    expect(initialRooms.warring_state).toBeUndefined();

    const createResponse = await SELF.fetch(
      'http://example.com/api/create_room?name=Test%20Room'
    );
    expect(createResponse.ok).toBe(true);

    const created = (await createResponse.json()) as {
      success: boolean;
      roomId: string;
    };
    expect(created.success).toBe(true);
    expect(created.roomId).toHaveLength(8);

    const afterResponse = await SELF.fetch('http://example.com/api/get_rooms');
    const roomsAfter = (await afterResponse.json()) as Record<
      string,
      { roomName: string }
    >;

    expect(roomsAfter[created.roomId]?.roomName).toBe('Test Room');

    const warringResponse = await SELF.fetch(
      'http://example.com/api/create_room?name=Warring%20Test&preset=warring_state'
    );
    expect(warringResponse.ok).toBe(true);

    const warring = (await warringResponse.json()) as {
      success: boolean;
      roomId: string;
    };
    const finalResponse = await SELF.fetch('http://example.com/api/get_rooms');
    const finalRooms = (await finalResponse.json()) as Record<
      string,
      {
        roomName: string;
        warringStatesMode?: boolean;
        revealKing?: boolean;
        preset?: string;
        maxPlayers?: number;
        gameSpeed?: number;
        fogOfWar?: boolean;
      }
    >;

    expect(warring.success).toBe(true);
    expect(finalRooms[warring.roomId]).toMatchObject({
      roomName: 'Warring Test',
      warringStatesMode: true,
      revealKing: true,
      preset: 'warring_state',
    });

    const tutorialResponse = await SELF.fetch(
      'http://example.com/api/create_room?name=Tutorial%20Test&preset=tutorial'
    );
    expect(tutorialResponse.ok).toBe(true);

    const tutorial = (await tutorialResponse.json()) as {
      success: boolean;
      roomId: string;
    };
    const tutorialRoomsResponse = await SELF.fetch('http://example.com/api/get_rooms');
    const tutorialRooms = (await tutorialRoomsResponse.json()) as typeof finalRooms;

    expect(tutorial.success).toBe(true);
    expect(tutorialRooms[tutorial.roomId]).toMatchObject({
      roomName: 'Tutorial Test',
      preset: 'tutorial',
      maxPlayers: 3,
      gameSpeed: 1,
      fogOfWar: false,
      revealKing: true,
    });
  });

  it('uses the creator name for default room titles', async () => {
    const createResponse = await SELF.fetch(
      'http://example.com/api/create_room?creator=Alice'
    );
    expect(createResponse.ok).toBe(true);

    const created = (await createResponse.json()) as {
      success: boolean;
      roomId: string;
    };

    const roomsResponse = await SELF.fetch('http://example.com/api/get_rooms');
    const rooms = (await roomsResponse.json()) as Record<string, { roomName: string }>;

    expect(created.success).toBe(true);
    expect(rooms[created.roomId]?.roomName).toBe(formatCreatorRoomName('Alice'));
  });

  it('stores maps and star relationships', async () => {
    const session = await createSession('MapOwner');
    const mapId = `map-${crypto.randomUUID().slice(0, 8)}`;
    const mapPayload = {
      id: mapId,
      name: 'BlockWar Test Map',
      width: 4,
      height: 4,
      creator: 'spoofed-name',
      description: 'Smoke test map',
      mapTilesData: Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => [4, null, 0, false, 0])
      ),
    };

    const createResponse = await SELF.fetch('http://example.com/api/maps', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...withSession(session.token),
      },
      body: JSON.stringify(mapPayload),
    });
    expect(createResponse.ok).toBe(true);

    const mapResponse = await SELF.fetch(`http://example.com/api/maps/${mapId}`);
    expect(mapResponse.ok).toBe(true);

    const storedMap = (await mapResponse.json()) as {
      id: string;
      name: string;
      creator: string;
      mapTilesData: number[][][];
    };
    expect(storedMap.id).toBe(mapId);
    expect(storedMap.name).toBe(mapPayload.name);
    expect(storedMap.creator).toBe('MapOwner');
    expect(storedMap.mapTilesData).toHaveLength(4);

    const starResponse = await SELF.fetch('http://example.com/api/toggleStar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...withSession(session.token),
      },
      body: JSON.stringify({
        mapId,
        action: 'increase',
      }),
    });
    expect(starResponse.ok).toBe(true);

    const starredMapsResponse = await SELF.fetch('http://example.com/api/starredMaps', {
      headers: withSession(session.token),
    });
    expect(starredMapsResponse.ok).toBe(true);

    const starredMaps = (await starredMapsResponse.json()) as string[];
    expect(starredMaps).toContain(mapId);

    const otherSession = await createSession('OtherPlayer');
    const otherStarredMapsResponse = await SELF.fetch(
      'http://example.com/api/starredMaps',
      {
        headers: withSession(otherSession.token),
      }
    );
    expect(await otherStarredMapsResponse.json()).not.toContain(mapId);
  });

  it('returns empty search results for blank queries and finds maps by name', async () => {
    const session = await createSession('Searcher');
    const mapId = `search-${crypto.randomUUID().slice(0, 8)}`;
    const mapPayload = {
      id: mapId,
      name: 'Searchable Test Map',
      width: 4,
      height: 4,
      creator: 'tester',
      description: 'Search coverage map',
      mapTilesData: Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => [4, null, 0, false, 0])
      ),
    };

    const createResponse = await SELF.fetch('http://example.com/api/maps', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...withSession(session.token),
      },
      body: JSON.stringify(mapPayload),
    });
    expect(createResponse.ok).toBe(true);

    const emptySearchResponse = await SELF.fetch('http://example.com/api/search?q=');
    expect(emptySearchResponse.ok).toBe(true);
    expect(await emptySearchResponse.json()).toEqual([]);

    const searchResponse = await SELF.fetch(
      'http://example.com/api/search?q=Searchable%20Test'
    );
    expect(searchResponse.ok).toBe(true);

    const results = (await searchResponse.json()) as Array<{ id: string; name: string }>;
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: mapId,
          name: 'Searchable Test Map',
        }),
      ])
    );
  });

  it('rejects invalid star actions and missing maps', async () => {
    const session = await createSession('StarTester');
    const missingMapId = `missing-${crypto.randomUUID().slice(0, 8)}`;

    const invalidActionResponse = await SELF.fetch('http://example.com/api/toggleStar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...withSession(session.token),
      },
      body: JSON.stringify({
        mapId: missingMapId,
        action: 'toggle',
      }),
    });
    expect(invalidActionResponse.status).toBe(400);

    const missingMapResponse = await SELF.fetch('http://example.com/api/toggleStar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...withSession(session.token),
      },
      body: JSON.stringify({
        mapId: missingMapId,
        action: 'increase',
      }),
    });
    expect(missingMapResponse.status).toBe(404);

    const starredMapsResponse = await SELF.fetch('http://example.com/api/starredMaps', {
      headers: withSession(session.token),
    });
    expect(await starredMapsResponse.json()).not.toContain(missingMapId);
  });

  it('requires a session for map writes and starred-map access', async () => {
    const mapId = `auth-${crypto.randomUUID().slice(0, 8)}`;
    const mapPayload = {
      id: mapId,
      name: 'Unauthorized Map',
      width: 4,
      height: 4,
      creator: 'attacker',
      description: 'Should fail',
      mapTilesData: Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => [4, null, 0, false, 0])
      ),
    };

    const createResponse = await SELF.fetch('http://example.com/api/maps', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(mapPayload),
    });
    expect(createResponse.status).toBe(401);

    const starredMapsResponse = await SELF.fetch('http://example.com/api/starredMaps');
    expect(starredMapsResponse.status).toBe(401);
  });

  it('enforces map ownership and rejects malformed map payloads', async () => {
    const ownerSession = await createSession('Owner');
    const attackerSession = await createSession('Attacker');
    const mapId = `owned-${crypto.randomUUID().slice(0, 8)}`;
    const mapPayload = {
      id: mapId,
      name: 'Owned Map',
      width: 4,
      height: 4,
      creator: 'ignored',
      description: 'Ownership test map',
      mapTilesData: Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => [4, null, 0, false, 0])
      ),
    };

    const createResponse = await SELF.fetch('http://example.com/api/maps', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...withSession(ownerSession.token),
      },
      body: JSON.stringify(mapPayload),
    });
    expect(createResponse.ok).toBe(true);

    const invalidMapResponse = await SELF.fetch('http://example.com/api/maps', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...withSession(ownerSession.token),
      },
      body: JSON.stringify({
        ...mapPayload,
        id: `invalid-${crypto.randomUUID().slice(0, 8)}`,
        width: 40,
        height: 40,
        mapTilesData: [],
      }),
    });
    expect(invalidMapResponse.status).toBe(400);

    const updateResponse = await SELF.fetch(`http://example.com/api/maps/${mapId}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        ...withSession(attackerSession.token),
      },
      body: JSON.stringify({
        ...mapPayload,
        name: 'Hijacked Map',
      }),
    });
    expect(updateResponse.status).toBe(403);

    const deleteResponse = await SELF.fetch(`http://example.com/api/maps/${mapId}`, {
      method: 'DELETE',
      headers: withSession(attackerSession.token),
    });
    expect(deleteResponse.status).toBe(403);
  });
});
