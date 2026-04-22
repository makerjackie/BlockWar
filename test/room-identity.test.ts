import { describe, expect, it } from 'vitest';
import { resolveRoomIdentity } from '@/lib/room-identity';

describe('resolveRoomIdentity', () => {
  it('preserves an existing stored username', () => {
    expect(resolveRoomIdentity('Alice')).toEqual({
      username: 'Alice',
      requiresUsername: false,
    });
  });

  it('requires a username before joining a direct room link', () => {
    expect(resolveRoomIdentity(null)).toEqual({
      username: '',
      requiresUsername: true,
    });
  });

  it('normalizes blank stored usernames into the setup flow', () => {
    expect(resolveRoomIdentity('   ')).toEqual({
      username: '',
      requiresUsername: true,
    });
  });
});
