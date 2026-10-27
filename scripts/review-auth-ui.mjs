/* global console, document, process */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "playwright-core";

const baseUrl = process.env.REVIEW_BASE_URL ?? "http://localhost:3000";
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputDirectory = resolve(".impeccable/review");

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ executablePath: chromePath, headless: true });

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (overflow.scrollWidth > overflow.clientWidth) {
    throw new Error(
      `${label} overflows horizontally: ${overflow.scrollWidth}px > ${overflow.clientWidth}px`,
    );
  }
}

async function waitForAuthoredMotion(page) {
  await page.locator(".room-signal").evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
}

try {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const login = await mobile.newPage();
  await login.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await assertNoHorizontalOverflow(login, "Mobile login");
  await login.screenshot({ path: resolve(outputDirectory, "mobile.png") });

  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const host = await hostContext.newPage();
  await host.goto(`${baseUrl}/host`, { waitUntil: "networkidle" });
  await host.getByRole("button", { name: "Create room" }).click();
  const roomCode = (await host.getByTestId("room-code").textContent())?.trim();
  if (!roomCode) throw new Error("Host flow did not return a room code.");

  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const player = await playerContext.newPage();
  await player.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await player.getByLabel("Room code").fill(roomCode);
  await player.getByLabel("Hunter name").fill("Review Hunter");
  await player.getByRole("button", { name: "Join the room" }).click();
  await player.waitForURL(/\/lobby/);
  await player.getByText("Review Hunter").waitFor();
  await waitForAuthoredMotion(player);
  await assertNoHorizontalOverflow(player, "Mobile lobby");
  await player.screenshot({ path: resolve(outputDirectory, "mobile-lobby.png"), fullPage: true });

  await host.getByText("Review Hunter").waitFor();
  await waitForAuthoredMotion(host);
  await assertNoHorizontalOverflow(host, "Desktop host room");
  await host.screenshot({ path: resolve(outputDirectory, "desktop.png"), fullPage: true });

  await host.getByRole("button", { name: "Start hunt" }).click();
  await host.getByText("Hunt in progress").waitFor();
  await player.waitForURL(/\/game/);
  await player.getByRole("heading", { name: "The hunt is live." }).waitFor();
  await assertNoHorizontalOverflow(player, "Mobile running match");
  await player.screenshot({ path: resolve(outputDirectory, "mobile-game.png") });
  await host.screenshot({ path: resolve(outputDirectory, "desktop-host-running.png") });

  console.log(`Reviewed room ${roomCode}: host create, player join, live roster, and synchronized start passed.`);
  await Promise.all([mobile.close(), hostContext.close(), playerContext.close()]);
} finally {
  await browser.close();
}
