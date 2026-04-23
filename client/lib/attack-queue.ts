import type { Position } from '@/lib/types';
import { createRandomId } from '@/lib/random-id';

export interface AttackRoute {
  from: Position;
  to: Position;
  half: boolean;
}

export interface SentAttackRoute extends AttackRoute {
  requestId: string;
}

function samePosition(a?: Position | null, b?: Position | null) {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}

export class AttackQueue {
  public allowAttackThisTurn: boolean;

  private queued: AttackRoute[];
  private queueHead: number;
  private inFlight: Map<string, SentAttackRoute>;
  private inFlightOrder: string[];
  private displayedRoute: SentAttackRoute | null;

  constructor(
    private clearFromMap: (route: AttackRoute) => void,
    private createRequestId: () => string = () => createRandomId()
  ) {
    this.allowAttackThisTurn = false;
    this.queued = [];
    this.queueHead = 0;
    this.inFlight = new Map();
    this.inFlightOrder = [];
    this.displayedRoute = null;
  }

  get lastItem(): SentAttackRoute | undefined {
    return this.displayedRoute ?? undefined;
  }

  insert(item: AttackRoute): void {
    this.queued.push(item);
  }

  hasInFlight(): boolean {
    return this.inFlightOrder.length > 0;
  }

  pop(): SentAttackRoute | undefined {
    if (this.hasInFlight()) {
      return undefined;
    }

    const item = this.front();
    if (!item) {
      return undefined;
    }

    this.queueHead += 1;
    this.compactQueue();

    if (this.displayedRoute) {
      this.clearFromMap(this.displayedRoute);
      this.displayedRoute = null;
    }

    const sentItem: SentAttackRoute = {
      ...item,
      requestId: this.createRequestId(),
    };

    this.inFlight.set(sentItem.requestId, sentItem);
    this.inFlightOrder.push(sentItem.requestId);
    this.displayedRoute = sentItem;

    return sentItem;
  }

  pop_back(): AttackRoute | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    const item = this.queued.pop();
    if (!item) {
      return undefined;
    }

    this.clearFromMap(item);
    this.compactQueue();
    return item;
  }

  front(): AttackRoute | undefined {
    return this.queued[this.queueHead];
  }

  end(): AttackRoute | undefined {
    return this.isEmpty() ? undefined : this.queued[this.queued.length - 1];
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  size(): number {
    return this.queued.length - this.queueHead;
  }

  clear(): void {
    for (let index = this.queueHead; index < this.queued.length; index += 1) {
      this.clearFromMap(this.queued[index]);
    }

    this.queued = [];
    this.queueHead = 0;
    this.inFlight.clear();
    this.inFlightOrder.length = 0;
    this.clearLastItem();
  }

  clearLastItem(): void {
    if (!this.displayedRoute) {
      return;
    }

    this.clearFromMap(this.displayedRoute);
    this.displayedRoute = null;
  }

  resolveSuccess(
    requestId?: string | null,
    from?: Position | null,
    to?: Position | null
  ): void {
    const matchedId = this.findInFlightId(requestId, from, to);
    if (!matchedId) {
      return;
    }

    this.removeInFlight(matchedId);
  }

  resolveFailure(
    requestId?: string | null,
    from?: Position | null,
    to?: Position | null
  ): void {
    const matchedId = this.findInFlightId(requestId, from, to);
    if (!matchedId) {
      return;
    }

    const failedRoute = this.inFlight.get(matchedId);
    if (!failedRoute) {
      return;
    }

    const failedIndex = this.inFlightOrder.indexOf(matchedId);
    const laterInFlightIds =
      failedIndex >= 0 ? this.inFlightOrder.slice(failedIndex + 1) : [];

    this.removeInFlight(matchedId);
    if (this.displayedRoute?.requestId === matchedId) {
      this.clearLastItem();
    }

    let cursor: Position | null = failedRoute.to;

    for (const laterId of laterInFlightIds) {
      const route = this.inFlight.get(laterId);
      if (!route || !samePosition(route.from, cursor)) {
        break;
      }

      this.removeInFlight(laterId);
      if (this.displayedRoute?.requestId === laterId) {
        this.clearLastItem();
      }
      cursor = route.to;
    }

    while (!this.isEmpty()) {
      const nextQueued = this.front();
      if (!nextQueued || !samePosition(nextQueued.from, cursor)) {
        break;
      }

      this.dropFrontQueued();
      cursor = nextQueued.to;
    }
  }

  private dropFrontQueued(): AttackRoute | undefined {
    const item = this.front();
    if (!item) {
      return undefined;
    }

    this.queueHead += 1;
    this.clearFromMap(item);
    this.compactQueue();
    return item;
  }

  private compactQueue() {
    if (this.queueHead === 0) {
      return;
    }

    if (this.queueHead >= this.queued.length) {
      this.queued = [];
      this.queueHead = 0;
      return;
    }

    if (this.queueHead >= 32 && this.queueHead * 2 >= this.queued.length) {
      this.queued = this.queued.slice(this.queueHead);
      this.queueHead = 0;
    }
  }

  private removeInFlight(requestId: string) {
    this.inFlight.delete(requestId);
    const orderIndex = this.inFlightOrder.indexOf(requestId);
    if (orderIndex >= 0) {
      this.inFlightOrder.splice(orderIndex, 1);
    }
  }

  private findInFlightId(
    requestId?: string | null,
    from?: Position | null,
    to?: Position | null
  ): string | undefined {
    if (requestId && this.inFlight.has(requestId)) {
      return requestId;
    }

    for (const inFlightId of this.inFlightOrder) {
      const route = this.inFlight.get(inFlightId);
      if (!route) {
        continue;
      }
      if (samePosition(route.from, from) && samePosition(route.to, to)) {
        return inFlightId;
      }
    }

    return undefined;
  }
}
