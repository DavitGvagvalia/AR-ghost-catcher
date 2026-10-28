import assert from "node:assert/strict";
import test from "node:test";

import type { CreateRoomResponse, JoinRoomResponse } from "@ghost-hunt/shared";

import {
  HOST_SESSION_COOKIE,
  PLAYER_SESSION_COOKIE,
} from "../src/http/cookies.js";
import {
  TEST_ORIGIN,
  cookieFrom,
  createTestRuntime,
} from "./helpers/runtime.js";
import type { AuthenticatedSession } from "../src/domain/room-service.js";

function tokenFromCookie(cookie: string): string {
  const value = cookie.split("=", 2)[1];
  if (!value) throw new Error("Cookie does not contain a token");
  return value;
}

function required<T>(value: T | null | undefined): T {
  assert.ok(value !== null && value !== undefined);
  return value;
}

async function post(
  url: string,
  body: unknown = {},
  cookie?: string,
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

test("marker claims are atomic, room-isolated, and one-per-player", async (t) => {
  const now = 10_000;
  const runtime = await createTestRuntime(
    false,
    { now: () => now, matchDurationMs: 60_000 },
    {
      now: () => now,
      minGhostHits: 3,
      maxGhostHits: 3,
      randomIndex: () => 0,
    },
  );
  t.after(runtime.close);

  const createdResponse = await post(`${runtime.baseUrl}/api/rooms`);
  const created = (await createdResponse.json()) as CreateRoomResponse;
  const code = created.state.room.code;
  const hostCookie = cookieFrom(createdResponse, HOST_SESSION_COOKIE);

  const sessions: AuthenticatedSession[] = [];
  for (const nickname of ["One", "Two"]) {
    const joinedResponse = await post(
      `${runtime.baseUrl}/api/rooms/${code}/join`,
      { nickname },
    );
    const cookie = cookieFrom(joinedResponse, PLAYER_SESSION_COOKIE);
    sessions.push(
      runtime.roomService.authenticateForRoom(code, {
        playerToken: tokenFromCookie(cookie),
      }),
    );
  }
  await post(`${runtime.baseUrl}/api/rooms/${code}/start`, {}, hostCookie);
  const playerOne = required(sessions[0]);
  const playerTwo = required(sessions[1]);

  const first = runtime.encounterService.claim(
    playerOne,
    "marker-01",
    "request-one",
  );
  assert.equal(first.requiredHits, 3);
  assert.equal(first.ghostModelId, "animal-company-ghost");

  assert.throws(
    () =>
      runtime.encounterService.claim(
        playerTwo,
        "marker-01",
        "request-two",
      ),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "MARKER_RESERVED",
  );
  assert.throws(
    () =>
      runtime.encounterService.claim(
        playerOne,
        "marker-02",
        "request-three",
      ),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "PLAYER_HAS_ACTIVE_ENCOUNTER",
  );

  const retried = runtime.encounterService.claim(
    playerOne,
    "marker-01",
    "request-one",
  );
  assert.equal(retried.encounterId, first.encounterId);

  const second = runtime.encounterService.claim(
    playerTwo,
    "marker-02",
    "request-four",
  );
  assert.notEqual(second.encounterId, first.encounterId);
  assert.equal(
    runtime.database
      .prepare("SELECT COUNT(*) FROM encounters WHERE status = 'ACTIVE'")
      .pluck()
      .get(),
    2,
  );
});

test("hits are owned, rate-limited, idempotent, and award once", async (t) => {
  let now = 20_000;
  const runtime = await createTestRuntime(
    false,
    { now: () => now, matchDurationMs: 60_000 },
    {
      now: () => now,
      minGhostHits: 3,
      maxGhostHits: 3,
      minHitIntervalMs: 120,
      markerCooldownMs: 30_000,
      randomIndex: () => 0,
    },
  );
  t.after(runtime.close);

  const createdResponse = await post(`${runtime.baseUrl}/api/rooms`);
  const created = (await createdResponse.json()) as CreateRoomResponse;
  const code = created.state.room.code;
  const hostCookie = cookieFrom(createdResponse, HOST_SESSION_COOKIE);
  const sessions: {
    session: AuthenticatedSession;
    playerId: string;
  }[] = [];
  for (const nickname of ["Owner", "Rival"]) {
    const response = await post(
      `${runtime.baseUrl}/api/rooms/${code}/join`,
      { nickname },
    );
    const joined = (await response.json()) as JoinRoomResponse;
    const cookie = cookieFrom(response, PLAYER_SESSION_COOKIE);
    sessions.push({
      session: runtime.roomService.authenticateForRoom(code, {
        playerToken: tokenFromCookie(cookie),
      }),
      playerId: required(joined.state.currentPlayerId),
    });
  }
  await post(`${runtime.baseUrl}/api/rooms/${code}/start`, {}, hostCookie);
  const owner = required(sessions[0]);
  const rival = required(sessions[1]);

  const claim = runtime.encounterService.claim(
    owner.session,
    "marker-03",
    "claim-hit-test",
  );
  assert.throws(
    () =>
      runtime.encounterService.hit(
        rival.session,
        claim.encounterId,
        "attack-rival",
      ),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "ENCOUNTER_FORBIDDEN",
  );

  const first = runtime.encounterService.hit(
    owner.session,
    claim.encounterId,
    "attack-1",
  );
  assert.ok("remainingHits" in first);
  if ("remainingHits" in first) assert.equal(first.remainingHits, 2);
  const duplicate = runtime.encounterService.hit(
    owner.session,
    claim.encounterId,
    "attack-1",
  );
  assert.ok("duplicate" in duplicate && duplicate.duplicate);
  assert.throws(
    () =>
      runtime.encounterService.hit(
        owner.session,
        claim.encounterId,
        "attack-too-fast",
      ),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "HIT_TOO_FAST",
  );

  now += 120;
  runtime.encounterService.hit(
    owner.session,
    claim.encounterId,
    "attack-2",
  );
  now += 120;
  const defeated = runtime.encounterService.hit(
    owner.session,
    claim.encounterId,
    "attack-3",
  );
  assert.ok("pointsAwarded" in defeated);
  if (!("pointsAwarded" in defeated)) return;
  assert.equal(defeated.pointsAwarded, 3);
  assert.equal(defeated.score, 3);
  assert.equal(defeated.cooldownUntil, now + 30_000);

  const duplicateDefeat = runtime.encounterService.hit(
    owner.session,
    claim.encounterId,
    "attack-3",
  );
  assert.ok("pointsAwarded" in duplicateDefeat);
  if ("pointsAwarded" in duplicateDefeat) {
    assert.equal(duplicateDefeat.pointsAwarded, 3);
    assert.equal(duplicateDefeat.score, 3);
    assert.equal(duplicateDefeat.duplicate, true);
  }
  assert.equal(
    runtime.database.prepare("SELECT COUNT(*) FROM score_events").pluck().get(),
    1,
  );

  assert.throws(
    () =>
      runtime.encounterService.claim(
        rival.session,
        "marker-03",
        "during-cooldown",
      ),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "MARKER_COOLDOWN",
  );
  now = defeated.cooldownUntil;
  const afterCooldown = runtime.encounterService.claim(
    rival.session,
    "marker-03",
    "after-cooldown",
  );
  assert.equal(afterCooldown.markerId, "marker-03");
});

test("abandon, disconnect, lease expiry, and deadline release without points", async (t) => {
  let now = 30_000;
  const runtime = await createTestRuntime(
    false,
    { now: () => now, matchDurationMs: 5_000 },
    {
      now: () => now,
      encounterLeaseMs: 500,
      minGhostHits: 3,
      maxGhostHits: 3,
      randomIndex: () => 0,
    },
  );
  t.after(runtime.close);

  const createdResponse = await post(`${runtime.baseUrl}/api/rooms`);
  const created = (await createdResponse.json()) as CreateRoomResponse;
  const code = created.state.room.code;
  const hostCookie = cookieFrom(createdResponse, HOST_SESSION_COOKIE);
  const joinedResponse = await post(
    `${runtime.baseUrl}/api/rooms/${code}/join`,
    { nickname: "Lease" },
  );
  const playerCookie = cookieFrom(joinedResponse, PLAYER_SESSION_COOKIE);
  const session = runtime.roomService.authenticateForRoom(code, {
    playerToken: tokenFromCookie(playerCookie),
  });
  await post(`${runtime.baseUrl}/api/rooms/${code}/start`, {}, hostCookie);

  const abandoned = runtime.encounterService.claim(
    session,
    "marker-04",
    "abandon-claim",
  );
  runtime.encounterService.abandon(session, abandoned.encounterId);
  assert.equal(
    runtime.encounterService.getRoomSnapshot(session.roomId, session.playerId)
      .markers.find((marker) => marker.markerId === "marker-04")?.status,
    "AVAILABLE",
  );

  const lease = runtime.encounterService.claim(
    session,
    "marker-05",
    "lease-claim",
  );
  now = lease.leaseExpiresAt;
  const afterLease = runtime.encounterService.getRoomSnapshot(
    session.roomId,
    session.playerId,
  );
  assert.equal(afterLease.activeEncounter, null);
  assert.equal(
    afterLease.markers.find((marker) => marker.markerId === "marker-05")?.status,
    "AVAILABLE",
  );

  now = created.state.serverTime + 4_900;
  const deadlineClaim = runtime.encounterService.claim(
    session,
    "marker-06",
    "deadline-claim",
  );
  now = created.state.serverTime + 5_000;
  assert.throws(
    () =>
      runtime.encounterService.hit(
        session,
        deadlineClaim.encounterId,
        "deadline-hit",
      ),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "MATCH_NOT_RUNNING",
  );
  assert.equal(
    runtime.database.prepare("SELECT COUNT(*) FROM score_events").pluck().get(),
    0,
  );
  assert.equal(
    runtime.database
      .prepare("SELECT status FROM encounters WHERE id = ?")
      .pluck()
      .get(deadlineClaim.encounterId),
    "CANCELLED",
  );
});
