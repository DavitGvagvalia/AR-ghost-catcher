import type {
  ClientToServerEvents,
  RoomRole,
  ServerToClientEvents,
} from "@ghost-hunt/shared";
import { io, type Socket } from "socket.io-client";
import { API_ORIGIN } from "./config";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
let socket: GameSocket | undefined;
let socketIdentity: string | undefined;

export function getGameSocket(roomCode: string, role: RoomRole): GameSocket {
  const identity = `${role}:${roomCode}`;
  if (socket && socketIdentity !== identity) {
    socket.disconnect();
    socket = undefined;
  }
  socketIdentity = identity;
  socket ??= io(API_ORIGIN, {
    autoConnect: false,
    withCredentials: true,
    auth: { roomCode, role },
  });
  return socket;
}
