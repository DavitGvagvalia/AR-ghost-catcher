import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import { createApp } from "../../src/app.js";
import { openDatabase } from "../../src/db/connection.js";
import type { GameDatabase } from "../../src/db/migrations/types.js";
import { RoomRepository } from "../../src/db/repositories/room-repository.js";
import { RoomEvents } from "../../src/domain/room-events.js";
import { RoomService } from "../../src/domain/room-service.js";
import type { RoomServiceOptions } from "../../src/domain/room-service.js";
import {
  EncounterService,
  type EncounterServiceOptions,
} from "../../src/domain/encounter-service.js";
import {
  createSocketServer,
  type SocketRateLimitOptions,
  type GameSocketServer,
} from "../../src/sockets/handlers.js";

export const TEST_ORIGIN = "http://localhost:3000";

export interface TestRuntime {
  database: GameDatabase;
  roomService: RoomService;
  roomEvents: RoomEvents;
  encounterService: EncounterService;
  server: HttpServer;
  io?: GameSocketServer;
  baseUrl: string;
  close: () => Promise<void>;
}

export async function createTestRuntime(
  withSockets = false,
  roomServiceOptions: RoomServiceOptions = {},
  encounterServiceOptions: EncounterServiceOptions = {},
  socketRateLimitOptions: SocketRateLimitOptions = {},
  databasePath = ":memory:",
): Promise<TestRuntime> {
  const database = openDatabase({ path: databasePath });
  const encounterService = new EncounterService(database, {
    ...(roomServiceOptions.now ? { now: roomServiceOptions.now } : {}),
    ...encounterServiceOptions,
  });
  const roomService = new RoomService(new RoomRepository(database), {
    ...roomServiceOptions,
    encounterService,
  });
  const roomEvents = new RoomEvents();
  const server = createServer(
    createApp(database, {
      publicOrigin: TEST_ORIGIN,
      roomService,
      roomEvents,
      secureCookies: false,
    }),
  );
  const io = withSockets
    ? createSocketServer(
        server,
        roomService,
        roomEvents,
        encounterService,
        TEST_ORIGIN,
        socketRateLimitOptions,
      )
    : undefined;

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
    server.listen(0, "127.0.0.1");
  });

  const address = server.address() as AddressInfo;

  return {
    database,
    roomService,
    roomEvents,
    encounterService,
    server,
    ...(io ? { io } : {}),
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      if (io) {
        await new Promise<void>((resolve) => io.close(() => resolve()));
      } else {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
      database.close();
    },
  };
}

export function cookieFrom(response: Response, name: string): string {
  const cookie = response.headers
    .getSetCookie()
    .find((header) => header.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Response did not set ${name}`);
  const value = cookie.split(";", 1)[0];
  if (!value) throw new Error(`Response set an empty ${name}`);
  return value;
}
