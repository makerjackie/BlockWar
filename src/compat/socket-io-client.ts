type Packet = {
  type: string;
  data: unknown[];
};

type Listener = (...args: any[]) => void;

function toBaseHttpUrl(value?: string) {
  if (value) {
    return new URL(value, window.location.origin);
  }
  return new URL(window.location.origin);
}

export class Socket {
  public id = crypto.randomUUID();
  private listeners = new Map<string, Set<Listener>>();
  private ws: WebSocket | null = null;
  private sendQueue: Packet[] = [];
  private closedByUser = false;
  private connectedOnce = false;
  private reconnectTimer: number | null = null;

  constructor(
    private url?: string,
    private options?: {
      query?: Record<string, string>;
    }
  ) {
    this.connect();
  }

  private connect() {
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
      this.connectedOnce = true;
      this.emitLocal(isReconnect ? 'reconnect' : 'connect');
      this.flushQueue();
    });

    this.ws.addEventListener('message', (event) => {
      const packet = JSON.parse(event.data as string) as Packet;
      this.emitLocal(packet.type, ...(packet.data ?? []));
    });

    this.ws.addEventListener('error', () => {
      this.emitLocal('connect_error', new Error('WebSocket connection error'));
    });

    this.ws.addEventListener('close', () => {
      this.emitLocal('disconnect');
      if (this.closedByUser) {
        return;
      }

      this.reconnectTimer = window.setTimeout(() => {
        this.connect();
      }, 1000);
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

  disconnect() {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
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
