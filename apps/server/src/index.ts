import { createServer } from "node:http";

import { createApp } from "./app.js";
import { readServerConfig } from "./config.js";
import { openDatabase } from "./db/connection.js";

const config = readServerConfig();
const database = openDatabase({ path: config.databasePath });
const httpServer = createServer(createApp(database));

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

  httpServer.close((error) => {
    database.close();

    if (error) {
      console.error("Failed to close HTTP server cleanly", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
