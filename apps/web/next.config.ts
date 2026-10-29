import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const rootEnvironmentPath = resolve(repositoryRoot, ".env");

if (existsSync(rootEnvironmentPath)) loadEnvFile(rootEnvironmentPath);

const webPort = process.env.WEB_PORT ?? "3000";
const publicOrigin = new URL(
  process.env.PUBLIC_ORIGIN ?? "http://localhost:8080",
).origin;
const directWebHosts = [`localhost:${webPort}`, `127.0.0.1:${webPort}`];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    if (directWebHosts.includes(new URL(publicOrigin).host)) return [];
    return directWebHosts.map((host) => ({
      source: "/:path*",
      has: [{ type: "header" as const, key: "host", value: host }],
      destination: `${publicOrigin}/:path*`,
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
