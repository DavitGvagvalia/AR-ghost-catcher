/* global console, process, URL */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const environmentPath = resolve(repositoryRoot, ".env");
if (existsSync(environmentPath)) loadEnvFile(environmentPath);

const command = process.argv[2];
if (command !== "dev" && command !== "start") {
  throw new Error("run-next expects either dev or start");
}

const port = Number(process.env.WEB_PORT ?? "3000");
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("WEB_PORT must be an integer from 1 through 65535");
}
const publicOrigin = new URL(
  process.env.PUBLIC_ORIGIN ?? "http://localhost:8080",
).origin;
console.log(
  `Open ${publicOrigin}; port ${port} is the private Next.js upstream.`,
);

const nextCli = resolve(repositoryRoot, "node_modules/next/dist/bin/next");
const child = spawn(
  process.execPath,
  [nextCli, command, "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: resolve(repositoryRoot, "apps/web"),
    env: process.env,
    stdio: "inherit",
  },
);
let stopping = false;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopping = true;
    child.kill(signal);
  });
}

child.once("error", (error) => {
  console.error("Unable to start Next.js", error);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  if (signal && !stopping) {
    console.error(`Next.js exited after ${signal}`);
  }
  process.exitCode = code ?? (stopping ? 0 : 1);
});
