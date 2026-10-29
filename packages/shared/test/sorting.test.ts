import assert from "node:assert/strict";
import test from "node:test";

import { compareStableText } from "../src/sorting.js";

test("stable text ordering is independent of the process locale", () => {
  const values = ["éclair", "zombie", "Alpha", "alpha", "Alpha"];
  assert.deepEqual(values.sort(compareStableText), [
    "Alpha",
    "Alpha",
    "alpha",
    "zombie",
    "éclair",
  ]);
});
