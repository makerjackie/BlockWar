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
  it('waits for the current attack to resolve before dispatching the next route', () => {
    const clearFromMap = vi.fn();
    let requestCounter = 0;
    const queue = new AttackQueue(clearFromMap, () => `req-${++requestCounter}`);

    const first = createRoute(0, 0, 0, 1);
    const second = createRoute(0, 1, 0, 2);

    queue.insert(first);
    queue.insert(second);

    const sentFirst = queue.pop();

    expect(sentFirst?.requestId).toBe('req-1');
    expect(queue.hasInFlight()).toBe(true);
    expect(queue.pop()).toBeUndefined();
    expect(queue.front()).toEqual(second);
    expect(clearFromMap).not.toHaveBeenCalled();

    queue.resolveSuccess(sentFirst?.requestId, sentFirst?.from, sentFirst?.to);

    const sentSecond = queue.pop();

    expect(queue.hasInFlight()).toBe(true);
    expect(sentSecond?.requestId).toBe('req-2');
    expect(clearFromMap).toHaveBeenCalledTimes(1);
    expect(clearFromMap).toHaveBeenCalledWith(sentFirst);
  });

  it('drops the remaining queued chain after a failed route', () => {
    const clearFromMap = vi.fn();
    const queue = new AttackQueue(clearFromMap, () => 'req-1');

    const first = createRoute(0, 0, 0, 1);
    const second = createRoute(0, 1, 0, 2);
    const third = createRoute(0, 2, 0, 3);

    queue.insert(first);
    queue.insert(second);
    queue.insert(third);

    const sentFirst = queue.pop();

    queue.resolveFailure(sentFirst?.requestId, sentFirst?.from, sentFirst?.to);

    expect(queue.isEmpty()).toBe(true);
    expect(queue.lastItem).toBeUndefined();
    expect(clearFromMap).toHaveBeenCalledTimes(3);
    expect(clearFromMap).toHaveBeenNthCalledWith(1, sentFirst);
    expect(clearFromMap).toHaveBeenNthCalledWith(2, second);
    expect(clearFromMap).toHaveBeenNthCalledWith(3, third);
  });

  it('can still reconcile legacy responses that do not include a request id', () => {
    const clearFromMap = vi.fn();
    const queue = new AttackQueue(clearFromMap, () => 'req-1');
    const first = createRoute(1, 1, 1, 2);

    queue.insert(first);
    const sent = queue.pop();

    queue.resolveSuccess(undefined, sent?.from, sent?.to);
    queue.clearLastItem();

    expect(clearFromMap).toHaveBeenCalledTimes(1);
    expect(clearFromMap).toHaveBeenCalledWith(sent);
  });
});
