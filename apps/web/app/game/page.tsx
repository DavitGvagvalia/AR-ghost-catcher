"use client";

import type { RoomState } from "@ghost-hunt/shared";
import { useEffect, useState } from "react";

import { LiveGameStatus } from "@/components/game/live-game-status";
import { Brand } from "@/components/ui/brand";
import { useStoredRoom } from "@/hooks/use-stored-room";
import { ApiClientError, resumeRoom } from "@/lib/api";

export default function GamePage() {
  const { roomCode, ready: roomMemoryReady } = useStoredRoom("PLAYER");
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    resumeRoom(roomCode)
      .then(setState)
      .catch((caught) =>
        setError(
          caught instanceof ApiClientError
            ? caught.message
            : "Unable to resume the match.",
        ),
      );
  }, [roomCode]);

  if (state) return <LiveGameStatus initialState={state} />;

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <Brand />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#aaa2b7]">
          Room {roomCode ?? "------"}
        </span>
      </header>
      {roomMemoryReady && (error || !roomCode) ? (
        <main className="grid flex-1 place-items-center text-center">
          <div>
            <h1 className="text-4xl font-black">Match unavailable</h1>
            <p role="alert" className="mt-3 text-[#ffb36b]">
              {error ?? "No player room is stored on this device."}
            </p>
            <a
              href="/login"
              className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-[#ff7a1a] px-6 font-extrabold text-[#120b06]"
            >
              Return to check-in
            </a>
          </div>
        </main>
      ) : (
        <main className="grid flex-1 place-items-center">
          <p role="status" className="text-[#b9a4ff]">
            Synchronizing match…
          </p>
        </main>
      )}
    </div>
  );
}
