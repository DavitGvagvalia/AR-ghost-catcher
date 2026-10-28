import {
  RoomSubscribePayloadSchema,
  MarkerClaimPayloadSchema,
  EncounterHitPayloadSchema,
  EncounterAbandonPayloadSchema,
  type GameActionResult,
  type EncounterAbandonedPayload,
  type EncounterClaimedPayload,
  type EncounterDefeatedPayload,
  type EncounterHitResultPayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type RoomSubscribeResult,
} from "@ghost-hunt/shared";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";

import { RoomEvents } from "../domain/room-events.js";
import type { RoomChangeKind } from "../domain/room-events.js";
import {
  RoomService,
  type AuthenticatedSession,
} from "../domain/room-service.js";
import { AppError } from "../utils/app-error.js";
import { EncounterService } from "../domain/encounter-service.js";
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

interface RateBucket {
  count: number;
  startedAt: number;
}

export interface SocketRateLimitOptions {
  windowMs?: number;
  claimsPerWindow?: number;
  hitsPerWindow?: number;
  abandonsPerWindow?: number;
  now?: () => number;
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
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The action contains invalid data.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
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

function safeActionError<T>(error: unknown): GameActionResult<T> {
  const result = safeError(error);
  if (result.ok) throw new Error("Expected an error result");
  return result;
}

export function createSocketServer(
  httpServer: HttpServer,
  roomService: RoomService,
  roomEvents: RoomEvents,
  encounterService: EncounterService,
  publicOrigin: string,
  rateLimitOptions: SocketRateLimitOptions = {},
): GameSocketServer {
  const io: GameSocketServer = new Server(httpServer, {
    cors: { origin: publicOrigin, credentials: true },
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      callback(null, origin === undefined || origin === publicOrigin);
    },
  });
  const playerSockets = new Map<string, Set<string>>();
  const actionBuckets = new Map<string, RateBucket>();
  const rateWindowMs = rateLimitOptions.windowMs ?? 60_000;
  const rateNow = rateLimitOptions.now ?? Date.now;
  const actionLimits = {
    claim: rateLimitOptions.claimsPerWindow ?? 30,
    hit: rateLimitOptions.hitsPerWindow ?? 300,
    abandon: rateLimitOptions.abandonsPerWindow ?? 30,
  } as const;

  const requireSubscribedPlayer = (socket: { data: SocketData }): string => {
    if (!socket.data.subscribedRoomId) {
      throw new AppError(
        409,
        "ROOM_NOT_SUBSCRIBED",
        "Subscribe to the room before sending gameplay actions.",
      );
    }
    const playerId = socket.data.session.playerId;
    if (!playerId) {
      throw new AppError(403, "PLAYER_REQUIRED", "Only a player can perform that action.");
    }
    return playerId;
  };

  const enforceActionRate = (
    playerId: string,
    action: keyof typeof actionLimits,
  ): void => {
    const now = rateNow();
    const key = `${playerId}:${action}`;
    const current = actionBuckets.get(key);
    const bucket =
      !current || now - current.startedAt >= rateWindowMs
        ? { count: 0, startedAt: now }
        : current;
    bucket.count += 1;
    actionBuckets.set(key, bucket);
    if (bucket.count > actionLimits[action]) {
      throw new AppError(
        429,
        "ACTION_RATE_LIMITED",
        "Too many gameplay actions were sent. Wait a moment and try again.",
      );
    }
  };

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

    socket.on("marker:claim", async (payload, acknowledge) => {
      try {
        const playerId = requireSubscribedPlayer(socket);
        enforceActionRate(playerId, "claim");
        const parsed = MarkerClaimPayloadSchema.parse(payload);
        const claimed = encounterService.claim(
          socket.data.session,
          parsed.markerId,
          parsed.requestId,
        );
        acknowledge({ ok: true, data: claimed });
        socket.emit("encounter:claimed", claimed);
        await publishRoomState(socket.data.session.roomId);
      } catch (error) {
        const result = safeActionError<EncounterClaimedPayload>(error);
        acknowledge(result);
        if (!result.ok) socket.emit("game:error", result.error);
      }
    });

    socket.on("encounter:hit", async (payload, acknowledge) => {
      try {
        const playerId = requireSubscribedPlayer(socket);
        enforceActionRate(playerId, "hit");
        const parsed = EncounterHitPayloadSchema.parse(payload);
        const result = encounterService.hit(
          socket.data.session,
          parsed.encounterId,
          parsed.attackId,
        );
        acknowledge({ ok: true, data: result });
        if ("pointsAwarded" in result) {
          socket.emit("encounter:defeated", result);
          io.to(roomChannel(socket.data.session.roomId)).emit(
            "score:updated",
            {
              playerId,
              score: result.score,
            },
          );
          await publishRoomState(socket.data.session.roomId);
        } else {
          socket.emit("encounter:hit-result", result);
        }
      } catch (error) {
        const result = safeActionError<
          EncounterHitResultPayload | EncounterDefeatedPayload
        >(error);
        acknowledge(result);
        if (!result.ok) socket.emit("game:error", result.error);
      }
    });

    socket.on("encounter:abandon", async (payload, acknowledge) => {
      try {
        const playerId = requireSubscribedPlayer(socket);
        enforceActionRate(playerId, "abandon");
        const parsed = EncounterAbandonPayloadSchema.parse(payload);
        const abandoned = encounterService.abandon(
          socket.data.session,
          parsed.encounterId,
        );
        acknowledge({ ok: true, data: abandoned });
        await publishRoomState(socket.data.session.roomId);
      } catch (error) {
        const result = safeActionError<EncounterAbandonedPayload>(error);
        acknowledge(result);
        if (!result.ok) socket.emit("game:error", result.error);
      }
    });

    socket.on("disconnect", async () => {
      const playerId = socket.data.session.playerId;
      if (!playerId || !socket.data.subscribedRoomId) return;

      const sockets = playerSockets.get(playerId);
      sockets?.delete(socket.id);
      if (sockets && sockets.size > 0) return;

      playerSockets.delete(playerId);
      encounterService.abandonActiveForPlayer(
        socket.data.session.roomId,
        playerId,
      );
      roomService.setPlayerConnected(playerId, false);
      await publishRoomState(socket.data.session.roomId);
    });
  });

  return io;
}
