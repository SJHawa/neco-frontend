export type SocketEventHandler = (...args: unknown[]) => void;

export type RealtimeSocket = {
  id: string | undefined;
  connect: () => void;
  disconnect: () => void;
  emit: (eventName: string, payload: unknown) => void;
  on: (eventName: string, handler: SocketEventHandler) => void;
  off: (eventName: string, handler: SocketEventHandler) => void;
};

export type CreateRealtimeSocketOptions = {
  socketUrl: string;
};

export type CreateRealtimeSocket = (
  options: CreateRealtimeSocketOptions,
) => RealtimeSocket;

type WebSocketEventListener = (event: Event) => void;

type WebSocketLike = {
  readonly readyState: number;
  addEventListener: (
    eventName: string,
    handler: WebSocketEventListener,
  ) => void;
  removeEventListener: (
    eventName: string,
    handler: WebSocketEventListener,
  ) => void;
  close: (code?: number, reason?: string) => void;
  send: (data: string) => void;
};

type CreateRawWebSocketRealtimeSocketDependencies = {
  createWebSocket: (url: string) => WebSocketLike;
  createSocketId: () => string;
};

const READY_STATE_CONNECTING = 0;
const READY_STATE_OPEN = 1;

const viteEnv = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;

export const defaultSocketUrl =
  viteEnv?.VITE_SOCKET_URL ?? "http://localhost:8080";

function createDefaultSocketId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `realtime-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSocketUrl(socketUrl: string) {
  if (socketUrl.startsWith("ws://") || socketUrl.startsWith("wss://")) {
    return socketUrl;
  }

  if (socketUrl.startsWith("http://")) {
    return `ws://${socketUrl.slice("http://".length)}`;
  }

  if (socketUrl.startsWith("https://")) {
    return `wss://${socketUrl.slice("https://".length)}`;
  }

  return socketUrl;
}

function createBrowserWebSocket(url: string): WebSocketLike {
  if (typeof WebSocket === "undefined") {
    throw new Error("WebSocket is unavailable in this environment.");
  }

  return new WebSocket(url);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function tryParseEventFrame(rawMessage: string) {
  try {
    const parsed = JSON.parse(rawMessage) as unknown;
    if (!isObjectRecord(parsed) || typeof parsed.event !== "string") {
      return null;
    }

    return {
      event: parsed.event,
      data: parsed.data,
    };
  } catch {
    return null;
  }
}

async function readMessageData(data: unknown) {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data);
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return data.text();
  }

  return null;
}

export function createRawWebSocketRealtimeSocket(
  options: CreateRealtimeSocketOptions,
  dependencies: CreateRawWebSocketRealtimeSocketDependencies = {
    createWebSocket: createBrowserWebSocket,
    createSocketId: createDefaultSocketId,
  },
): RealtimeSocket {
  const handlers = new Map<string, Set<SocketEventHandler>>();
  const socketId = dependencies.createSocketId();
  const normalizedSocketUrl = normalizeSocketUrl(options.socketUrl);

  let socket: WebSocketLike | null = null;
  let hasConnected = false;
  let isDisposed = false;

  function emitLocalEvent(eventName: string, ...args: unknown[]) {
    const eventHandlers = handlers.get(eventName);
    if (!eventHandlers) {
      return;
    }

    for (const handler of eventHandlers) {
      handler(...args);
    }
  }

  function attachSocket(nextSocket: WebSocketLike) {
    const handleOpen: WebSocketEventListener = () => {
      if (nextSocket !== socket) {
        return;
      }

      hasConnected = true;
      emitLocalEvent("connect");
    };

    const handleError: WebSocketEventListener = () => {
      if (nextSocket !== socket || hasConnected) {
        return;
      }

      socket = null;
      detachSocketListeners?.();
      detachSocketListeners = null;
      emitLocalEvent("connect_error", new Error("websocket error"));
    };

    const handleClose: WebSocketEventListener = (event) => {
      if (nextSocket !== socket && !isDisposed) {
        return;
      }

      const closeEvent = event as CloseEvent;
      const closeReason = closeEvent.reason?.trim();
      const disconnectReason =
        typeof closeEvent.code === "number" && closeReason
          ? `${closeEvent.code}: ${closeReason}`
          : typeof closeEvent.code === "number"
            ? closeEvent.code
            : closeReason || "socket closed";

      socket = null;
      hasConnected = false;
      detachSocketListeners?.();
      detachSocketListeners = null;
      emitLocalEvent("disconnect", disconnectReason);
    };

    const handleMessage: WebSocketEventListener = (event) => {
      const messageEvent = event as MessageEvent;
      void readMessageData(messageEvent.data).then((rawMessage) => {
        if (rawMessage === null) {
          return;
        }

        const frame = tryParseEventFrame(rawMessage);
        if (!frame) {
          return;
        }

        emitLocalEvent(frame.event, frame.data);
      });
    };

    nextSocket.addEventListener("open", handleOpen);
    nextSocket.addEventListener("error", handleError);
    nextSocket.addEventListener("close", handleClose);
    nextSocket.addEventListener("message", handleMessage);

    return () => {
      nextSocket.removeEventListener("open", handleOpen);
      nextSocket.removeEventListener("error", handleError);
      nextSocket.removeEventListener("close", handleClose);
      nextSocket.removeEventListener("message", handleMessage);
    };
  }

  let detachSocketListeners: (() => void) | null = null;

  return {
    id: socketId,
    connect() {
      if (
        socket &&
        (socket.readyState === READY_STATE_CONNECTING ||
          socket.readyState === READY_STATE_OPEN)
      ) {
        return;
      }

      hasConnected = false;
      isDisposed = false;

      try {
        const nextSocket = dependencies.createWebSocket(normalizedSocketUrl);
        socket = nextSocket;
        detachSocketListeners?.();
        detachSocketListeners = attachSocket(nextSocket);
      } catch (error) {
        emitLocalEvent(
          "connect_error",
          error instanceof Error ? error : new Error("websocket error"),
        );
      }
    },
    disconnect() {
      if (!socket) {
        return;
      }

      isDisposed = true;
      const activeSocket = socket;
      socket = null;
      detachSocketListeners?.();
      detachSocketListeners = null;
      activeSocket.close(1000, "client disconnect");
    },
    emit(eventName: string, payload: unknown) {
      if (!socket || socket.readyState !== READY_STATE_OPEN) {
        return;
      }

      socket.send(
        JSON.stringify({
          event: eventName,
          data: payload,
        }),
      );
    },
    on(eventName: string, handler: SocketEventHandler) {
      const eventHandlers = handlers.get(eventName) ?? new Set<SocketEventHandler>();
      eventHandlers.add(handler);
      handlers.set(eventName, eventHandlers);
    },
    off(eventName: string, handler: SocketEventHandler) {
      const eventHandlers = handlers.get(eventName);
      if (!eventHandlers) {
        return;
      }

      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        handlers.delete(eventName);
      }
    },
  };
}
