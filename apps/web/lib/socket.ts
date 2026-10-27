import type { ClientToServerEvents, ServerToClientEvents } from "@ghost-hunt/shared";
import { io, type Socket } from "socket.io-client";
import { API_ORIGIN } from "./config";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
let socket: GameSocket | undefined;

export function getGameSocket(): GameSocket {
  socket ??= io(API_ORIGIN, { autoConnect: false, withCredentials: true });
  return socket;
}
