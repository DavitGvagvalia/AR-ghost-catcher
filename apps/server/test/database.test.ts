import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { openDatabase } from "../src/db/connection.js";

test("database startup enables WAL and foreign keys and applies migrations", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "ghost-hunt-db-"));
  const databasePath = join(directory, "test.sqlite");
  t.after(async () => rm(directory, { force: true, recursive: true }));

  const database = openDatabase({ path: databasePath });

  assert.equal(database.pragma("journal_mode", { simple: true }), "wal");
  assert.equal(database.pragma("foreign_keys", { simple: true }), 1);
  assert.equal(
    database
      .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
      .pluck()
      .get(),
    1,
  );

  const tables = database
    .prepare(
      "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name",
    )
    .pluck()
    .all();

  assert.deepEqual(tables, [
    "encounter_hits",
    "encounters",
    "markers",
    "players",
    "rooms",
    "schema_migrations",
    "score_events",
  ]);

  database.close();

  const reopened = openDatabase({ path: databasePath });
  assert.equal(
    reopened
      .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
      .pluck()
      .get(),
    1,
  );
  reopened.close();
});

test("the database rejects marker IDs outside the canonical set", () => {
  const database = openDatabase({ path: ":memory:" });
  const now = Date.now();

  database
    .prepare(
      `INSERT INTO rooms (id, code, host_token_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run("room-1", "ROOM1", "test-host-token-hash", "LOBBY", now);

  assert.throws(() =>
    database
      .prepare("INSERT INTO markers (room_id, marker_id) VALUES (?, ?)")
      .run("room-1", "marker-31"),
  );

  database.close();
});
