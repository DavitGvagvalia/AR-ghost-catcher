import {
  MARKER_IDS,
  MATCH_DURATION_MS,
  compareStableText,
  type RoomState,
  type FinalResults,
} from "@ghost-hunt/shared";

import {
  RoomRepository,
  type PlayerRecord,
  type RoomRecord,
} from "../db/repositories/room-repository.js";
import { AppError } from "../utils/app-error.js";
import type { EncounterService } from "./encounter-service.js";
import {
  createId,
  createOpaqueToken,
  createRoomCode,
  hashToken,
} from "../utils/tokens.js";

export interface AuthenticatedSession {
  role: "HOST" | "PLAYER";
  roomId: string;
  roomCode: string;
  playerId: string | null;
}

export interface SessionTokens {
  hostToken?: string | undefined;
  playerToken?: string | undefined;
}

export interface CreatedRoom {
  state: RoomState;
  hostToken: string;
}

export interface JoinedRoom {
  state: RoomState;
  playerToken: string;
  roomId: string;
}

export interface RoomServiceOptions {
  now?: () => number;
  matchDurationMs?: number;
  encounterService?: EncounterService;
}

function isUniqueConstraint(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("SQLITE_CONSTRAINT_UNIQUE")
  );
}

export class RoomService {
  readonly #rooms: RoomRepository;
  readonly #now: () => number;
  readonly #matchDurationMs: number;
  readonly #encounterService: EncounterService | undefined;

  constructor(rooms: RoomRepository, options: RoomServiceOptions = {}) {
    this.#rooms = rooms;
    this.#now = options.now ?? Date.now;
    this.#matchDurationMs = options.matchDurationMs ?? MATCH_DURATION_MS;
    this.#encounterService = options.encounterService;
  }

  createRoom(): CreatedRoom {
    const hostToken = createOpaqueToken();
    const hostTokenHash = hashToken(hostToken);
    const createdAt = this.#now();
    let room: RoomRecord | undefined;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        room = this.#rooms.createRoom({
          id: createId(),
          code: createRoomCode(),
          hostTokenHash,
          createdAt,
          markerIds: MARKER_IDS,
        });
        break;
      } catch (error) {
        if (!isUniqueConstraint(error)) throw error;
      }
    }

    if (!room) {
      throw new AppError(
        503,
        "ROOM_CODE_UNAVAILABLE",
        "A unique room code could not be created. Try again.",
      );
    }

    const session: AuthenticatedSession = {
      role: "HOST",
      roomId: room.id,
      roomCode: room.code,
      playerId: null,
    };
    return { hostToken, state: this.getState(session) };
  }

  joinRoom(code: string, nickname: string): JoinedRoom {
    const room = this.requireRoom(code);
    if (room.status !== "LOBBY") {
      throw new AppError(
        409,
        "ROOM_NOT_JOINABLE",
        "This hunt has already started. Only existing players can resume.",
      );
    }

    const playerToken = createOpaqueToken();
    const player = this.#rooms.createPlayer({
      id: createId(),
      roomId: room.id,
      nickname,
      resumeTokenHash: hashToken(playerToken),
      joinedAt: this.#now(),
    });
    const session = this.playerSession(room, player);

    return {
      playerToken,
      roomId: room.id,
      state: this.getState(session),
    };
  }

  resumePlayer(code: string, playerToken: string | undefined): RoomState {
    if (!playerToken) {
      throw new AppError(
        401,
        "PLAYER_SESSION_REQUIRED",
        "No saved player session was found in this browser.",
      );
    }

    const room = this.requireRoom(code);
    const player = this.#rooms.findPlayerByResumeTokenHash(
      hashToken(playerToken),
    );
    if (!player || player.roomId !== room.id) {
      throw new AppError(
        401,
        "PLAYER_SESSION_INVALID",
        "The saved player session does not belong to this room.",
      );
    }

    this.#rooms.touchPlayer(player.id, this.#now());
    return this.getState(this.playerSession(room, player));
  }

  authenticateForRoom(
    code: string,
    tokens: SessionTokens,
  ): AuthenticatedSession {
    const room = this.requireRoom(code);

    if (
      tokens.hostToken &&
      hashToken(tokens.hostToken) === room.hostTokenHash
    ) {
      return {
        role: "HOST",
        roomId: room.id,
        roomCode: room.code,
        playerId: null,
      };
    }

    if (tokens.playerToken) {
      const player = this.#rooms.findPlayerByResumeTokenHash(
        hashToken(tokens.playerToken),
      );
      if (player?.roomId === room.id) return this.playerSession(room, player);
    }

    throw new AppError(
      401,
      "ROOM_SESSION_INVALID",
      "This browser is not authorized for that room.",
    );
  }

  getState(session: AuthenticatedSession): RoomState {
    this.#rooms.expireMatchIfDue(session.roomId, this.#now());
    const room = this.#rooms.findRoomById(session.roomId);
    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Room not found.");
    }

    const encounterState = this.#encounterService?.getRoomSnapshot(
      room.id,
      session.playerId,
    ) ?? {
      markers: MARKER_IDS.map((markerId) => ({
        markerId,
        status: "AVAILABLE" as const,
        cooldownUntil: null,
        reservedByCurrentPlayer: false,
      })),
      activeEncounter: null,
    };

    return {
      room: {
        code: room.code,
        status: room.status,
        startedAt: room.startedAt,
        endsAt: room.endsAt,
        finalizedAt: room.finalizedAt,
      },
      players: this.#rooms.listPlayers(room.id),
      role: session.role,
      currentPlayerId: session.playerId,
      serverTime: this.#now(),
      ...encounterState,
    };
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    this.#rooms.setPlayerConnected(playerId, connected, this.#now());
  }

  resetAllPresence(): void {
    this.#rooms.resetAllPresence();
  }

  startMatch(session: AuthenticatedSession): RoomState {
    this.requireHost(session);
    const now = this.#now();
    this.#rooms.expireMatchIfDue(session.roomId, now);
    const room = this.requireRoomById(session.roomId);
    if (room.status !== "LOBBY") {
      throw new AppError(
        409,
        "MATCH_START_INVALID",
        "The match can only start while the room is in the lobby.",
      );
    }

    const started = this.#rooms.startMatch(
      room.id,
      now,
      now + this.#matchDurationMs,
    );
    if (!started) {
      throw new AppError(
        409,
        "MATCH_START_CONFLICT",
        "The room changed before the match could start. Synchronize and try again.",
      );
    }
    return this.getState(session);
  }

  finalizeMatch(session: AuthenticatedSession): RoomState {
    this.requireHost(session);
    const now = this.#now();
    this.#rooms.expireMatchIfDue(session.roomId, now);
    const room = this.requireRoomById(session.roomId);

    if (room.status === "FINISHED") return this.getState(session);
    if (room.status === "RUNNING") {
      throw new AppError(
        409,
        "MATCH_STILL_RUNNING",
        "The match cannot be finalized before its server deadline.",
      );
    }
    if (room.status !== "AWAITING_FINALIZATION") {
      throw new AppError(
        409,
        "MATCH_END_INVALID",
        "The match must start and reach its deadline before finalization.",
      );
    }

    if (!this.#rooms.finalizeMatch(room.id, now)) {
      const current = this.requireRoomById(room.id);
      if (current.status !== "FINISHED") {
        throw new AppError(
          409,
          "MATCH_END_CONFLICT",
          "The room changed before finalization. Synchronize and try again.",
        );
      }
    }
    return this.getState(session);
  }

  expireDueRooms(): string[] {
    const now = this.#now();
    return this.#rooms
      .listDueRunningRoomIds(now)
      .filter((roomId) => this.#rooms.expireMatchIfDue(roomId, now));
  }

  getResults(session: AuthenticatedSession): FinalResults {
    this.#rooms.expireMatchIfDue(session.roomId, this.#now());
    const room = this.requireRoomById(session.roomId);
    if (room.status !== "FINISHED" || room.finalizedAt === null) {
      throw new AppError(
        409,
        "RESULTS_NOT_PUBLISHED",
        "Final standings are not published yet.",
      );
    }

    const players = this.#rooms
      .listPlayers(room.id)
      .sort(
        (left, right) =>
          right.score - left.score ||
          compareStableText(left.nickname, right.nickname) ||
          compareStableText(left.id, right.id),
      );
    const topScore = players[0]?.score ?? 0;
    const winners = players
      .filter((player) => player.score === topScore)
      .map((player) => player.id);

    return {
      roomCode: room.code,
      finalizedAt: room.finalizedAt,
      topScore,
      winners,
      leaderboard: players.map((player) => {
        const firstAtScore = players.findIndex(
          (candidate) => candidate.score === player.score,
        );
        return {
          rank: firstAtScore + 1,
          playerId: player.id,
          nickname: player.nickname,
          score: player.score,
          isWinner: player.score === topScore,
        };
      }),
    };
  }

  private playerSession(
    room: RoomRecord,
    player: PlayerRecord,
  ): AuthenticatedSession {
    return {
      role: "PLAYER",
      roomId: room.id,
      roomCode: room.code,
      playerId: player.id,
    };
  }

  private requireRoom(code: string): RoomRecord {
    const room = this.#rooms.findRoomByCode(code);
    if (!room) {
      throw new AppError(
        404,
        "ROOM_NOT_FOUND",
        "No room was found for that code.",
      );
    }
    return room;
  }

  private requireRoomById(roomId: string): RoomRecord {
    const room = this.#rooms.findRoomById(roomId);
    if (!room) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found.");
    return room;
  }

  private requireHost(session: AuthenticatedSession): void {
    if (session.role !== "HOST") {
      throw new AppError(
        403,
        "HOST_REQUIRED",
        "Only the authenticated room host can perform this action.",
      );
    }
  }
}
