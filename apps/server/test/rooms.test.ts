import assert from "node:assert/strict";
import test from "node:test";

import type {
  ApiErrorResponse,
  CreateRoomResponse,
  JoinRoomResponse,
} from "@ghost-hunt/shared";

import {
  HOST_SESSION_COOKIE,
  PLAYER_SESSION_COOKIE,
} from "../src/http/cookies.js";
import {
  TEST_ORIGIN,
  cookieFrom,
  createTestRuntime,
} from "./helpers/runtime.js";

async function postJson(
  url: string,
  body: unknown,
  cookie?: string,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: TEST_ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("room creation issues an HttpOnly host session and initializes 30 markers", async (t) => {
  const runtime = await createTestRuntime();
  t.after(runtime.close);

  const response = await postJson(`${runtime.baseUrl}/api/rooms`, {});
  const body = (await response.json()) as CreateRoomResponse;
  const hostCookie = cookieFrom(response, HOST_SESSION_COOKIE);

  assert.equal(response.status, 201);
  assert.match(body.state.room.code, /^[A-HJ-NP-Z2-9]{6}$/u);
  assert.equal(body.state.role, "HOST");
  assert.equal(body.state.currentPlayerId, null);
  assert.equal(body.state.players.length, 0);
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/iu);
  assert.doesNotMatch(JSON.stringify(body), /token/iu);
  assert.equal(
    runtime.database.prepare("SELECT COUNT(*) FROM markers").pluck().get(),
    30,
  );

  const unauthorized = await fetch(
    `${runtime.baseUrl}/api/rooms/${body.state.room.code}/state`,
  );
  assert.equal(unauthorized.status, 401);

  const authorized = await fetch(
    `${runtime.baseUrl}/api/rooms/${body.state.room.code}/state`,
    { headers: { Cookie: hostCookie } },
  );
  assert.equal(authorized.status, 200);
});

test("join validates nicknames, permits duplicates, normalizes room codes, and resumes by cookie", async (t) => {
  const runtime = await createTestRuntime();
  t.after(runtime.close);

  const createResponse = await postJson(`${runtime.baseUrl}/api/rooms`, {});
  const created = (await createResponse.json()) as CreateRoomResponse;
  const roomCode = created.state.room.code;

  const shortName = await postJson(
    `${runtime.baseUrl}/api/rooms/${roomCode}/join`,
    { nickname: "X" },
  );
  assert.equal(shortName.status, 400);

  const unsafeName = await postJson(
    `${runtime.baseUrl}/api/rooms/${roomCode}/join`,
    { nickname: "<script>" },
  );
  assert.equal(unsafeName.status, 400);

  const firstResponse = await postJson(
    `${runtime.baseUrl}/api/rooms/${roomCode.toLowerCase()}/join`,
    { nickname: "  Boo  " },
  );
  const first = (await firstResponse.json()) as JoinRoomResponse;
  const firstCookie = cookieFrom(firstResponse, PLAYER_SESSION_COOKIE);
  assert.equal(firstResponse.status, 201);
  assert.equal(first.state.players[0]?.nickname, "Boo");
  assert.equal(first.state.currentPlayerId, first.state.players[0]?.id);

  const secondResponse = await postJson(
    `${runtime.baseUrl}/api/rooms/${roomCode}/join`,
    { nickname: "Boo" },
  );
  const second = (await secondResponse.json()) as JoinRoomResponse;
  assert.equal(secondResponse.status, 201);
  assert.equal(second.state.players.length, 2);
  assert.notEqual(second.state.players[0]?.id, second.state.players[1]?.id);

  const resumeResponse = await postJson(
    `${runtime.baseUrl}/api/rooms/${roomCode}/resume`,
    {},
    firstCookie,
  );
  const resumed = (await resumeResponse.json()) as JoinRoomResponse;
  assert.equal(resumeResponse.status, 200);
  assert.equal(resumed.state.currentPlayerId, first.state.currentPlayerId);
});

test("player credentials are room-scoped and new joins stop after the lobby", async (t) => {
  const runtime = await createTestRuntime();
  t.after(runtime.close);

  const roomOneResponse = await postJson(`${runtime.baseUrl}/api/rooms`, {});
  const roomOne = (await roomOneResponse.json()) as CreateRoomResponse;
  const joinResponse = await postJson(
    `${runtime.baseUrl}/api/rooms/${roomOne.state.room.code}/join`,
    { nickname: "Specter" },
  );
  const playerCookie = cookieFrom(joinResponse, PLAYER_SESSION_COOKIE);

  const roomTwoResponse = await postJson(`${runtime.baseUrl}/api/rooms`, {});
  const roomTwo = (await roomTwoResponse.json()) as CreateRoomResponse;
  const crossRoom = await fetch(
    `${runtime.baseUrl}/api/rooms/${roomTwo.state.room.code}/state`,
    { headers: { Cookie: playerCookie } },
  );
  assert.equal(crossRoom.status, 401);

  runtime.database
    .prepare(
      "UPDATE rooms SET status = 'RUNNING', started_at = ?, ends_at = ? WHERE code = ?",
    )
    .run(Date.now(), Date.now() + 60_000, roomOne.state.room.code);
  const lateJoin = await postJson(
    `${runtime.baseUrl}/api/rooms/${roomOne.state.room.code}/join`,
    { nickname: "Late Ghost" },
  );
  const lateJoinBody = (await lateJoin.json()) as ApiErrorResponse;
  assert.equal(lateJoin.status, 409);
  assert.equal(lateJoinBody.error.code, "ROOM_NOT_JOINABLE");
});

test("state-changing requests reject an untrusted browser origin", async (t) => {
  const runtime = await createTestRuntime();
  t.after(runtime.close);

  const response = await fetch(`${runtime.baseUrl}/api/rooms`, {
    method: "POST",
    headers: { Origin: "https://attacker.example" },
  });
  const body = (await response.json()) as ApiErrorResponse;
  assert.equal(response.status, 403);
  assert.equal(body.error.code, "ORIGIN_FORBIDDEN");
});
