import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKER_IDS,
  MarkerClaimPayloadSchema,
  MarkerIdSchema,
  NicknameSchema,
} from "../src/index.js";

test("the marker ID contract contains exactly 30 unique IDs", () => {
  assert.equal(MARKER_IDS.length, 30);
  assert.equal(new Set(MARKER_IDS).size, 30);
  assert.deepEqual(MARKER_IDS, [
    ...Array.from(
      { length: 30 },
      (_, index) => `marker-${String(index + 1).padStart(2, "0")}`,
    ),
  ]);
});

test("marker schemas reject unknown IDs and extra payload properties", () => {
  assert.equal(MarkerIdSchema.safeParse("marker-31").success, false);
  assert.equal(
    MarkerClaimPayloadSchema.safeParse({
      markerId: "marker-01",
      requestId: "request-1",
      score: 999,
    }).success,
    false,
  );
});

test("nickname validation trims input and rejects control characters", () => {
  assert.equal(NicknameSchema.parse("  Boo  "), "Boo");
  assert.equal(NicknameSchema.safeParse("A\u0000B").success, false);
  assert.equal(NicknameSchema.safeParse("A").success, false);
});
