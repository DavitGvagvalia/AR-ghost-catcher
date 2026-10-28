import { initialSchemaMigration } from "./001-initial-schema.js";
import { claimIdempotencyMigration } from "./002-claim-idempotency.js";
import type { Migration } from "./types.js";

export const migrations: readonly Migration[] = [
  initialSchemaMigration,
  claimIdempotencyMigration,
];
