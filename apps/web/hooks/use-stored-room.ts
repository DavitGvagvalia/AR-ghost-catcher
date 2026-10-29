"use client";

import { useSyncExternalStore } from "react";

import { roomMemory } from "@/lib/session";

type StoredRoomKind = "HOST" | "PLAYER" | "PLAYER_OR_HOST";

interface StoredRoomResult {
  roomCode: string | null;
  ready: boolean;
}

export function useStoredRoom(kind: StoredRoomKind): StoredRoomResult {
  const roomCode = useSyncExternalStore(
    subscribeToStaticBrowserState,
    () =>
      kind === "HOST"
        ? roomMemory.getHostRoom()
        : kind === "PLAYER"
          ? roomMemory.getPlayerRoom()
          : (roomMemory.getPlayerRoom() ?? roomMemory.getHostRoom()),
    () => null,
  );
  const ready = useSyncExternalStore(
    subscribeToStaticBrowserState,
    () => true,
    () => false,
  );

  return { roomCode, ready };
}

function subscribeToStaticBrowserState(): () => void {
  return () => undefined;
}
