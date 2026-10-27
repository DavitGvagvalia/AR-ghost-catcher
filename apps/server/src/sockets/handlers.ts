import {
  RoomSubscribePayloadSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type RoomSubscribeResult,
} from "@ghost-hunt/shared";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import { RoomEvents } from "../domain/room-events.js";
import type { RoomChangeKind } from "../domain/room-events.js";
import {
  RoomService,
  type AuthenticatedSession,
} from "../domain/room-service.js";
import { AppError } from "../utils/app-error.js";
import {
  HOST_SESSION_COOKIE,
  PLAYER_SESSION_COOKIE,
  readCookies,
} from "../http/cookies.js";

type InterServerEvents = Record<never, never>;

interface SocketData {
  session: AuthenticatedSession;
  subscribedRoomId?: string;
}

export type GameSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function roomChannel(roomId: string): string {
  return `room:${roomId}`;
}

function safeError(error: unknown): RoomSubscribeResult {
  if (error instanceof AppError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.issues ? { issues: error.issues } : {}),
      },
    };
  }
  return {
    ok: false,
    error: {
      code: "SERVICE_UNAVAILABLE",
      message: "The room could not be synchronized.",
    },
  };
}

export function createSocketServer(
  httpServer: HttpServer,
  roomService: RoomService,
  roomEvents: RoomEvents,
  publicOrigin: string,
): GameSocketServer {
  const io: GameSocketServer = new Server(httpServer, {
    cors: { origin: publicOrigin, credentials: true },
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      callback(null, origin === undefined || origin === publicOrigin);
    },
  });
  const playerSockets = new Map<string, Set<string>>();

  const publishRoomState = async (
    roomId: string,
    kind: RoomChangeKind = "STATE",
  ): Promise<void> => {
    const sockets = await io.in(roomChannel(roomId)).fetchSockets();
    for (const socket of sockets) {
      const state = roomService.getState(socket.data.session);
      socket.emit("room:state", state);
      if (
        kind === "STARTED" &&
        state.room.startedAt !== null &&
        state.room.endsAt !== null
      ) {
        socket.emit("room:started", {
          startedAt: state.room.startedAt,
          endsAt: state.room.endsAt,
        });
      } else if (kind === "EXPIRED") {
        socket.emit("room:expired");
      } else if (kind === "FINISHED") {
        socket.emit("room:finished");
      }
    }
  };

  roomEvents.setListener(publishRoomState);

  io.use((socket, next) => {
    try {
      const cookies = readCookies(socket.request.headers.cookie);
      socket.data.session = roomService.authenticateSession({
        hostToken: cookies[HOST_SESSION_COOKIE],
        playerToken: cookies[PLAYER_SESSION_COOKIE],
      });
      next();
    } catch (error) {
      const result = safeError(error);
      const socketError = new Error(
        result.ok ? "Unauthorized" : result.error.message,
      );
      if (!result.ok) socketError.cause = result.error;
      next(socketError);
    }
  });

  io.on("connection", (socket) => {
    const connectPlayer = (): void => {
      const playerId = socket.data.session.playerId;
      if (!playerId) return;
      const sockets = playerSockets.get(playerId) ?? new Set<string>();
      const wasDisconnected = sockets.size === 0;
      sockets.add(socket.id);
      playerSockets.set(playerId, sockets);
      if (wasDisconnected) roomService.setPlayerConnected(playerId, true);
    };

    socket.on("room:subscribe", async (payload, acknowledge) => {
      try {
        const parsed = RoomSubscribePayloadSchema.parse(payload);
        if (parsed.roomCode !== socket.data.session.roomCode) {
          throw new AppError(
            403,
            "ROOM_FORBIDDEN",
            "This session does not belong to that room.",
          );
        }

        if (!socket.data.subscribedRoomId) {
          socket.data.subscribedRoomId = socket.data.session.roomId;
          await socket.join(roomChannel(socket.data.session.roomId));
          connectPlayer();
        }

        const state = roomService.getState(socket.data.session);
        acknowledge({ ok: true, state });
        await publishRoomState(socket.data.session.roomId);
      } catch (error) {
        acknowledge(safeError(error));
      }
    });

    socket.on("room:sync", (acknowledge) => {
      try {
        if (!socket.data.subscribedRoomId) {
          throw new AppError(
            409,
            "ROOM_NOT_SUBSCRIBED",
            "Subscribe to the room before requesting a sync.",
          );
        }
        acknowledge({
          ok: true,
          state: roomService.getState(socket.data.session),
        });
      } catch (error) {
        acknowledge(safeError(error));
      }
    });

    socket.on("disconnect", async () => {
      const playerId = socket.data.session.playerId;
      if (!playerId || !socket.data.subscribedRoomId) return;

      const sockets = playerSockets.get(playerId);
      sockets?.delete(socket.id);
      if (sockets && sockets.size > 0) return;

      playerSockets.delete(playerId);
      roomService.setPlayerConnected(playerId, false);
      await publishRoomState(socket.data.session.roomId);
    });
  });

  return io;
}
