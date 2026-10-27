import { createServer } from "node:http";

import { createApp } from "./app.js";
import { readServerConfig } from "./config.js";
import { openDatabase } from "./db/connection.js";
import { RoomRepository } from "./db/repositories/room-repository.js";
import { RoomEvents } from "./domain/room-events.js";
import { RoomService } from "./domain/room-service.js";
import { MatchExpirationJob } from "./jobs/match-expiration.js";
import { createSocketServer } from "./sockets/handlers.js";

const config = readServerConfig();
const database = openDatabase({ path: config.databasePath });
const roomService = new RoomService(new RoomRepository(database), {
  matchDurationMs: config.matchDurationMs,
});
roomService.resetAllPresence();
roomService.expireDueRooms();
const roomEvents = new RoomEvents();
const app = createApp(database, {
  publicOrigin: config.publicOrigin,
  roomService,
  roomEvents,
  secureCookies: config.nodeEnv === "production",
});
const httpServer = createServer(app);
const io = createSocketServer(
  httpServer,
  roomService,
  roomEvents,
  config.publicOrigin,
);
const matchExpirationJob = new MatchExpirationJob(roomService, roomEvents);
matchExpirationJob.start();

httpServer.listen(config.apiPort, () => {
  console.log(`Ghost Hunt API listening on http://localhost:${config.apiPort}`);
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Received ${signal}; closing server`);
  matchExpirationJob.stop();

  io.close(() => {
    database.close();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
