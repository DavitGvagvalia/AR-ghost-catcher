import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import {
  ENCOUNTER_LEASE_MS,
  MARKER_COOLDOWN_MS,
  MATCH_DURATION_MS,
  MAX_GHOST_HITS,
  MIN_GHOST_HITS,
  MIN_HIT_INTERVAL_MS,
} from "@ghost-hunt/shared";
import { z } from "zod";

const rootEnvironmentPath = resolve(import.meta.dirname, "../../../.env");

if (existsSync(rootEnvironmentPath)) {
  loadEnvFile(rootEnvironmentPath);
}

const positiveInteger = z.coerce.number().int().positive();
const exactHttpOrigin = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      value === url.origin
    );
  }, "PUBLIC_ORIGIN must be an exact HTTP(S) origin without a trailing slash or path");

const serverConfigSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    PUBLIC_ORIGIN: exactHttpOrigin.default("http://localhost:8080"),
    DATABASE_PATH: z.string().trim().min(1).default("./data/game.sqlite"),
    MATCH_DURATION_MS: positiveInteger.default(MATCH_DURATION_MS),
    MARKER_COOLDOWN_MS: positiveInteger.default(MARKER_COOLDOWN_MS),
    MIN_GHOST_HITS: positiveInteger.default(MIN_GHOST_HITS),
    MAX_GHOST_HITS: positiveInteger.default(MAX_GHOST_HITS),
    ENCOUNTER_LEASE_MS: positiveInteger.default(ENCOUNTER_LEASE_MS),
    MIN_HIT_INTERVAL_MS: positiveInteger.default(MIN_HIT_INTERVAL_MS),
  })
  .refine((config) => config.MIN_GHOST_HITS <= config.MAX_GHOST_HITS, {
    message: "MIN_GHOST_HITS must not exceed MAX_GHOST_HITS",
    path: ["MIN_GHOST_HITS"],
  });

export interface ServerConfig {
  nodeEnv: "development" | "test" | "production";
  apiPort: number;
  publicOrigin: string;
  databasePath: string;
  matchDurationMs: number;
  markerCooldownMs: number;
  minGhostHits: number;
  maxGhostHits: number;
  encounterLeaseMs: number;
  minHitIntervalMs: number;
}

export function readServerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const parsed = serverConfigSchema.parse(environment);

  return {
    nodeEnv: parsed.NODE_ENV,
    apiPort: parsed.API_PORT,
    publicOrigin: parsed.PUBLIC_ORIGIN,
    databasePath: resolve(process.cwd(), parsed.DATABASE_PATH),
    matchDurationMs: parsed.MATCH_DURATION_MS,
    markerCooldownMs: parsed.MARKER_COOLDOWN_MS,
    minGhostHits: parsed.MIN_GHOST_HITS,
    maxGhostHits: parsed.MAX_GHOST_HITS,
    encounterLeaseMs: parsed.ENCOUNTER_LEASE_MS,
    minHitIntervalMs: parsed.MIN_HIT_INTERVAL_MS,
  };
}
