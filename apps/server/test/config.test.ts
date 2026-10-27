import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKER_COOLDOWN_MS,
  MATCH_DURATION_MS,
  MAX_GHOST_HITS,
  MIN_GHOST_HITS,
} from "@ghost-hunt/shared";

import { readServerConfig } from "../src/config.js";

test("server config uses the specified game defaults", () => {
  const config = readServerConfig({});

  assert.equal(config.matchDurationMs, MATCH_DURATION_MS);
  assert.equal(config.markerCooldownMs, MARKER_COOLDOWN_MS);
  assert.equal(config.minGhostHits, MIN_GHOST_HITS);
  assert.equal(config.maxGhostHits, MAX_GHOST_HITS);
});

test("server config rejects an inverted ghost hit range", () => {
  assert.throws(() =>
    readServerConfig({ MIN_GHOST_HITS: "12", MAX_GHOST_HITS: "3" }),
  );
});
