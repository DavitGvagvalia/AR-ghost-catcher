import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";

import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@ghost-hunt/shared";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createId(): string {
  return randomUUID();
}

export function createRoomCode(): string {
  return Array.from({ length: ROOM_CODE_LENGTH }, () =>
    ROOM_CODE_ALPHABET.charAt(randomInt(ROOM_CODE_ALPHABET.length)),
  ).join("");
}
