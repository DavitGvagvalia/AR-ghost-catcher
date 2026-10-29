import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import sharp from "sharp";

const PATTERN_ROTATIONS = 4;
const PATTERN_CHANNELS = 3;
const PATTERN_SIDE = 16;
const PATTERN_ROWS = PATTERN_ROTATIONS * PATTERN_CHANNELS * PATTERN_SIDE;
const INNER_PATTERN_RATIO = 0.5;

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function readPatternFile(filePath) {
  const rows = readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, rowIndex) => {
      const tokens = line.split(/\s+/u);

      if (tokens.length !== PATTERN_SIDE) {
        throw new Error(
          `${filePath}: row ${rowIndex + 1} has ${tokens.length} values; expected ${PATTERN_SIDE}`,
        );
      }

      return tokens.map((token, columnIndex) => {
        if (!/^\d+$/u.test(token)) {
          throw new Error(
            `${filePath}: row ${rowIndex + 1}, column ${columnIndex + 1} is not an integer`,
          );
        }

        const value = Number(token);
        if (value < 0 || value > 255) {
          throw new Error(
            `${filePath}: row ${rowIndex + 1}, column ${columnIndex + 1} is outside 0..255`,
          );
        }
        return value;
      });
    });

  if (rows.length !== PATTERN_ROWS) {
    throw new Error(
      `${filePath}: found ${rows.length} data rows; expected ${PATTERN_ROWS}`,
    );
  }

  const orientationSize = PATTERN_CHANNELS * PATTERN_SIDE;
  const orientations = Array.from(
    { length: PATTERN_ROTATIONS },
    (_, rotation) =>
      rows
        .slice(
          rotation * orientationSize,
          rotation * orientationSize + PATTERN_SIDE,
        )
        .flat(),
  );

  return {
    rows,
    orientations,
    hash: sha256(readFileSync(filePath)),
  };
}

export function minimumRotationMae(first, second) {
  let minimum = Number.POSITIVE_INFINITY;

  for (const firstRotation of first.orientations) {
    for (const secondRotation of second.orientations) {
      const difference = firstRotation.reduce(
        (total, value, index) =>
          total + Math.abs(value - secondRotation[index]),
        0,
      );
      minimum = Math.min(minimum, difference / firstRotation.length);
    }
  }

  return minimum;
}

export async function comparePrintableToPattern(imagePath, pattern) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width !== metadata.height
  ) {
    throw new Error(`${imagePath}: printable marker must be square`);
  }
  const innerSize = metadata.width * INNER_PATTERN_RATIO;
  const innerOffset = (metadata.width - innerSize) / 2;
  const pixels = await image
    .extract({
      left: innerOffset,
      top: innerOffset,
      width: innerSize,
      height: innerSize,
    })
    .grayscale()
    .resize(PATTERN_SIDE, PATTERN_SIDE, {
      fit: "fill",
      kernel: "nearest",
    })
    .raw()
    .toBuffer();
  const firstOrientation = pattern.orientations[0];
  const totalDifference = firstOrientation.reduce(
    (total, value, index) => total + Math.abs(value - pixels[index]),
    0,
  );

  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    meanAbsoluteError: totalDifference / firstOrientation.length,
  };
}

export function readGlbFile(filePath) {
  const buffer = readFileSync(filePath);

  if (buffer.length < 20 || buffer.toString("ascii", 0, 4) !== "glTF") {
    throw new Error(`${filePath}: invalid GLB magic header`);
  }

  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);
  if (version !== 2) {
    throw new Error(`${filePath}: GLB version ${version}; expected version 2`);
  }
  if (declaredLength !== buffer.length) {
    throw new Error(
      `${filePath}: declares ${declaredLength} bytes but contains ${buffer.length}`,
    );
  }

  let offset = 12;
  let document;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;

    if (chunkEnd > buffer.length) {
      throw new Error(`${filePath}: chunk exceeds the declared GLB length`);
    }

    if (chunkType === "JSON") {
      document = JSON.parse(
        buffer
          .toString("utf8", chunkStart, chunkEnd)
          .replaceAll("\u0000", "")
          .trimEnd(),
      );
    }
    offset = chunkEnd;
  }

  if (!document) {
    throw new Error(`${filePath}: missing JSON chunk`);
  }
  if (offset !== buffer.length) {
    throw new Error(`${filePath}: malformed chunk alignment`);
  }

  const primitives = (document.meshes ?? []).flatMap(
    (mesh) => mesh.primitives ?? [],
  );
  const approximateTriangles = primitives.reduce((total, primitive) => {
    if (primitive.mode !== undefined && primitive.mode !== 4) return total;
    const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
    const accessor = document.accessors?.[accessorIndex];
    return total + (accessor ? Math.floor(accessor.count / 3) : 0);
  }, 0);
  const externalResources = [
    ...(document.buffers ?? []).flatMap((entry) => entry.uri ?? []),
    ...(document.images ?? []).flatMap((entry) => entry.uri ?? []),
  ];

  return {
    byteSize: buffer.length,
    sha256: sha256(buffer),
    approximateTriangles,
    embeddedTextureCount: document.images?.length ?? 0,
    skinned: (document.nodes ?? []).some((node) => node.skin !== undefined),
    animationClips: (document.animations ?? []).map(
      (animation, index) => animation.name ?? `animation-${index + 1}`,
    ),
    externalResources,
    sceneCount: document.scenes?.length ?? 0,
    meshCount: document.meshes?.length ?? 0,
    provenance: document.asset?.extras ?? null,
  };
}
