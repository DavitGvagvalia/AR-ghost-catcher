import type { Migration } from "./types.js";

export const claimIdempotencyMigration: Migration = {
  version: 2,
  name: "claim_idempotency",
  sql: `
    ALTER TABLE encounters ADD COLUMN claim_request_id TEXT;

    CREATE UNIQUE INDEX idx_encounters_player_claim_request
      ON encounters(player_id, claim_request_id)
      WHERE claim_request_id IS NOT NULL;
  `,
};
