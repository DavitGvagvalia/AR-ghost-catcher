"use client";

import type { FinalResults } from "@ghost-hunt/shared";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { Brand } from "@/components/ui/brand";
import { useStoredRoom } from "@/hooks/use-stored-room";
import { getResults } from "@/lib/api";

function ResultsContent() {
  const params = useSearchParams();
  const queryRoomCode = params.get("room");
  const { roomCode: storedRoomCode, ready: roomMemoryReady } =
    useStoredRoom("PLAYER_OR_HOST");
  const roomCode = queryRoomCode ?? storedRoomCode;
  const roomReferenceReady = queryRoomCode !== null || roomMemoryReady;
  const [load, setLoad] = useState<{
    roomCode: string;
    results: FinalResults | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    getResults(roomCode)
      .then((results) => setLoad({ roomCode, results, error: null }))
      .catch(() =>
        setLoad({
          roomCode,
          results: null,
          error: "The final standings are not published yet.",
        }),
      );
  }, [roomCode]);

  const currentLoad = load?.roomCode === roomCode ? load : null;
  const results = currentLoad?.results ?? null;
  const error = currentLoad?.error ?? null;
  const leaderboard = useMemo(() => results?.leaderboard ?? [], [results]);

  return (
    <div className="flex min-h-dvh flex-col pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 sm:px-8">
        <Brand />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#aaa2b7]">
          Final signal
        </span>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-14 sm:px-8">
        {roomReferenceReady && (error || !roomCode) ? (
          <p role="alert" className="text-[#ffb36b]">
            {error ?? "No room is stored on this device."}
          </p>
        ) : !results ? (
          <p role="status" className="text-[#b9a4ff]">
            Loading final standings…
          </p>
        ) : (
          <>
            <h1 className="text-5xl font-black tracking-[-0.04em] sm:text-7xl">
              The ghosts have spoken.
            </h1>
            <p className="mt-4 text-lg text-[#aaa2b7]">
              Final standings for room{" "}
              <span className="font-mono font-black text-[#f6f0e6]">
                {results.roomCode}
              </span>
            </p>
            <ol className="mt-10 divide-y divide-[#2b2639] rounded-2xl border border-[#3a3349] bg-[#12101b]/55 px-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              {leaderboard.map((player) => (
                <li
                  key={player.playerId}
                  className="flex min-h-20 items-center gap-4 py-4"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-[#221c30] font-mono font-black text-[#b9a4ff]">
                    {player.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-extrabold">
                      {player.nickname}
                    </p>
                    {player.isWinner ? (
                      <p className="text-sm font-bold text-[#7df9e7]">Winner</p>
                    ) : null}
                  </div>
                  <strong className="font-mono text-2xl tabular-nums text-[#f6f0e6]">
                    {player.score}
                  </strong>
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center">
          <p role="status" className="text-[#b9a4ff]">
            Loading final standings…
          </p>
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
