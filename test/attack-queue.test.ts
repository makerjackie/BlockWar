import { describe, expect, it, vi } from 'vitest';
import { AttackQueue, type AttackRoute } from '@/lib/attack-queue';

function createRoute(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): AttackRoute {
  return {
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY },
    half: false,
  };
}

describe('AttackQueue', () => {
  it('drops only the failed chain when an older failure arrives after a newer send', () => {
    const clearFromMap = vi.fn();
    let requestCounter = 0;
    const queue = new AttackQueue(clearFromMap, () => `req-${++requestCounter}`);

    const first = createRoute(0, 0, 0, 1);
    const second = createRoute(0, 1, 0, 2);
    const third = createRoute(0, 2, 0, 3);

    queue.insert(first);
    queue.insert(second);
    queue.insert(third);

    const sentFirst = queue.pop();
    const sentSecond = queue.pop();

    expect(sentFirst?.requestId).toBe('req-1');
    expect(sentSecond?.requestId).toBe('req-2');
    expect(clearFromMap).not.toHaveBeenCalled();

    queue.resolveFailure(sentFirst?.requestId, sentFirst?.from, sentFirst?.to);

    expect(queue.isEmpty()).toBe(true);
    expect(clearFromMap).toHaveBeenCalledTimes(3);
    expect(clearFromMap).toHaveBeenNthCalledWith(1, sentFirst);
    expect(clearFromMap).toHaveBeenNthCalledWith(2, sentSecond);
    expect(clearFromMap).toHaveBeenNthCalledWith(3, third);

    queue.resolveFailure(sentSecond?.requestId, sentSecond?.from, sentSecond?.to);

    expect(clearFromMap).toHaveBeenCalledTimes(3);
    expect(queue.pop()).toBeUndefined();
  });

  it('can still reconcile legacy responses that do not include a request id', () => {
    const clearFromMap = vi.fn();
    const queue = new AttackQueue(clearFromMap, () => 'req-1');
    const first = createRoute(1, 1, 1, 2);

    queue.insert(first);
    const sent = queue.pop();

    queue.resolveSuccess(undefined, sent?.from, sent?.to);

    expect(clearFromMap).toHaveBeenCalledTimes(1);
    expect(clearFromMap).toHaveBeenCalledWith(sent);
  });
});
