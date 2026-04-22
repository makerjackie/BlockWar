import { describe, expect, it } from 'vitest';
import { resolveRoomIdentity } from '@/lib/room-identity';

describe('resolveRoomIdentity', () => {
  it('preserves an existing stored player identity', () => {
    expect(resolveRoomIdentity('Alice', 'player-1')).toEqual({
      username: 'Alice',
      playerId: 'player-1',
      requiresUsername: false,
    });
  });

  it('requires a username before joining a direct room link', () => {
    expect(resolveRoomIdentity(null, 'stale-player')).toEqual({
      username: '',
      playerId: '',
      requiresUsername: true,
    });
  });

  it('normalizes blank stored usernames into the setup flow', () => {
    expect(resolveRoomIdentity('   ', null)).toEqual({
      username: '',
      playerId: '',
      requiresUsername: true,
    });
  });
});
