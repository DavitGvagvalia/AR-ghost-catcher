import assert from "node:assert/strict";
import test from "node:test";

import type {
  ClientToServerEvents,
  CreateRoomResponse,
  JoinRoomResponse,
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

function connectSocket(baseUrl: string, cookie?: string): GameClientSocket {
  return createClient(baseUrl, {
    autoConnect: false,
    transports: ["websocket"],
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
  const hostSocket = connectSocket(runtime.baseUrl, room.cookie);
  const playerSocket = connectSocket(runtime.baseUrl, player.cookie);
  t.after(() => {
    hostSocket.disconnect();
    playerSocket.disconnect();
  });

  await waitForConnect(hostSocket);
  const hostSubscription = await subscribe(
    hostSocket,
    room.body.state.room.code,
  );
  assert.equal(hostSubscription.ok, true);

  const connectedState = waitForRoomState(
    hostSocket,
    (state) => state.players[0]?.isConnected === true,
  );
  await waitForConnect(playerSocket);
  const playerSubscription = await subscribe(
    playerSocket,
    room.body.state.room.code,
  );
  assert.equal(playerSubscription.ok, true);
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
  const socket = connectSocket(runtime.baseUrl);
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

  assert.match(error.message, /join or create a room/iu);
});
