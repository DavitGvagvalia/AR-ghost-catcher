import assert from "node:assert/strict";
import test from "node:test";

import type {
  ClientToServerEvents,
  CreateRoomResponse,
  EncounterClaimedPayload,
  EncounterDefeatedPayload,
  EncounterHitResultPayload,
  GameActionResult,
  JoinRoomResponse,
  RoomRole,
  RoomState,
  RoomSubscribeResult,
  ServerToClientEvents,
} from "@ghost-hunt/shared";
import { io as createClient, type Socket } from "socket.io-client";

import {
  HOST_SESSION_COOKIE,
  PLAYER_SESSION_COOKIE,
} from "../src/http/cookies.js";
import {
  TEST_ORIGIN,
  cookieFrom,
  createTestRuntime,
} from "./helpers/runtime.js";

type GameClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

async function createRoom(baseUrl: string): Promise<{
  body: CreateRoomResponse;
  cookie: string;
}> {
  const response = await fetch(`${baseUrl}/api/rooms`, {
    method: "POST",
    headers: { Origin: TEST_ORIGIN },
  });
  return {
    body: (await response.json()) as CreateRoomResponse,
    cookie: cookieFrom(response, HOST_SESSION_COOKIE),
  };
}

async function joinRoom(
  baseUrl: string,
  roomCode: string,
): Promise<{
  body: JoinRoomResponse;
  cookie: string;
}> {
  const response = await fetch(`${baseUrl}/api/rooms/${roomCode}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: TEST_ORIGIN },
    body: JSON.stringify({ nickname: "Socket Ghost" }),
  });
  return {
    body: (await response.json()) as JoinRoomResponse,
    cookie: cookieFrom(response, PLAYER_SESSION_COOKIE),
  };
}

function connectSocket(
  baseUrl: string,
  roomCode: string,
  role: RoomRole,
  cookie?: string,
): GameClientSocket {
  return createClient(baseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    auth: { roomCode, role },
    extraHeaders: {
      Origin: TEST_ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
}

async function waitForConnect(socket: GameClientSocket): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Socket connect timed out")),
      2_000,
    );
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("connect_error", reject);
    socket.connect();
  });
}

async function subscribe(
  socket: GameClientSocket,
  roomCode: string,
): Promise<RoomSubscribeResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Room subscribe timed out")),
      2_000,
    );
    socket.emit("room:subscribe", { roomCode }, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });
  });
}

async function claimMarker(
  socket: GameClientSocket,
  markerId: "marker-01",
  requestId: string,
): Promise<GameActionResult<EncounterClaimedPayload>> {
  return new Promise((resolve) => {
    socket.emit("marker:claim", { markerId, requestId }, resolve);
  });
}

async function hitEncounter(
  socket: GameClientSocket,
  encounterId: string,
  attackId: string,
): Promise<
  GameActionResult<EncounterHitResultPayload | EncounterDefeatedPayload>
> {
  return new Promise((resolve) => {
    socket.emit("encounter:hit", { encounterId, attackId }, resolve);
  });
}

function waitForRoomState(
  socket: GameClientSocket,
  predicate: (state: RoomState) => boolean,
): Promise<RoomState> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("room:state", listener);
      reject(new Error("Expected room state was not received"));
    }, 2_000);
    const listener = (state: RoomState): void => {
      if (!predicate(state)) return;
      clearTimeout(timeout);
      socket.off("room:state", listener);
      resolve(state);
    };
    socket.on("room:state", listener);
  });
}

test("Socket.IO authenticates cookies, isolates rooms, and broadcasts presence", async (t) => {
  const runtime = await createTestRuntime(true);
  t.after(runtime.close);
  const room = await createRoom(runtime.baseUrl);
  const player = await joinRoom(runtime.baseUrl, room.body.state.room.code);
  const roomCode = room.body.state.room.code;
  const combinedCookies = `${room.cookie}; ${player.cookie}`;
  const hostSocket = connectSocket(
    runtime.baseUrl,
    roomCode,
    "HOST",
    combinedCookies,
  );
  const playerSocket = connectSocket(
    runtime.baseUrl,
    roomCode,
    "PLAYER",
    combinedCookies,
  );
  t.after(() => {
    hostSocket.disconnect();
    playerSocket.disconnect();
  });

  await waitForConnect(hostSocket);
  const hostSubscription = await subscribe(hostSocket, roomCode);
  assert.equal(hostSubscription.ok, true);
  if (hostSubscription.ok) assert.equal(hostSubscription.state.role, "HOST");

  const connectedState = waitForRoomState(
    hostSocket,
    (state) => state.players[0]?.isConnected === true,
  );
  await waitForConnect(playerSocket);
  const playerSubscription = await subscribe(playerSocket, roomCode);
  assert.equal(playerSubscription.ok, true);
  if (playerSubscription.ok) {
    assert.equal(playerSubscription.state.role, "PLAYER");
    assert.equal(
      playerSubscription.state.currentPlayerId,
      player.body.state.currentPlayerId,
    );
  }
  assert.equal((await connectedState).players[0]?.isConnected, true);

  const wrongRoom = await subscribe(playerSocket, "ZZZZZZ");
  assert.equal(wrongRoom.ok, false);
  if (!wrongRoom.ok) assert.equal(wrongRoom.error.code, "ROOM_FORBIDDEN");

  const disconnectedState = waitForRoomState(
    hostSocket,
    (state) => state.players[0]?.isConnected === false,
  );
  playerSocket.disconnect();
  assert.equal((await disconnectedState).players[0]?.isConnected, false);
});

test("Socket.IO rejects connections without an issued session", async (t) => {
  const runtime = await createTestRuntime(true);
  t.after(runtime.close);
  const room = await createRoom(runtime.baseUrl);
  const socket = connectSocket(
    runtime.baseUrl,
    room.body.state.room.code,
    "HOST",
  );
  t.after(() => socket.disconnect());

  const error = await new Promise<Error>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Expected socket rejection timed out")),
      2_000,
    );
    socket.once("connect_error", (connectionError) => {
      clearTimeout(timeout);
      resolve(connectionError);
    });
    socket.connect();
  });

  assert.match(error.message, /not authorized/iu);
});

test("Socket.IO validates subscribed encounter actions, scores a defeat, and rate-limits claims", async (t) => {
  const runtime = await createTestRuntime(
    true,
    {},
    {
      minGhostHits: 3,
      maxGhostHits: 3,
      minHitIntervalMs: 0,
      randomIndex: () => 0,
    },
    { claimsPerWindow: 1 },
  );
  t.after(runtime.close);
  const room = await createRoom(runtime.baseUrl);
  const roomCode = room.body.state.room.code;
  const player = await joinRoom(runtime.baseUrl, roomCode);

  const startResponse = await fetch(
    `${runtime.baseUrl}/api/rooms/${roomCode}/start`,
    {
      method: "POST",
      headers: { Cookie: room.cookie, Origin: TEST_ORIGIN },
    },
  );
  assert.equal(startResponse.status, 200);

  const socket = connectSocket(
    runtime.baseUrl,
    roomCode,
    "PLAYER",
    player.cookie,
  );
  t.after(() => socket.disconnect());
  await waitForConnect(socket);

  const beforeSubscribe = await claimMarker(
    socket,
    "marker-01",
    "claim-before-subscribe",
  );
  assert.equal(beforeSubscribe.ok, false);
  if (!beforeSubscribe.ok) {
    assert.equal(beforeSubscribe.error.code, "ROOM_NOT_SUBSCRIBED");
  }

  const subscription = await subscribe(socket, roomCode);
  assert.equal(subscription.ok, true);

  const claim = await claimMarker(socket, "marker-01", "claim-transport-01");
  assert.equal(claim.ok, true);
  if (!claim.ok) return;
  assert.equal(claim.data.requiredHits, 3);

  const limitedClaim = await claimMarker(
    socket,
    "marker-01",
    "claim-transport-02",
  );
  assert.equal(limitedClaim.ok, false);
  if (!limitedClaim.ok) {
    assert.equal(limitedClaim.error.code, "ACTION_RATE_LIMITED");
  }

  const firstHit = await hitEncounter(
    socket,
    claim.data.encounterId,
    "attack-01",
  );
  assert.equal(firstHit.ok, true);
  if (firstHit.ok && !("pointsAwarded" in firstHit.data)) {
    assert.equal(firstHit.data.remainingHits, 2);
  }

  const secondHit = await hitEncounter(
    socket,
    claim.data.encounterId,
    "attack-02",
  );
  assert.equal(secondHit.ok, true);
  if (secondHit.ok && !("pointsAwarded" in secondHit.data)) {
    assert.equal(secondHit.data.remainingHits, 1);
  }

  const defeat = await hitEncounter(
    socket,
    claim.data.encounterId,
    "attack-03",
  );
  assert.equal(defeat.ok, true);
  if (defeat.ok && "pointsAwarded" in defeat.data) {
    assert.equal(defeat.data.pointsAwarded, 3);
    assert.equal(defeat.data.score, 3);
  } else {
    assert.fail("Expected the third accepted hit to defeat the encounter");
  }

  socket.disconnect();
  const resumedSocket = connectSocket(
    runtime.baseUrl,
    roomCode,
    "PLAYER",
    player.cookie,
  );
  t.after(() => resumedSocket.disconnect());
  await waitForConnect(resumedSocket);
  const resumed = await subscribe(resumedSocket, roomCode);
  assert.equal(resumed.ok, true);
  if (resumed.ok) {
    const currentPlayer = resumed.state.players.find(
      (entry) => entry.id === resumed.state.currentPlayerId,
    );
    assert.equal(currentPlayer?.score, 3);
    assert.equal(resumed.state.activeEncounter, null);
    assert.equal(
      resumed.state.markers.find((marker) => marker.markerId === "marker-01")
        ?.status,
      "COOLDOWN",
    );
  }
});

test("disconnect releases an unfinished encounter and reconnect returns the authoritative snapshot", async (t) => {
  const runtime = await createTestRuntime(
    true,
    {},
    {
      minGhostHits: 3,
      maxGhostHits: 3,
      minHitIntervalMs: 0,
      randomIndex: () => 0,
    },
  );
  t.after(runtime.close);
  const room = await createRoom(runtime.baseUrl);
  const roomCode = room.body.state.room.code;
  const player = await joinRoom(runtime.baseUrl, roomCode);
  const startResponse = await fetch(
    `${runtime.baseUrl}/api/rooms/${roomCode}/start`,
    {
      method: "POST",
      headers: { Cookie: room.cookie, Origin: TEST_ORIGIN },
    },
  );
  assert.equal(startResponse.status, 200);

  const hostSocket = connectSocket(
    runtime.baseUrl,
    roomCode,
    "HOST",
    room.cookie,
  );
  const playerSocket = connectSocket(
    runtime.baseUrl,
    roomCode,
    "PLAYER",
    player.cookie,
  );
  t.after(() => {
    hostSocket.disconnect();
    playerSocket.disconnect();
  });
  await waitForConnect(hostSocket);
  await subscribe(hostSocket, roomCode);
  await waitForConnect(playerSocket);
  await subscribe(playerSocket, roomCode);

  const claim = await claimMarker(
    playerSocket,
    "marker-01",
    "disconnect-claim",
  );
  assert.equal(claim.ok, true);
  if (!claim.ok) return;
  const hit = await hitEncounter(
    playerSocket,
    claim.data.encounterId,
    "disconnect-hit",
  );
  assert.equal(hit.ok, true);

  const releasedState = waitForRoomState(
    hostSocket,
    (state) =>
      state.players[0]?.isConnected === false &&
      state.markers.find((marker) => marker.markerId === "marker-01")
        ?.status === "AVAILABLE",
  );
  playerSocket.disconnect();
  const released = await releasedState;
  assert.equal(released.players[0]?.score, 0);

  const reconnectedSocket = connectSocket(
    runtime.baseUrl,
    roomCode,
    "PLAYER",
    player.cookie,
  );
  t.after(() => reconnectedSocket.disconnect());
  await waitForConnect(reconnectedSocket);
  const synchronized = await subscribe(reconnectedSocket, roomCode);
  assert.equal(synchronized.ok, true);
  if (synchronized.ok) {
    assert.equal(synchronized.state.activeEncounter, null);
    assert.equal(
      synchronized.state.markers.find(
        (marker) => marker.markerId === "marker-01",
      )?.status,
      "AVAILABLE",
    );
    assert.equal(
      synchronized.state.players.find(
        (entry) => entry.id === synchronized.state.currentPlayerId,
      )?.score,
      0,
    );
  }
});
