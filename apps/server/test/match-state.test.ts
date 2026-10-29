import assert from "node:assert/strict";
import test from "node:test";

import type {
  ApiErrorResponse,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomTransitionResponse,
  ResultsResponse,
} from "@ghost-hunt/shared";

import { RoomRepository } from "../src/db/repositories/room-repository.js";
import { RoomService } from "../src/domain/room-service.js";
import {
  HOST_SESSION_COOKIE,
  PLAYER_SESSION_COOKIE,
} from "../src/http/cookies.js";
import {
  TEST_ORIGIN,
  cookieFrom,
  createTestRuntime,
} from "./helpers/runtime.js";

async function post(
  url: string,
  cookie?: string,
  body: unknown = {},
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      Origin: TEST_ORIGIN,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("only the host can start and the server persists the exact deadline", async (t) => {
  let now = 10_000;
  const duration = 75_000;
  const runtime = await createTestRuntime(false, {
    now: () => now,
    matchDurationMs: duration,
  });
  t.after(runtime.close);

  const createResponse = await post(`${runtime.baseUrl}/api/rooms`);
  const created = (await createResponse.json()) as CreateRoomResponse;
  const code = created.state.room.code;
  const hostCookie = cookieFrom(createResponse, HOST_SESSION_COOKIE);

  const joinResponse = await post(
    `${runtime.baseUrl}/api/rooms/${code}/join`,
    undefined,
    { nickname: "Lantern" },
  );
  const playerCookie = cookieFrom(joinResponse, PLAYER_SESSION_COOKIE);

  const playerStart = await post(
    `${runtime.baseUrl}/api/rooms/${code}/start`,
    playerCookie,
  );
  const playerError = (await playerStart.json()) as ApiErrorResponse;
  assert.equal(playerStart.status, 403);
  assert.equal(playerError.error.code, "HOST_REQUIRED");

  const startResponse = await post(
    `${runtime.baseUrl}/api/rooms/${code}/start`,
    hostCookie,
  );
  const started = (await startResponse.json()) as RoomTransitionResponse;
  assert.equal(startResponse.status, 200);
  assert.equal(started.state.room.status, "RUNNING");
  assert.equal(started.state.room.startedAt, now);
  assert.equal(started.state.room.endsAt, now + duration);

  const persisted = runtime.database
    .prepare(
      "SELECT status, started_at AS startedAt, ends_at AS endsAt FROM rooms WHERE code = ?",
    )
    .get(code) as { status: string; startedAt: number; endsAt: number };
  assert.deepEqual(persisted, {
    status: "RUNNING",
    startedAt: now,
    endsAt: now + duration,
  });

  const duplicateStart = await post(
    `${runtime.baseUrl}/api/rooms/${code}/start`,
    hostCookie,
  );
  assert.equal(duplicateStart.status, 409);

  now += 1;
  const earlyEnd = await post(
    `${runtime.baseUrl}/api/rooms/${code}/end`,
    hostCookie,
  );
  const earlyError = (await earlyEnd.json()) as ApiErrorResponse;
  assert.equal(earlyEnd.status, 409);
  assert.equal(earlyError.error.code, "MATCH_STILL_RUNNING");
});

test("the authoritative deadline cancels encounters and finalization is idempotent", async (t) => {
  let now = 50_000;
  const duration = 5_000;
  const runtime = await createTestRuntime(false, {
    now: () => now,
    matchDurationMs: duration,
  });
  t.after(runtime.close);

  const createResponse = await post(`${runtime.baseUrl}/api/rooms`);
  const created = (await createResponse.json()) as CreateRoomResponse;
  const code = created.state.room.code;
  const hostCookie = cookieFrom(createResponse, HOST_SESSION_COOKIE);
  const roomId = runtime.database
    .prepare("SELECT id FROM rooms WHERE code = ?")
    .pluck()
    .get(code) as string;

  const joinResponse = await post(
    `${runtime.baseUrl}/api/rooms/${code}/join`,
    undefined,
    { nickname: "Wisp" },
  );
  const joined = (await joinResponse.json()) as JoinRoomResponse;
  const playerCookie = cookieFrom(joinResponse, PLAYER_SESSION_COOKIE);
  const playerId = joined.state.currentPlayerId;
  assert.ok(playerId);

  const startResponse = await post(
    `${runtime.baseUrl}/api/rooms/${code}/start`,
    hostCookie,
  );
  const started = (await startResponse.json()) as RoomTransitionResponse;
  assert.equal(started.state.room.status, "RUNNING");

  runtime.database.transaction(() => {
    runtime.database
      .prepare(
        `INSERT INTO encounters (
          id, room_id, marker_id, player_id, ghost_model_id,
          required_hits, status, claimed_at, lease_expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      )
      .run(
        "encounter-deadline",
        roomId,
        "marker-01",
        playerId,
        "animal-company-ghost",
        3,
        now,
        now + 60_000,
      );
    runtime.database
      .prepare(
        "UPDATE markers SET active_encounter_id = ? WHERE room_id = ? AND marker_id = ?",
      )
      .run("encounter-deadline", roomId, "marker-01");
  })();

  now = started.state.room.endsAt ?? 0;
  const deadlineState = await fetch(
    `${runtime.baseUrl}/api/rooms/${code}/state`,
    { headers: { Cookie: playerCookie } },
  );
  const expired = (await deadlineState.json()) as {
    state: JoinRoomResponse["state"];
  };
  assert.equal(expired.state.room.status, "AWAITING_FINALIZATION");
  assert.deepEqual(
    runtime.database
      .prepare(
        "SELECT status, completed_at AS completedAt FROM encounters WHERE id = ?",
      )
      .get("encounter-deadline"),
    { status: "CANCELLED", completedAt: now },
  );
  assert.equal(
    runtime.database
      .prepare(
        "SELECT active_encounter_id FROM markers WHERE room_id = ? AND marker_id = ?",
      )
      .pluck()
      .get(roomId, "marker-01"),
    null,
  );

  const endResponse = await post(
    `${runtime.baseUrl}/api/rooms/${code}/end`,
    hostCookie,
  );
  const finished = (await endResponse.json()) as RoomTransitionResponse;
  assert.equal(endResponse.status, 200);
  assert.equal(finished.state.room.status, "FINISHED");
  assert.equal(finished.state.room.finalizedAt, now);

  now += 5_000;
  const duplicateEnd = await post(
    `${runtime.baseUrl}/api/rooms/${code}/end`,
    hostCookie,
  );
  const unchanged = (await duplicateEnd.json()) as RoomTransitionResponse;
  assert.equal(duplicateEnd.status, 200);
  assert.equal(
    unchanged.state.room.finalizedAt,
    finished.state.room.finalizedAt,
  );
});

test("startup recovery advances every persisted overdue match", async (t) => {
  let now = 100_000;
  const runtime = await createTestRuntime(false, { now: () => now });
  t.after(runtime.close);

  const firstResponse = await post(`${runtime.baseUrl}/api/rooms`);
  const first = (await firstResponse.json()) as CreateRoomResponse;
  const secondResponse = await post(`${runtime.baseUrl}/api/rooms`);
  const second = (await secondResponse.json()) as CreateRoomResponse;

  runtime.database
    .prepare(
      `UPDATE rooms
       SET status = 'RUNNING', started_at = ?, ends_at = ?
       WHERE code IN (?, ?)`,
    )
    .run(now - 10_000, now - 1, first.state.room.code, second.state.room.code);

  const restartedService = new RoomService(
    new RoomRepository(runtime.database),
    { now: () => now },
  );
  const expiredIds = restartedService.expireDueRooms();
  assert.equal(expiredIds.length, 2);
  assert.equal(
    runtime.database
      .prepare(
        "SELECT COUNT(*) FROM rooms WHERE status = 'AWAITING_FINALIZATION'",
      )
      .pluck()
      .get(),
    2,
  );

  now += 1;
  assert.deepEqual(restartedService.expireDueRooms(), []);
});

test("final results expose co-winners with deterministic tied ordering", async (t) => {
  const runtime = await createTestRuntime();
  t.after(runtime.close);

  const createResponse = await post(`${runtime.baseUrl}/api/rooms`);
  const created = (await createResponse.json()) as CreateRoomResponse;
  const code = created.state.room.code;
  let playerCookie = "";
  const joinedPlayers: { id: string; nickname: string }[] = [];

  for (const nickname of ["Boo", "Alpha", "Alpha"]) {
    const response = await post(
      `${runtime.baseUrl}/api/rooms/${code}/join`,
      undefined,
      { nickname },
    );
    playerCookie = cookieFrom(response, PLAYER_SESSION_COOKIE);
    const joined = (await response.json()) as JoinRoomResponse;
    assert.ok(joined.state.currentPlayerId);
    joinedPlayers.push({ id: joined.state.currentPlayerId, nickname });
  }

  assert.equal(joinedPlayers.length, 3);
  runtime.database
    .prepare("UPDATE players SET score = 7 WHERE id IN (?, ?)")
    .run(joinedPlayers[0]?.id, joinedPlayers[1]?.id);
  runtime.database
    .prepare("UPDATE players SET score = 3 WHERE id = ?")
    .run(joinedPlayers[2]?.id);
  runtime.database
    .prepare(
      "UPDATE rooms SET status = 'FINISHED', finalized_at = ? WHERE code = ?",
    )
    .run(123_456, code);

  const response = await fetch(`${runtime.baseUrl}/api/rooms/${code}/results`, {
    headers: { Cookie: playerCookie },
  });
  const body = (await response.json()) as ResultsResponse;
  assert.equal(response.status, 200);
  assert.equal(body.results.finalizedAt, 123_456);
  assert.equal(body.results.topScore, 7);
  assert.deepEqual(
    body.results.leaderboard.map((entry) => [
      entry.rank,
      entry.nickname,
      entry.score,
      entry.isWinner,
    ]),
    [
      [1, "Alpha", 7, true],
      [1, "Boo", 7, true],
      [3, "Alpha", 3, false],
    ],
  );
  assert.deepEqual(
    new Set(body.results.winners),
    new Set([joinedPlayers[0]?.id, joinedPlayers[1]?.id]),
  );
});
