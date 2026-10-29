/* global Buffer, console, document, process */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { chromium } from "playwright-core";
import sharp from "sharp";

const baseUrl = process.env.REVIEW_BASE_URL ?? "http://localhost:8080";
const reviewGameFlow = process.env.REVIEW_GAME_FLOW === "true";
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const frameWidth = 640;
const frameHeight = 480;
const markerSize = 300;
const frameRate = 5;
const frameCount = 150;

function launchFakeCameraBrowser(path) {
  return chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      `--use-file-for-fake-video-capture=${path}`,
    ],
  });
}

async function createMarkerVideo(path) {
  const marker = await sharp(
    resolve("apps/web/public/markers/printable/ar_marker-1.jpg"),
  )
    .resize(markerSize, markerSize, { kernel: "nearest" })
    .png()
    .toBuffer();
  const grayscale = await sharp({
    create: {
      width: frameWidth,
      height: frameHeight,
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite([
      {
        input: marker,
        left: (frameWidth - markerSize) / 2,
        top: (frameHeight - markerSize) / 2,
      },
    ])
    .grayscale()
    .raw()
    .toBuffer();

  const luminance = Buffer.from(
    grayscale,
    (value) => 16 + Math.round((value * 219) / 255),
  );
  const chromaPlane = Buffer.alloc((frameWidth * frameHeight) / 4, 128);
  const frame = Buffer.concat([
    Buffer.from("FRAME\n"),
    luminance,
    chromaPlane,
    chromaPlane,
  ]);
  const header = Buffer.from(
    `YUV4MPEG2 W${frameWidth} H${frameHeight} F${frameRate}:1 Ip A1:1 C420jpeg\n`,
  );
  await writeFile(
    path,
    Buffer.concat([header, ...Array(frameCount).fill(frame)]),
  );
}

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), "ghost-hunt-marker-camera-"),
);
const videoPath = join(temporaryDirectory, "marker-01.y4m");
let browser;

try {
  await createMarkerVideo(videoPath);
  browser = await launchFakeCameraBrowser(videoPath);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/marker-test`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start marker test" }).click();
  await page.getByText("Camera ready").waitFor({ timeout: 15_000 });
  await page.getByText("marker-01", { exact: true }).waitFor({
    timeout: 20_000,
  });

  if (pageErrors.length > 0) {
    throw new Error(`Marker page errors: ${pageErrors.join(" | ")}`);
  }
  console.log(
    "AR.js recognized marker-01 from the deterministic fake-camera video.",
  );
  await context.close();

  if (reviewGameFlow) {
    await browser.close();
    browser = await launchFakeCameraBrowser(videoPath);
    const hostContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const host = await hostContext.newPage();
    await host.goto(`${baseUrl}/host`, { waitUntil: "networkidle" });
    await host.getByRole("button", { name: "Create room" }).click();
    const roomCode = (
      await host.getByTestId("room-code").textContent()
    )?.trim();
    if (!roomCode) throw new Error("AR game review did not create a room.");

    const playerContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const player = await playerContext.newPage();
    const playerErrors = [];
    player.on("pageerror", (error) => playerErrors.push(error.message));
    await player.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await player.getByLabel("Room code").fill(roomCode);
    await player.getByLabel("Hunter name").fill("Marker Review");
    await player.getByRole("button", { name: "Join the room" }).click();
    await player.waitForURL(/\/lobby/u);
    await host.getByText("Marker Review").first().waitFor();
    await host.getByRole("button", { name: "Start hunt" }).click();
    await player.waitForURL(/\/game/u);
    await player.getByRole("button", { name: "Enter hunt" }).click();
    await player.getByText("Ghost · marker-01", { exact: true }).waitFor({
      timeout: 20_000,
    });
    await player.waitForFunction(
      () => {
        const model = document.querySelector("a-entity[gltf-model]");
        return Boolean(model?.getObject3D?.("mesh"));
      },
      undefined,
      { timeout: 20_000 },
    );
    const loadedModel = await player.evaluate(() =>
      document
        .querySelector("a-entity[gltf-model]")
        ?.getAttribute("gltf-model"),
    );
    if (playerErrors.length > 0) {
      throw new Error(`Game page errors: ${playerErrors.join(" | ")}`);
    }
    console.log(
      `Room ${roomCode} claimed marker-01 and loaded ${loadedModel}.`,
    );
    await Promise.all([hostContext.close(), playerContext.close()]);
  }
} finally {
  await browser?.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
