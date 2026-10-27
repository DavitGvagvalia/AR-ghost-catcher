import { createHash } from "node:crypto";

import type {
  AppliedMigration,
  GameDatabase,
  Migration,
} from "./migrations/types.js";

const CREATE_MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    checksum TEXT NOT NULL,
    applied_at INTEGER NOT NULL CHECK (applied_at >= 0)
  ) STRICT
`;

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

function validateMigrationOrder(migrations: readonly Migration[]): void {
  let previousVersion = 0;

  for (const migration of migrations) {
    if (
      !Number.isSafeInteger(migration.version) ||
      migration.version <= previousVersion
    ) {
      throw new Error(
        "Migrations must have unique, ascending positive integer versions",
      );
    }

    previousVersion = migration.version;
  }
}

export function runMigrations(
  database: GameDatabase,
  migrations: readonly Migration[],
): void {
  validateMigrationOrder(migrations);
  database.exec(CREATE_MIGRATIONS_TABLE_SQL);

  const applied = database
    .prepare(
      "SELECT version, name, checksum FROM schema_migrations ORDER BY version",
    )
    .all() as AppliedMigration[];
  const appliedByVersion = new Map(
    applied.map((migration) => [migration.version, migration]),
  );
  const knownVersions = new Set(
    migrations.map((migration) => migration.version),
  );

  for (const migration of applied) {
    if (!knownVersions.has(migration.version)) {
      throw new Error(
        `Database contains unknown migration version ${migration.version} (${migration.name})`,
      );
    }
  }

  const insertMigration = database.prepare(`
    INSERT INTO schema_migrations (version, name, checksum, applied_at)
    VALUES (?, ?, ?, ?)
  `);

  for (const migration of migrations) {
    const expectedChecksum = checksum(migration.sql);
    const existing = appliedByVersion.get(migration.version);

    if (existing) {
      if (
        existing.name !== migration.name ||
        existing.checksum !== expectedChecksum
      ) {
        throw new Error(
          `Migration ${migration.version} no longer matches the applied database schema`,
        );
      }
      continue;
    }

    database.transaction(() => {
      database.exec(migration.sql);
      insertMigration.run(
        migration.version,
        migration.name,
        expectedChecksum,
        Date.now(),
      );
    })();
  }
}
