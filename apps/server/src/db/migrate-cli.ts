import { readServerConfig } from "../config.js";
import { openDatabase } from "./connection.js";

const config = readServerConfig();
const database = openDatabase({ path: config.databasePath });

database.close();
console.log(`SQLite migrations are current: ${config.databasePath}`);
