import { MARKER_IDS, ROOM_STATUSES } from "@ghost-hunt/shared";

import type { Migration } from "./types.js";

function quoteSqlValues(values: readonly string[]): string {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", ");
}

const roomStatuses = quoteSqlValues(ROOM_STATUSES);
const markerIds = quoteSqlValues(MARKER_IDS);

export const initialSchemaMigration: Migration = {
  version: 1,
  name: "initial_schema",
  sql: `
    CREATE TABLE rooms (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      host_token_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN (${roomStatuses})),
      created_at INTEGER NOT NULL CHECK (created_at >= 0),
      started_at INTEGER CHECK (started_at IS NULL OR started_at >= 0),
      ends_at INTEGER CHECK (ends_at IS NULL OR ends_at >= 0),
      finalized_at INTEGER CHECK (finalized_at IS NULL OR finalized_at >= 0)
    ) STRICT;

    CREATE TABLE players (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      nickname TEXT NOT NULL,
      resume_token_hash TEXT NOT NULL UNIQUE,
      score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
      joined_at INTEGER NOT NULL CHECK (joined_at >= 0),
      last_seen_at INTEGER CHECK (last_seen_at IS NULL OR last_seen_at >= 0),
      is_connected INTEGER NOT NULL DEFAULT 0 CHECK (is_connected IN (0, 1)),
      UNIQUE (room_id, id)
    ) STRICT;

    CREATE TABLE markers (
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      marker_id TEXT NOT NULL CHECK (marker_id IN (${markerIds})),
      active_encounter_id TEXT,
      cooldown_until INTEGER CHECK (
        cooldown_until IS NULL OR cooldown_until >= 0
      ),
      PRIMARY KEY (room_id, marker_id),
      FOREIGN KEY (room_id, active_encounter_id)
        REFERENCES encounters(room_id, id)
        DEFERRABLE INITIALLY DEFERRED
    ) STRICT;

    CREATE TABLE encounters (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      marker_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      ghost_model_id TEXT NOT NULL,
      required_hits INTEGER NOT NULL CHECK (required_hits > 0),
      registered_hits INTEGER NOT NULL DEFAULT 0 CHECK (
        registered_hits >= 0 AND registered_hits <= required_hits
      ),
      status TEXT NOT NULL CHECK (
        status IN ('ACTIVE', 'DEFEATED', 'ABANDONED', 'EXPIRED', 'CANCELLED')
      ),
      claimed_at INTEGER NOT NULL CHECK (claimed_at >= 0),
      lease_expires_at INTEGER NOT NULL CHECK (lease_expires_at >= claimed_at),
      completed_at INTEGER CHECK (completed_at IS NULL OR completed_at >= claimed_at),
      awarded_points INTEGER NOT NULL DEFAULT 0 CHECK (awarded_points >= 0),
      UNIQUE (room_id, id),
      FOREIGN KEY (room_id, marker_id)
        REFERENCES markers(room_id, marker_id) ON DELETE CASCADE,
      FOREIGN KEY (room_id, player_id)
        REFERENCES players(room_id, id) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE score_events (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      encounter_id TEXT NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE CASCADE,
      points INTEGER NOT NULL CHECK (points > 0),
      created_at INTEGER NOT NULL CHECK (created_at >= 0)
    ) STRICT;

    CREATE TABLE encounter_hits (
      encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
      attack_id TEXT NOT NULL,
      accepted_at INTEGER NOT NULL CHECK (accepted_at >= 0),
      PRIMARY KEY (encounter_id, attack_id)
    ) STRICT;

    CREATE INDEX idx_players_room_id ON players(room_id);
    CREATE INDEX idx_players_room_connected ON players(room_id, is_connected);
    CREATE INDEX idx_rooms_status ON rooms(status);
    CREATE INDEX idx_encounters_room_status ON encounters(room_id, status);
    CREATE INDEX idx_encounters_player_status ON encounters(player_id, status);
    CREATE UNIQUE INDEX idx_one_active_encounter_per_player
      ON encounters(player_id) WHERE status = 'ACTIVE';
    CREATE INDEX idx_markers_room_cooldown ON markers(room_id, cooldown_until);
    CREATE INDEX idx_score_events_room_player ON score_events(room_id, player_id);
  `,
};
