import { describe, expect, it } from 'vitest';
import { createRandomId } from '@/lib/random-id';

describe('createRandomId', () => {
  it('uses randomUUID when available', () => {
    const value = createRandomId(8, {
      randomUUID: () => '12345678-90ab-cdef-1234-567890abcdef',
    });

    expect(value).toBe('12345678');
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    const value = createRandomId(8, {
      getRandomValues: (array) => {
        array.set([0xde, 0xad, 0xbe, 0xef]);
        return array;
      },
    });

    expect(value).toBe('deadbeef');
  });

  it('still returns a hex id when crypto APIs are unavailable', () => {
    const value = createRandomId(10, {});

    expect(value).toMatch(/^[0-9a-f]{10}$/);
  });
});
