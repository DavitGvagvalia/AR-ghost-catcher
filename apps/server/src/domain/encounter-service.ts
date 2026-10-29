import { randomInt } from "node:crypto";

import {
  GHOST_MODEL_MANIFEST,
  ENCOUNTER_LEASE_MS,
  MARKER_COOLDOWN_MS,
  MAX_GHOST_HITS,
  MIN_GHOST_HITS,
  MIN_HIT_INTERVAL_MS,
  type EncounterAbandonedPayload,
  type EncounterClaimedPayload,
  type EncounterDefeatedPayload,
  type EncounterHitResultPayload,
  type EncounterSnapshot,
  type GhostModelId,
  type MarkerId,
  type MarkerRuntimeState,
} from "@ghost-hunt/shared";

import type { GameDatabase } from "../db/migrations/types.js";
import { AppError } from "../utils/app-error.js";
import { createId } from "../utils/tokens.js";

interface EncounterSession {
  role: "HOST" | "PLAYER";
  roomId: string;
  playerId: string | null;
}

export interface EncounterRoomSnapshot {
  markers: MarkerRuntimeState[];
  activeEncounter: EncounterSnapshot | null;
}

export interface EncounterServiceOptions {
  now?: () => number;
  encounterLeaseMs?: number;
  markerCooldownMs?: number;
  minGhostHits?: number;
  maxGhostHits?: number;
  minHitIntervalMs?: number;
  randomIndex?: (upperExclusive: number) => number;
}

interface EncounterRow {
  id: string;
  markerId: MarkerId;
  playerId: string;
  ghostModelId: GhostModelId;
  requiredHits: number;
  registeredHits: number;
  status: string;
  leaseExpiresAt: number;
  awardedPoints: number;
}

const playableGhostIds = GHOST_MODEL_MANIFEST.filter(
  (model) => model.mobileReadiness === "CANDIDATE" && model.serverSelectable,
).map((model) => model.id);

function encounterSnapshot(row: EncounterRow): EncounterSnapshot {
  return {
    encounterId: row.id,
    markerId: row.markerId,
    ghostModelId: row.ghostModelId,
    requiredHits: row.requiredHits,
    registeredHits: row.registeredHits,
    remainingHits: Math.max(0, row.requiredHits - row.registeredHits),
    leaseExpiresAt: row.leaseExpiresAt,
  };
}

export class EncounterService {
  readonly #database: GameDatabase;
  readonly #now: () => number;
  readonly #encounterLeaseMs: number;
  readonly #markerCooldownMs: number;
  readonly #minGhostHits: number;
  readonly #maxGhostHits: number;
  readonly #minHitIntervalMs: number;
  readonly #randomIndex: (upperExclusive: number) => number;

  constructor(database: GameDatabase, options: EncounterServiceOptions = {}) {
    this.#database = database;
    this.#now = options.now ?? Date.now;
    this.#encounterLeaseMs = options.encounterLeaseMs ?? ENCOUNTER_LEASE_MS;
    this.#markerCooldownMs = options.markerCooldownMs ?? MARKER_COOLDOWN_MS;
    this.#minGhostHits = options.minGhostHits ?? MIN_GHOST_HITS;
    this.#maxGhostHits = options.maxGhostHits ?? MAX_GHOST_HITS;
    this.#minHitIntervalMs = options.minHitIntervalMs ?? MIN_HIT_INTERVAL_MS;
    this.#randomIndex = options.randomIndex ?? randomInt;
  }

  getRoomSnapshot(
    roomId: string,
    playerId: string | null,
  ): EncounterRoomSnapshot {
    const now = this.#now();
    this.#synchronizeRoom(roomId, now);
    const markerRows = this.#database
      .prepare(
        `SELECT
          m.marker_id AS markerId,
          m.active_encounter_id AS activeEncounterId,
          m.cooldown_until AS cooldownUntil,
          e.player_id AS ownerPlayerId
        FROM markers m
        LEFT JOIN encounters e ON e.id = m.active_encounter_id
        WHERE m.room_id = ?
        ORDER BY m.marker_id`,
      )
      .all(roomId) as {
      markerId: MarkerId;
      activeEncounterId: string | null;
      cooldownUntil: number | null;
      ownerPlayerId: string | null;
    }[];

    const active = playerId
      ? this.#findActiveEncounterForPlayer(roomId, playerId)
      : null;
    return {
      markers: markerRows.map((marker) => ({
        markerId: marker.markerId,
        status: marker.activeEncounterId
          ? "RESERVED"
          : marker.cooldownUntil && marker.cooldownUntil > now
            ? "COOLDOWN"
            : "AVAILABLE",
        cooldownUntil: marker.cooldownUntil,
        reservedByCurrentPlayer:
          marker.activeEncounterId !== null &&
          marker.ownerPlayerId === playerId,
      })),
      activeEncounter: active ? encounterSnapshot(active) : null,
    };
  }

  claim(
    session: EncounterSession,
    markerId: MarkerId,
    requestId: string,
  ): EncounterClaimedPayload {
    const playerId = this.#requirePlayer(session);
    const now = this.#now();
    this.#synchronizeRoom(session.roomId, now);

    return this.#database.transaction(() => {
      this.#requireRunningRoom(session.roomId, now);

      const retried = this.#database
        .prepare(
          `SELECT
            id, marker_id AS markerId, player_id AS playerId,
            ghost_model_id AS ghostModelId, required_hits AS requiredHits,
            registered_hits AS registeredHits, status,
            lease_expires_at AS leaseExpiresAt,
            awarded_points AS awardedPoints
          FROM encounters
          WHERE player_id = ? AND claim_request_id = ?`,
        )
        .get(playerId, requestId) as EncounterRow | undefined;
      if (retried) {
        if (retried.status !== "ACTIVE") {
          throw new AppError(
            409,
            "CLAIM_ALREADY_RESOLVED",
            "That claim request has already finished.",
          );
        }
        return { ...encounterSnapshot(retried), requestId };
      }

      if (this.#findActiveEncounterForPlayer(session.roomId, playerId)) {
        throw new AppError(
          409,
          "PLAYER_HAS_ACTIVE_ENCOUNTER",
          "Finish or abandon the current ghost before claiming another marker.",
        );
      }

      const marker = this.#database
        .prepare(
          `SELECT active_encounter_id AS activeEncounterId,
                  cooldown_until AS cooldownUntil
           FROM markers WHERE room_id = ? AND marker_id = ?`,
        )
        .get(session.roomId, markerId) as
        | { activeEncounterId: string | null; cooldownUntil: number | null }
        | undefined;
      if (!marker) {
        throw new AppError(400, "MARKER_UNKNOWN", "Unknown marker ID.");
      }
      if (marker.activeEncounterId) {
        throw new AppError(
          409,
          "MARKER_RESERVED",
          "Ghost being hunted by another player.",
        );
      }
      if (marker.cooldownUntil && marker.cooldownUntil > now) {
        throw new AppError(
          409,
          "MARKER_COOLDOWN",
          "This marker is recovering before another ghost can appear.",
        );
      }

      const ghostModelId =
        playableGhostIds[this.#randomIndex(playableGhostIds.length)];
      if (!ghostModelId) throw new Error("No playable ghost models configured");
      const requiredHits =
        this.#minGhostHits +
        this.#randomIndex(this.#maxGhostHits - this.#minGhostHits + 1);
      const encounterId = createId();
      const leaseExpiresAt = now + this.#encounterLeaseMs;

      this.#database
        .prepare(
          `INSERT INTO encounters (
            id, room_id, marker_id, player_id, ghost_model_id,
            required_hits, status, claimed_at, lease_expires_at,
            claim_request_id
          ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        )
        .run(
          encounterId,
          session.roomId,
          markerId,
          playerId,
          ghostModelId,
          requiredHits,
          now,
          leaseExpiresAt,
          requestId,
        );
      const reserved = this.#database
        .prepare(
          `UPDATE markers SET active_encounter_id = ?, cooldown_until = NULL
           WHERE room_id = ? AND marker_id = ?
             AND active_encounter_id IS NULL
             AND (cooldown_until IS NULL OR cooldown_until <= ?)`,
        )
        .run(encounterId, session.roomId, markerId, now);
      if (reserved.changes !== 1) {
        throw new AppError(
          409,
          "MARKER_CLAIM_CONFLICT",
          "Another player claimed this marker first.",
        );
      }

      return {
        encounterId,
        markerId,
        ghostModelId,
        requiredHits,
        registeredHits: 0,
        remainingHits: requiredHits,
        leaseExpiresAt,
        requestId,
      };
    })();
  }

  hit(
    session: EncounterSession,
    encounterId: string,
    attackId: string,
  ): EncounterHitResultPayload | EncounterDefeatedPayload {
    const playerId = this.#requirePlayer(session);
    const now = this.#now();
    this.#synchronizeRoom(session.roomId, now);

    return this.#database.transaction(() => {
      this.#requireRunningRoom(session.roomId, now);
      const encounter = this.#findEncounter(encounterId);
      if (!encounter || encounter.playerId !== playerId) {
        throw new AppError(
          403,
          "ENCOUNTER_FORBIDDEN",
          "That encounter does not belong to this player.",
        );
      }

      const duplicate = Boolean(
        this.#database
          .prepare(
            "SELECT 1 FROM encounter_hits WHERE encounter_id = ? AND attack_id = ?",
          )
          .get(encounterId, attackId),
      );
      if (duplicate) {
        if (encounter.status === "DEFEATED") {
          return this.#defeatedPayload(encounter, attackId, true);
        }
        return { ...encounterSnapshot(encounter), attackId, duplicate: true };
      }
      if (encounter.status !== "ACTIVE") {
        throw new AppError(
          409,
          "ENCOUNTER_INACTIVE",
          "This encounter is no longer active.",
        );
      }

      const lastAcceptedAt = this.#database
        .prepare(
          "SELECT MAX(accepted_at) FROM encounter_hits WHERE encounter_id = ?",
        )
        .pluck()
        .get(encounterId) as number | null;
      if (
        lastAcceptedAt !== null &&
        now - lastAcceptedAt < this.#minHitIntervalMs
      ) {
        throw new AppError(
          429,
          "HIT_TOO_FAST",
          "Wait a moment before attacking again.",
        );
      }

      this.#database
        .prepare(
          `INSERT INTO encounter_hits (encounter_id, attack_id, accepted_at)
           VALUES (?, ?, ?)`,
        )
        .run(encounterId, attackId, now);
      const registeredHits = encounter.registeredHits + 1;
      if (registeredHits < encounter.requiredHits) {
        this.#database
          .prepare(
            "UPDATE encounters SET registered_hits = ? WHERE id = ? AND status = 'ACTIVE'",
          )
          .run(registeredHits, encounterId);
        return {
          ...encounterSnapshot({ ...encounter, registeredHits }),
          attackId,
          duplicate: false,
        };
      }

      const cooldownUntil = now + this.#markerCooldownMs;
      this.#database
        .prepare(
          `UPDATE encounters
           SET registered_hits = required_hits, status = 'DEFEATED',
               completed_at = ?, awarded_points = required_hits
           WHERE id = ? AND status = 'ACTIVE'`,
        )
        .run(now, encounterId);
      this.#database
        .prepare(
          `INSERT INTO score_events (
            id, room_id, player_id, encounter_id, points, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId(),
          session.roomId,
          playerId,
          encounterId,
          encounter.requiredHits,
          now,
        );
      this.#database
        .prepare("UPDATE players SET score = score + ? WHERE id = ?")
        .run(encounter.requiredHits, playerId);
      this.#database
        .prepare(
          `UPDATE markers
           SET active_encounter_id = NULL, cooldown_until = ?
           WHERE room_id = ? AND marker_id = ? AND active_encounter_id = ?`,
        )
        .run(cooldownUntil, session.roomId, encounter.markerId, encounterId);

      const score = this.#database
        .prepare("SELECT score FROM players WHERE id = ?")
        .pluck()
        .get(playerId) as number;
      return {
        encounterId,
        markerId: encounter.markerId,
        attackId,
        pointsAwarded: encounter.requiredHits,
        score,
        cooldownUntil,
        duplicate: false,
      };
    })();
  }

  abandon(
    session: EncounterSession,
    encounterId: string,
  ): EncounterAbandonedPayload {
    const playerId = this.#requirePlayer(session);
    const now = this.#now();
    return this.#database.transaction(() => {
      const encounter = this.#findEncounter(encounterId);
      if (!encounter || encounter.playerId !== playerId) {
        throw new AppError(
          403,
          "ENCOUNTER_FORBIDDEN",
          "That encounter does not belong to this player.",
        );
      }
      if (encounter.status === "ABANDONED") {
        return { encounterId, markerId: encounter.markerId };
      }
      if (encounter.status !== "ACTIVE") {
        throw new AppError(
          409,
          "ENCOUNTER_INACTIVE",
          "This encounter is no longer active.",
        );
      }
      this.#cancelEncounter(encounter, "ABANDONED", now);
      return { encounterId, markerId: encounter.markerId };
    })();
  }

  abandonActiveForPlayer(roomId: string, playerId: string): void {
    const now = this.#now();
    this.#database.transaction(() => {
      const active = this.#findActiveEncounterForPlayer(roomId, playerId);
      if (active) this.#cancelEncounter(active, "ABANDONED", now);
    })();
  }

  #synchronizeRoom(roomId: string, now: number): void {
    this.#database.transaction(() => {
      this.#database
        .prepare(
          `UPDATE rooms SET status = 'AWAITING_FINALIZATION'
           WHERE id = ? AND status = 'RUNNING'
             AND ends_at IS NOT NULL AND ends_at <= ?`,
        )
        .run(roomId, now);
      this.#database
        .prepare(
          `UPDATE encounters
           SET status = CASE
             WHEN lease_expires_at <= ? THEN 'EXPIRED'
             ELSE 'CANCELLED'
           END,
           completed_at = ?
           WHERE room_id = ? AND status = 'ACTIVE'
             AND (
               lease_expires_at <= ? OR
               NOT EXISTS (
                 SELECT 1 FROM rooms r
                 WHERE r.id = encounters.room_id AND r.status = 'RUNNING'
               )
             )`,
        )
        .run(now, now, roomId, now);
      this.#database
        .prepare(
          `UPDATE markers
           SET active_encounter_id = NULL
           WHERE room_id = ? AND active_encounter_id IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM encounters e
               WHERE e.id = markers.active_encounter_id AND e.status = 'ACTIVE'
             )`,
        )
        .run(roomId);
      this.#database
        .prepare(
          `UPDATE markers SET cooldown_until = NULL
           WHERE room_id = ? AND cooldown_until IS NOT NULL
             AND cooldown_until <= ?`,
        )
        .run(roomId, now);
    })();
  }

  #requireRunningRoom(roomId: string, now: number): void {
    const room = this.#database
      .prepare("SELECT status, ends_at AS endsAt FROM rooms WHERE id = ?")
      .get(roomId) as { status: string; endsAt: number | null } | undefined;
    if (
      !room ||
      room.status !== "RUNNING" ||
      !room.endsAt ||
      room.endsAt <= now
    ) {
      throw new AppError(
        409,
        "MATCH_NOT_RUNNING",
        "Gameplay is unavailable because the match is not running.",
      );
    }
  }

  #requirePlayer(session: EncounterSession): string {
    if (session.role !== "PLAYER" || !session.playerId) {
      throw new AppError(
        403,
        "PLAYER_REQUIRED",
        "Only an authenticated player can perform this action.",
      );
    }
    return session.playerId;
  }

  #findEncounter(encounterId: string): EncounterRow | null {
    return (
      (this.#database
        .prepare(
          `SELECT
            id, marker_id AS markerId, player_id AS playerId,
            ghost_model_id AS ghostModelId, required_hits AS requiredHits,
            registered_hits AS registeredHits, status,
            lease_expires_at AS leaseExpiresAt,
            awarded_points AS awardedPoints
          FROM encounters WHERE id = ?`,
        )
        .get(encounterId) as EncounterRow | undefined) ?? null
    );
  }

  #findActiveEncounterForPlayer(
    roomId: string,
    playerId: string,
  ): EncounterRow | null {
    return (
      (this.#database
        .prepare(
          `SELECT
            id, marker_id AS markerId, player_id AS playerId,
            ghost_model_id AS ghostModelId, required_hits AS requiredHits,
            registered_hits AS registeredHits, status,
            lease_expires_at AS leaseExpiresAt,
            awarded_points AS awardedPoints
          FROM encounters
          WHERE room_id = ? AND player_id = ? AND status = 'ACTIVE'`,
        )
        .get(roomId, playerId) as EncounterRow | undefined) ?? null
    );
  }

  #cancelEncounter(
    encounter: EncounterRow,
    status: "ABANDONED" | "EXPIRED" | "CANCELLED",
    now: number,
  ): void {
    this.#database
      .prepare(
        `UPDATE encounters SET status = ?, completed_at = ?
         WHERE id = ? AND status = 'ACTIVE'`,
      )
      .run(status, now, encounter.id);
    this.#database
      .prepare(
        `UPDATE markers SET active_encounter_id = NULL
         WHERE marker_id = ? AND active_encounter_id = ?`,
      )
      .run(encounter.markerId, encounter.id);
  }

  #defeatedPayload(
    encounter: EncounterRow,
    attackId: string,
    duplicate: boolean,
  ): EncounterDefeatedPayload {
    const cooldownUntil = this.#database
      .prepare(
        "SELECT cooldown_until FROM markers WHERE marker_id = ? AND room_id = (SELECT room_id FROM encounters WHERE id = ?)",
      )
      .pluck()
      .get(encounter.markerId, encounter.id) as number | null;
    const score = this.#database
      .prepare("SELECT score FROM players WHERE id = ?")
      .pluck()
      .get(encounter.playerId) as number;
    return {
      encounterId: encounter.id,
      markerId: encounter.markerId,
      attackId,
      pointsAwarded: encounter.awardedPoints,
      score,
      cooldownUntil: cooldownUntil ?? this.#now(),
      duplicate,
    };
  }
}
