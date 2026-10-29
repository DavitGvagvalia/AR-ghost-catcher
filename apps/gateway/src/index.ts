import { createServer, type ServerResponse } from "node:http";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import httpProxy from "http-proxy";

const environmentPath = resolve(import.meta.dirname, "../../../.env");
if (existsSync(environmentPath)) loadEnvFile(environmentPath);

function readPort(value: string | undefined): number {
  const port = Number(value ?? "8080");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("GATEWAY_PORT must be an integer from 1 through 65535");
  }
  return port;
}

function readTarget(
  value: string | undefined,
  fallback: string,
  name: string,
): URL {
  const target = new URL(value ?? fallback);
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error(`${name} must use http or https`);
  }
  return target;
}

const gatewayPort = readPort(process.env.GATEWAY_PORT);
const webTarget = readTarget(
  process.env.WEB_TARGET,
  "http://127.0.0.1:3000",
  "WEB_TARGET",
);
const apiTarget = readTarget(
  process.env.API_TARGET,
  "http://127.0.0.1:3001",
  "API_TARGET",
);
const proxy = httpProxy.createProxyServer({ xfwd: true, ws: true });

function targetFor(requestUrl: string | undefined): URL {
  const pathname = new URL(requestUrl ?? "/", "http://gateway.local").pathname;
  return pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/socket.io" ||
    pathname.startsWith("/socket.io/")
    ? apiTarget
    : webTarget;
}

function sendUnavailable(response: ServerResponse): void {
  if (response.headersSent) {
    response.end();
    return;
  }
  response.writeHead(502, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(
    JSON.stringify({
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: "A local game service is not available.",
      },
    }),
  );
}

const server = createServer((request, response) => {
  proxy.web(request, response, { target: targetFor(request.url).origin }, () =>
    sendUnavailable(response),
  );
});

server.on("upgrade", (request, socket, head) => {
  proxy.ws(
    request,
    socket,
    head,
    { target: targetFor(request.url).origin },
    () => {
      socket.destroy();
    },
  );
});

server.listen(gatewayPort, "0.0.0.0", () => {
  console.log(
    `Ghost Hunt gateway listening on http://localhost:${gatewayPort}`,
  );
  console.log(`Web target: ${webTarget.origin}`);
  console.log(`API target: ${apiTarget.origin}`);
});

let shuttingDown = false;
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; closing gateway`);
  server.close(() => process.exit(0));
  server.closeAllConnections();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
