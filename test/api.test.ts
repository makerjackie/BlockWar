import { describe, expect, it } from 'vitest';
import { SELF } from 'cloudflare:test';
import { formatCreatorRoomName } from '@shared/game/room-names';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Cloudflare.Env {}
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
      { roomName: string; warringStatesMode?: boolean; revealKing?: boolean }
    >;

    expect(warring.success).toBe(true);
    expect(finalRooms[warring.roomId]).toMatchObject({
      roomName: 'Warring Test',
      warringStatesMode: true,
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
    const mapId = `map-${crypto.randomUUID().slice(0, 8)}`;
    const mapPayload = {
      id: mapId,
      name: 'BlockWar Test Map',
      width: 4,
      height: 4,
      creator: 'tester',
      description: 'Smoke test map',
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
    expect(createResponse.ok).toBe(true);

    const mapResponse = await SELF.fetch(`http://example.com/api/maps/${mapId}`);
    expect(mapResponse.ok).toBe(true);

    const storedMap = (await mapResponse.json()) as {
      id: string;
      name: string;
      mapTilesData: number[][][];
    };
    expect(storedMap.id).toBe(mapId);
    expect(storedMap.name).toBe(mapPayload.name);
    expect(storedMap.mapTilesData).toHaveLength(4);

    const starResponse = await SELF.fetch('http://example.com/api/toggleStar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'player-1',
        mapId,
        action: 'increase',
      }),
    });
    expect(starResponse.ok).toBe(true);

    const starredMapsResponse = await SELF.fetch(
      'http://example.com/api/starredMaps?userId=player-1'
    );
    expect(starredMapsResponse.ok).toBe(true);

    const starredMaps = (await starredMapsResponse.json()) as string[];
    expect(starredMaps).toContain(mapId);
  });

  it('rejects invalid star actions and missing maps', async () => {
    const missingMapId = `missing-${crypto.randomUUID().slice(0, 8)}`;

    const invalidActionResponse = await SELF.fetch('http://example.com/api/toggleStar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'player-invalid-action',
        mapId: missingMapId,
        action: 'toggle',
      }),
    });
    expect(invalidActionResponse.status).toBe(400);

    const missingMapResponse = await SELF.fetch('http://example.com/api/toggleStar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'player-missing-map',
        mapId: missingMapId,
        action: 'increase',
      }),
    });
    expect(missingMapResponse.status).toBe(404);

    const starredMapsResponse = await SELF.fetch(
      'http://example.com/api/starredMaps?userId=player-missing-map'
    );
    expect(await starredMapsResponse.json()).not.toContain(missingMapId);
  });
});
