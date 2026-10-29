"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { RoomState } from "@ghost-hunt/shared";

import { LiveLobby } from "@/components/game/live-lobby";
import { Brand } from "@/components/ui/brand";
import { useStoredRoom } from "@/hooks/use-stored-room";
import { ApiClientError, resumeRoom } from "@/lib/api";
import { roomMemory } from "@/lib/session";

function LobbyContent() {
  const params = useSearchParams();
  const queryRoomCode = params.get("room");
  const { roomCode: storedRoomCode, ready: roomMemoryReady } =
    useStoredRoom("PLAYER");
  const roomCode = queryRoomCode ?? storedRoomCode;
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    resumeRoom(roomCode)
      .then((nextState) => {
        roomMemory.setPlayerRoom(nextState.room.code);
        setState(nextState);
      })
      .catch((caught) =>
        setError(
          caught instanceof ApiClientError
            ? caught.message
            : "Unable to resume this room.",
        ),
      );
  }, [roomCode]);

  if (!queryRoomCode && !roomMemoryReady) {
    return (
      <main className="grid flex-1 place-items-center px-5">
        <p role="status" className="text-[#b9a4ff]">
          Opening lobby…
        </p>
      </main>
    );
  }

  if (!roomCode) {
    return (
      <main className="mx-auto grid w-full max-w-xl flex-1 place-content-center px-5 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#ff9b50]">
          Signal lost
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">
          We could not reopen your room.
        </h1>
        <p role="alert" className="mt-4 leading-7 text-[#aaa2b7]">
          No player room is stored on this device. Join again to continue.
        </p>
        <a
          href="/login"
          className="mx-auto mt-8 inline-flex min-h-12 items-center bg-[#ff7a1a] px-6 font-extrabold text-[#120b06]"
        >
          Back to check-in
        </a>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto grid w-full max-w-xl flex-1 place-content-center px-5 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#ff9b50]">
          Signal lost
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">
          We could not reopen your room.
        </h1>
        <p role="alert" className="mt-4 leading-7 text-[#aaa2b7]">
          {error}
        </p>
        <a
          href="/login"
          className="mx-auto mt-8 inline-flex min-h-12 items-center bg-[#ff7a1a] px-6 font-extrabold text-[#120b06]"
        >
          Back to check-in
        </a>
      </main>
    );
  }
  if (!state) {
    return (
      <main className="grid flex-1 place-items-center px-5">
        <p
          role="status"
          className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-[#b9a4ff]"
        >
          Reconnecting to the room…
        </p>
      </main>
    );
  }
  return <LiveLobby initialState={state} />;
}

export default function LobbyPage() {
  return (
    <div className="flex min-h-dvh flex-col pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 sm:px-8">
        <Brand />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#aaa2b7]">
          Lobby channel
        </span>
      </header>
      <Suspense
        fallback={
          <main className="grid flex-1 place-items-center">
            <p>Opening lobby…</p>
          </main>
        }
      >
        <LobbyContent />
      </Suspense>
    </div>
  );
}
