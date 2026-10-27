import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

import { migrations } from "./migrations/index.js";
import type { GameDatabase } from "./migrations/types.js";
import { runMigrations } from "./migrate.js";

export interface OpenDatabaseOptions {
  path: string;
  migrate?: boolean;
}

export function openDatabase({
  path,
  migrate = true,
}: OpenDatabaseOptions): GameDatabase {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const database = new Database(path);

  try {
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");
    database.pragma("journal_mode = WAL");

    if (migrate) {
      runMigrations(database, migrations);
    }

    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
