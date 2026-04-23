import { createRandomId } from '@/lib/random-id';

type Packet = {
  type: string;
  data: unknown[];
};

type Listener = (...args: any[]) => void;

const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_TIMEOUT_MS = 8000;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 5000;

function toBaseHttpUrl(value?: string) {
  if (value) {
    return new URL(value, window.location.origin);
  }
  return new URL(window.location.origin);
}

export class Socket {
  public id = createRandomId();
  private listeners = new Map<string, Set<Listener>>();
  private ws: WebSocket | null = null;
  private sendQueue: Packet[] = [];
  private closedByUser = false;
  private connectedOnce = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: number | null = null;
  private pongTimeoutTimer: number | null = null;
  private pendingPingId: string | null = null;
  private pendingPingStartedAt: number | null = null;

  constructor(
    private url?: string,
    private options?: {
      query?: Record<string, string>;
    }
  ) {
    this.connect();
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private connect() {
    this.clearReconnectTimer();

    const query = this.options?.query ?? {};
    const roomId = query.roomId;
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (key === 'roomId') continue;
      if (value) params.set(key, value);
    }

    const baseUrl = toBaseHttpUrl(this.url);
    const wsProtocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = new URL(`/ws/rooms/${roomId}`, baseUrl);
    wsUrl.protocol = wsProtocol;
    wsUrl.search = params.toString();

    this.ws = new WebSocket(wsUrl);

    this.ws.addEventListener('open', () => {
      const isReconnect = this.connectedOnce;
      this.reconnectAttempts = 0;
      this.connectedOnce = true;
      this.startHeartbeat();
      this.emitLocal(isReconnect ? 'reconnect' : 'connect');
      this.flushQueue();
    });

    this.ws.addEventListener('message', (event) => {
      const packet = JSON.parse(event.data as string) as Packet;
      if (packet.type === 'pong') {
        this.handlePong(packet.data[0]);
        return;
      }
      this.emitLocal(packet.type, ...(packet.data ?? []));
    });

    this.ws.addEventListener('error', () => {
      if (this.closedByUser) {
        return;
      }
      this.emitLocal('connect_error', new Error('WebSocket connection error'));
    });

    this.ws.addEventListener('close', () => {
      this.ws = null;
      this.stopHeartbeat();
      this.emitLocal('latency', null);
      const disconnectReason = this.closedByUser
        ? 'io client disconnect'
        : 'transport close';

      this.emitLocal('disconnect', disconnectReason);
      if (this.closedByUser) {
        return;
      }

      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
        MAX_RECONNECT_DELAY_MS
      );
      this.reconnectAttempts += 1;
      this.emitLocal('reconnect_attempt', this.reconnectAttempts, delay);
      this.reconnectTimer = window.setTimeout(() => {
        this.connect();
      }, delay);
    });
  }

  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    for (const packet of this.sendQueue) {
      this.ws.send(JSON.stringify(packet));
    }
    this.sendQueue.length = 0;
  }

  private emitLocal(event: string, ...args: any[]) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(...args);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.sendHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.clearPongTimeout();
    this.pendingPingId = null;
    this.pendingPingStartedAt = null;
  }

  private clearPongTimeout() {
    if (this.pongTimeoutTimer !== null) {
      window.clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private sendHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (this.pendingPingId) {
      return;
    }

    this.pendingPingId = createRandomId();
    this.pendingPingStartedAt = performance.now();
    this.ws.send(
      JSON.stringify({
        type: 'ping',
        data: [this.pendingPingId],
      } satisfies Packet)
    );

    this.clearPongTimeout();
    this.pongTimeoutTimer = window.setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.close(4000, 'Heartbeat timeout');
      }
    }, HEARTBEAT_TIMEOUT_MS);
  }

  private handlePong(pingId: unknown) {
    if (
      typeof pingId !== 'string' ||
      pingId !== this.pendingPingId ||
      this.pendingPingStartedAt === null
    ) {
      return;
    }

    const latency = Math.max(
      0,
      Math.round(performance.now() - this.pendingPingStartedAt)
    );
    this.pendingPingId = null;
    this.pendingPingStartedAt = null;
    this.clearPongTimeout();
    this.emitLocal('latency', latency);
  }

  on(event: string, handler: Listener) {
    const handlers = this.listeners.get(event) ?? new Set<Listener>();
    handlers.add(handler);
    this.listeners.set(event, handlers);
    return this;
  }

  off(event: string, handler: Listener) {
    this.listeners.get(event)?.delete(handler);
    return this;
  }

  emit(event: string, ...data: unknown[]) {
    const packet: Packet = { type: event, data };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    } else {
      this.sendQueue.push(packet);
    }
    return this;
  }

  updateQuery(query: Record<string, string>) {
    this.options = {
      ...this.options,
      query: {
        ...(this.options?.query ?? {}),
        ...query,
      },
    };
    return this;
  }

  disconnect() {
    this.closedByUser = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.emitLocal('latency', null);
    this.ws?.close();
    this.ws = null;
  }
}

export function io(
  url?: string,
  options?: {
    query?: Record<string, string>;
  }
) {
  return new Socket(url, options);
}
