import { io } from "socket.io-client";

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
  accessToken: string;
  socketUrl: string;
};

export type CreateRealtimeSocket = (
  options: CreateRealtimeSocketOptions,
) => RealtimeSocket;

const viteEnv = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;

export const defaultSocketUrl =
  viteEnv?.VITE_SOCKET_URL ?? "http://localhost:8080";

export const createSocketIoRealtimeSocket: CreateRealtimeSocket = ({
  accessToken,
  socketUrl,
}) =>
  io(socketUrl, {
    auth: {
      accessToken,
    },
    autoConnect: false,
    reconnection: false,
    transports: ["websocket"],
  });
