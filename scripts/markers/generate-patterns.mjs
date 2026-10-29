/* global Buffer, console */

import { readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const printableDirectory = resolve(
  repositoryRoot,
  "apps/web/public/markers/printable",
);
const patternDirectory = resolve(
  repositoryRoot,
  "apps/web/public/markers/patterns",
);
const patternSide = 16;
const innerPatternRatio = 0.5;

function rotateCounterClockwise(pixels) {
  const rotated = Buffer.alloc(pixels.length);
  for (let y = 0; y < patternSide; y += 1) {
    for (let x = 0; x < patternSide; x += 1) {
      const outputPixel = (y * patternSide + x) * 3;
      const inputPixel = (x * patternSide + (patternSide - 1 - y)) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        rotated[outputPixel + channel] = pixels[inputPixel + channel];
      }
    }
  }
  return rotated;
}

function serializePattern(basePixels) {
  const orientations = [basePixels];
  for (let index = 1; index < 4; index += 1) {
    orientations.push(rotateCounterClockwise(orientations[index - 1]));
  }

  return `${orientations
    .map((pixels) => {
      const rows = [];
      for (let channel = 2; channel >= 0; channel -= 1) {
        for (let y = 0; y < patternSide; y += 1) {
          const values = [];
          for (let x = 0; x < patternSide; x += 1) {
            const pixel = (y * patternSide + x) * 3;
            values.push(String(pixels[pixel + channel]).padStart(3));
          }
          rows.push(values.join(" "));
        }
      }
      return rows.join("\n");
    })
    .join("\n\n")}\n`;
}

async function generatePattern(printableName) {
  const printablePath = resolve(printableDirectory, printableName);
  const metadata = await sharp(printablePath).metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width !== metadata.height
  ) {
    throw new Error(`${printableName} must be a square raster image`);
  }
  const innerSize = metadata.width * innerPatternRatio;
  const innerOffset = (metadata.width - innerSize) / 2;
  if (!Number.isInteger(innerSize) || !Number.isInteger(innerOffset)) {
    throw new Error(
      `${printableName} cannot be cropped at a 0.5 pattern ratio`,
    );
  }

  const { data, info } = await sharp(printablePath)
    .extract({
      left: innerOffset,
      top: innerOffset,
      width: innerSize,
      height: innerSize,
    })
    .resize(patternSide, patternSide, { fit: "fill", kernel: "nearest" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) {
    throw new Error(`${printableName} did not decode to three color channels`);
  }

  const number = printableName.match(/^ar_marker-(\d+)\.jpg$/u)?.[1];
  if (!number)
    throw new Error(`Unexpected printable filename: ${printableName}`);
  const outputPath = resolve(patternDirectory, `ar_marker-${number}.patt`);
  await writeFile(outputPath, serializePattern(data), "utf8");
  return outputPath;
}

const printableNames = (await readdir(printableDirectory))
  .filter((name) => /^ar_marker-\d+\.jpg$/u.test(name))
  .sort((left, right) => {
    const leftNumber = Number(left.match(/\d+/u)?.[0]);
    const rightNumber = Number(right.match(/\d+/u)?.[0]);
    return leftNumber - rightNumber;
  });
if (printableNames.length !== 30) {
  throw new Error(
    `Expected 30 printable markers; found ${printableNames.length}`,
  );
}

for (const printableName of printableNames) {
  console.log(await generatePattern(printableName));
}
