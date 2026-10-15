type NetworkEventHandler = (event: {
  type: string;
  from?: string;
  to?: string;
  payload?: any;
  timestamp?: number;
  [key: string]: any;
}) => void;

class NetworkRelay {
  private ws: WebSocket | null = null;
  private friendCode: string | null = null;
  private username: string = '';
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners = new Set<NetworkEventHandler>();
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private isConnected = false;
  private offlineQueue: Array<{ to: string; type: string; payload: any }> = [];

  constructor() {
    // Multi-tab local bus
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('cipherzero_relay_bus');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncoming(event.data, true);
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported', err);
      }
    }

    // Monitor browser online/offline
    window.addEventListener('online', () => {
      this.reconnect();
      this.flushOfflineQueue();
      this.emit({ type: 'network_status', isOnline: true });
    });

    window.addEventListener('offline', () => {
      this.emit({ type: 'network_status', isOnline: false });
    });
  }

  public registerUser(friendCode: string, username: string) {
    this.friendCode = friendCode;
    this.username = username;
    this.connect();

    // Broadcast our presence on the local tab bus
    this.broadcastChannel?.postMessage({
      type: 'presence_multitab',
      from: friendCode,
      username,
      status: 'online',
    });
  }

  public subscribe(handler: NetworkEventHandler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private emit(event: any) {
    this.listeners.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error('Error in network handler', err);
      }
    });
  }

  private connect() {
    if (!this.friendCode) return;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit({ type: 'connection_status', connected: true });

        // Register user on socket
        this.sendRaw({
          type: 'register',
          from: this.friendCode,
          username: this.username,
        });

        // Start heartbeat
        this.startHeartbeat();
        this.flushOfflineQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncoming(data, false);
        } catch {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit({ type: 'connection_status', connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.sendRaw({ type: 'heartbeat', from: this.friendCode });
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  public reconnect() {
    this.connect();
  }

  private handleIncoming(data: any, fromBroadcast: boolean) {
    if (!data) return;

    // Filter out our own messages from BroadcastChannel unless explicitly intended for self
    if (fromBroadcast && data.from === this.friendCode && data.type !== 'presence_multitab' && data.to !== this.friendCode) {
      return;
    }

    // Direct message / call / typing intended for this user
    if (data.to && data.to !== this.friendCode && data.type !== 'presence_update') {
      return;
    }

    this.emit(data);
  }

  private sendRaw(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  public send(type: string, to: string, payload: any, fromOverride?: string) {
    const senderCode = fromOverride || payload?.from || this.friendCode;
    const packet = {
      type,
      from: senderCode,
      to,
      payload,
      timestamp: Date.now(),
    };

    // Always mirror to local multi-tab BroadcastChannel for instant testing across tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(packet);
    }

    const sent = this.sendRaw(packet);
    if (!sent) {
      // Buffer in offline queue
      this.offlineQueue.push({ to, type, payload });
      // Also try HTTP fallback
      this.sendHttpFallback(packet);
    }
  }

  public sendGroup(groupId: string, members: string[], payload: any) {
    const packet = {
      type: 'group_broadcast',
      from: this.friendCode,
      payload: {
        groupId,
        members,
        data: payload,
      },
      timestamp: Date.now(),
    };

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'group_message',
        groupId,
        from: this.friendCode,
        payload,
        timestamp: Date.now(),
      });
    }

    this.sendRaw(packet);
  }

  private async sendHttpFallback(packet: any) {
    try {
      await fetch('/api/relay/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet),
      });
    } catch {}
  }

  private flushOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    const items = [...this.offlineQueue];
    this.offlineQueue = [];
    items.forEach((item) => {
      this.send(item.type, item.to, item.payload);
    });
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnected = false;
    this.friendCode = null;
  }
}

export const networkRelay = new NetworkRelay();
