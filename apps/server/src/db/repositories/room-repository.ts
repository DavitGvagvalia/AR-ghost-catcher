import type {
  PlayerSummary,
  RoomStatus,
  RoomSummary,
} from "@ghost-hunt/shared";

import type { GameDatabase } from "../migrations/types.js";

export interface RoomRecord extends RoomSummary {
  id: string;
  hostTokenHash: string;
  createdAt: number;
}

export interface PlayerRecord extends PlayerSummary {
  roomId: string;
  resumeTokenHash: string;
  lastSeenAt: number | null;
}

interface CreateRoomRecord {
  id: string;
  code: string;
  hostTokenHash: string;
  createdAt: number;
  markerIds: readonly string[];
}

interface CreatePlayerRecord {
  id: string;
  roomId: string;
  nickname: string;
  resumeTokenHash: string;
  joinedAt: number;
}

function toRoom(row: Record<string, unknown>): RoomRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    hostTokenHash: String(row.hostTokenHash),
    status: row.status as RoomStatus,
    createdAt: Number(row.createdAt),
    startedAt: row.startedAt === null ? null : Number(row.startedAt),
    endsAt: row.endsAt === null ? null : Number(row.endsAt),
    finalizedAt: row.finalizedAt === null ? null : Number(row.finalizedAt),
  };
}

function toPlayer(row: Record<string, unknown>): PlayerRecord {
  return {
    id: String(row.id),
    roomId: String(row.roomId),
    nickname: String(row.nickname),
    resumeTokenHash: String(row.resumeTokenHash),
    score: Number(row.score),
    joinedAt: Number(row.joinedAt),
    lastSeenAt: row.lastSeenAt === null ? null : Number(row.lastSeenAt),
    isConnected: Number(row.isConnected) === 1,
  };
}

export class RoomRepository {
  readonly #database: GameDatabase;

  constructor(database: GameDatabase) {
    this.#database = database;
  }

  createRoom(input: CreateRoomRecord): RoomRecord {
    const insertRoom = this.#database.prepare(`
      INSERT INTO rooms (id, code, host_token_hash, status, created_at)
      VALUES (?, ?, ?, 'LOBBY', ?)
    `);
    const insertMarker = this.#database.prepare(`
      INSERT INTO markers (room_id, marker_id) VALUES (?, ?)
    `);

    this.#database.transaction(() => {
      insertRoom.run(
        input.id,
        input.code,
        input.hostTokenHash,
        input.createdAt,
      );
      for (const markerId of input.markerIds) {
        insertMarker.run(input.id, markerId);
      }
    })();

    const room = this.findRoomByCode(input.code);
    if (!room)
      throw new Error("Room insert succeeded but the room was not found");
    return room;
  }

  createPlayer(input: CreatePlayerRecord): PlayerRecord {
    this.#database
      .prepare(
        `INSERT INTO players (
          id, room_id, nickname, resume_token_hash, joined_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.id,
        input.roomId,
        input.nickname,
        input.resumeTokenHash,
        input.joinedAt,
        input.joinedAt,
      );

    const player = this.findPlayerById(input.id);
    if (!player) {
      throw new Error("Player insert succeeded but the player was not found");
    }
    return player;
  }

  findRoomByCode(code: string): RoomRecord | null {
    const row = this.#database
      .prepare(
        `SELECT
          id,
          code,
          host_token_hash AS hostTokenHash,
          status,
          created_at AS createdAt,
          started_at AS startedAt,
          ends_at AS endsAt,
          finalized_at AS finalizedAt
        FROM rooms WHERE code = ?`,
      )
      .get(code) as Record<string, unknown> | undefined;
    return row ? toRoom(row) : null;
  }

  findRoomById(id: string): RoomRecord | null {
    const row = this.#database
      .prepare(
        `SELECT
          id,
          code,
          host_token_hash AS hostTokenHash,
          status,
          created_at AS createdAt,
          started_at AS startedAt,
          ends_at AS endsAt,
          finalized_at AS finalizedAt
        FROM rooms WHERE id = ?`,
      )
      .get(id) as Record<string, unknown> | undefined;
    return row ? toRoom(row) : null;
  }

  findRoomByHostTokenHash(tokenHash: string): RoomRecord | null {
    const row = this.#database
      .prepare(
        `SELECT
          id,
          code,
          host_token_hash AS hostTokenHash,
          status,
          created_at AS createdAt,
          started_at AS startedAt,
          ends_at AS endsAt,
          finalized_at AS finalizedAt
        FROM rooms WHERE host_token_hash = ?`,
      )
      .get(tokenHash) as Record<string, unknown> | undefined;
    return row ? toRoom(row) : null;
  }

  findPlayerById(id: string): PlayerRecord | null {
    const row = this.#database
      .prepare(
        `SELECT
          id,
          room_id AS roomId,
          nickname,
          resume_token_hash AS resumeTokenHash,
          score,
          joined_at AS joinedAt,
          last_seen_at AS lastSeenAt,
          is_connected AS isConnected
        FROM players WHERE id = ?`,
      )
      .get(id) as Record<string, unknown> | undefined;
    return row ? toPlayer(row) : null;
  }

  findPlayerByResumeTokenHash(tokenHash: string): PlayerRecord | null {
    const row = this.#database
      .prepare(
        `SELECT
          id,
          room_id AS roomId,
          nickname,
          resume_token_hash AS resumeTokenHash,
          score,
          joined_at AS joinedAt,
          last_seen_at AS lastSeenAt,
          is_connected AS isConnected
        FROM players WHERE resume_token_hash = ?`,
      )
      .get(tokenHash) as Record<string, unknown> | undefined;
    return row ? toPlayer(row) : null;
  }

  listPlayers(roomId: string): PlayerSummary[] {
    const rows = this.#database
      .prepare(
        `SELECT
          id,
          nickname,
          score,
          joined_at AS joinedAt,
          is_connected AS isConnected
        FROM players
        WHERE room_id = ?
        ORDER BY joined_at, id`,
      )
      .all(roomId) as Record<string, unknown>[];

    return rows.map((row) => ({
      id: String(row.id),
      nickname: String(row.nickname),
      score: Number(row.score),
      joinedAt: Number(row.joinedAt),
      isConnected: Number(row.isConnected) === 1,
    }));
  }

  touchPlayer(playerId: string, now: number): void {
    this.#database
      .prepare("UPDATE players SET last_seen_at = ? WHERE id = ?")
      .run(now, playerId);
  }

  setPlayerConnected(playerId: string, connected: boolean, now: number): void {
    this.#database
      .prepare(
        `UPDATE players
         SET is_connected = ?, last_seen_at = ?
         WHERE id = ?`,
      )
      .run(connected ? 1 : 0, now, playerId);
  }

  resetAllPresence(): void {
    this.#database.prepare("UPDATE players SET is_connected = 0").run();
  }

  startMatch(roomId: string, startedAt: number, endsAt: number): boolean {
    const result = this.#database
      .prepare(
        `UPDATE rooms
         SET status = 'RUNNING', started_at = ?, ends_at = ?
         WHERE id = ? AND status = 'LOBBY'`,
      )
      .run(startedAt, endsAt, roomId);
    return result.changes === 1;
  }

  expireMatchIfDue(roomId: string, now: number): boolean {
    return this.#database.transaction(() => {
      const expired = this.#database
        .prepare(
          `UPDATE rooms
           SET status = 'AWAITING_FINALIZATION'
           WHERE id = ?
             AND status = 'RUNNING'
             AND ends_at IS NOT NULL
             AND ends_at <= ?`,
        )
        .run(roomId, now);

      if (expired.changes !== 1) return false;

      this.#database
        .prepare(
          `UPDATE encounters
           SET status = 'CANCELLED', completed_at = ?
           WHERE room_id = ? AND status = 'ACTIVE'`,
        )
        .run(now, roomId);
      this.#database
        .prepare(
          `UPDATE markers
           SET active_encounter_id = NULL
           WHERE room_id = ? AND active_encounter_id IS NOT NULL`,
        )
        .run(roomId);
      return true;
    })();
  }

  listDueRunningRoomIds(now: number): string[] {
    const rows = this.#database
      .prepare(
        `SELECT id FROM rooms
         WHERE status = 'RUNNING'
           AND ends_at IS NOT NULL
           AND ends_at <= ?
         ORDER BY ends_at, id`,
      )
      .all(now) as { id: string }[];
    return rows.map((row) => row.id);
  }

  finalizeMatch(roomId: string, finalizedAt: number): boolean {
    const result = this.#database
      .prepare(
        `UPDATE rooms
         SET status = 'FINISHED', finalized_at = ?
         WHERE id = ? AND status = 'AWAITING_FINALIZATION'`,
      )
      .run(finalizedAt, roomId);
    return result.changes === 1;
  }
}
