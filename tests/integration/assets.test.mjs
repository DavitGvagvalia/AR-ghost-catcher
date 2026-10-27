import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  GHOST_MODEL_IDS,
  GHOST_MODEL_MANIFEST,
  MARKER_IDS,
  MARKER_MANIFEST,
  MOBILE_MODEL_BUDGET,
} from "@ghost-hunt/shared";

import {
  comparePrintableToPattern,
  minimumRotationMae,
  readGlbFile,
  readPatternFile,
} from "../../scripts/assets/validation.mjs";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const publicDirectory = resolve(repositoryRoot, "apps/web/public");

function publicAssetFile(assetPath) {
  return resolve(publicDirectory, assetPath.slice(1));
}

function publicFiles(directory, extension) {
  return readdirSync(resolve(publicDirectory, directory))
    .filter((name) => name.endsWith(extension))
    .sort();
}

test("marker manifest maps all 30 canonical IDs to valid unique assets", async (t) => {
  assert.deepEqual(
    MARKER_MANIFEST.map((marker) => marker.id),
    MARKER_IDS,
  );
  assert.equal(
    new Set(MARKER_MANIFEST.map((marker) => marker.patternPath)).size,
    30,
  );
  assert.equal(
    new Set(MARKER_MANIFEST.map((marker) => marker.printablePath)).size,
    30,
  );
  assert.deepEqual(
    publicFiles("markers/patterns", ".patt"),
    MARKER_MANIFEST.map((marker) =>
      marker.patternPath.split("/").at(-1),
    ).sort(),
  );
  assert.deepEqual(
    publicFiles("markers/printable", ".jpg"),
    MARKER_MANIFEST.map((marker) =>
      marker.printablePath.split("/").at(-1),
    ).sort(),
  );

  const patterns = [];
  for (const marker of MARKER_MANIFEST) {
    const pattern = readPatternFile(publicAssetFile(marker.patternPath));
    const printable = await comparePrintableToPattern(
      publicAssetFile(marker.printablePath),
      pattern,
    );

    assert.equal(printable.format, "jpeg", `${marker.id} printable format`);
    assert.equal(printable.width, 1_024, `${marker.id} printable width`);
    assert.equal(printable.height, 1_024, `${marker.id} printable height`);
    assert.equal(
      printable.meanAbsoluteError,
      0,
      `${marker.id} printable does not match its pattern data`,
    );
    patterns.push({ id: marker.id, pattern });
  }

  assert.equal(new Set(patterns.map(({ pattern }) => pattern.hash)).size, 30);

  let closestPair;
  for (let first = 0; first < patterns.length; first += 1) {
    for (let second = first + 1; second < patterns.length; second += 1) {
      const distance = minimumRotationMae(
        patterns[first].pattern,
        patterns[second].pattern,
      );
      assert.notEqual(
        distance,
        0,
        `${patterns[first].id} and ${patterns[second].id} are rotational duplicates`,
      );
      if (!closestPair || distance < closestPair.distance) {
        closestPair = {
          first: patterns[first].id,
          second: patterns[second].id,
          distance,
        };
      }
    }
  }

  t.diagnostic(
    `Closest pattern pair: ${closestPair.first}/${closestPair.second}, rotation-invariant MAE ${closestPair.distance.toFixed(2)} (device recognition still requires print testing)`,
  );
});

test("ghost manifest matches self-contained GLB v2 assets and embedded provenance", () => {
  assert.deepEqual(
    GHOST_MODEL_MANIFEST.map((model) => model.id),
    GHOST_MODEL_IDS,
  );
  assert.equal(
    new Set(GHOST_MODEL_MANIFEST.map((model) => model.assetPath)).size,
    6,
  );
  assert.deepEqual(
    publicFiles("models/ghosts", ".glb"),
    GHOST_MODEL_MANIFEST.map((model) =>
      model.assetPath.split("/").at(-1),
    ).sort(),
  );

  for (const model of GHOST_MODEL_MANIFEST) {
    const glb = readGlbFile(publicAssetFile(model.assetPath));
    const expectedReadiness =
      glb.byteSize <= MOBILE_MODEL_BUDGET.maxBytes &&
      glb.approximateTriangles <= MOBILE_MODEL_BUDGET.maxTriangles
        ? "CANDIDATE"
        : "REQUIRES_OPTIMIZATION";

    assert.equal(glb.byteSize, model.byteSize, `${model.id} byte size`);
    assert.equal(glb.sha256, model.sha256, `${model.id} SHA-256`);
    assert.equal(
      glb.approximateTriangles,
      model.approximateTriangles,
      `${model.id} triangle count`,
    );
    assert.equal(
      glb.embeddedTextureCount,
      model.embeddedTextureCount,
      `${model.id} texture count`,
    );
    assert.equal(glb.skinned, model.skinned, `${model.id} skin metadata`);
    assert.deepEqual(
      glb.animationClips,
      model.animationClips,
      `${model.id} animation metadata`,
    );
    assert.deepEqual(
      glb.externalResources,
      [],
      `${model.id} external resources`,
    );
    assert.ok(glb.sceneCount > 0, `${model.id} has no scene`);
    assert.ok(glb.meshCount > 0, `${model.id} has no mesh`);
    assert.equal(model.mobileReadiness, expectedReadiness);
    assert.equal(model.displayScale, null);
    assert.equal(model.rightsReviewStatus, "NOT_REVIEWED");
    assert.equal(glb.provenance?.author, model.provenance.author);
    assert.equal(glb.provenance?.source, model.provenance.sourceUrl);
    assert.equal(
      glb.provenance?.license,
      "SKETCHFAB Standard (https://sketchfab.com/licenses)",
    );
  }
});
