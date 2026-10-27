import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { HealthResponse } from "@ghost-hunt/shared";

import { createApp } from "../src/app.js";
import { openDatabase } from "../src/db/connection.js";

test("GET /api/health reports an actual SQLite readiness check", async (t) => {
  const database = openDatabase({ path: ":memory:" });
  const server = createApp(database).listen(0, "127.0.0.1");

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          database.close();
          if (error) reject(error);
          else resolve();
        });
      }),
  );

  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  const body = (await response.json()) as HealthResponse;

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.database, "ready");
  assert.equal(typeof body.serverTime, "number");
});
