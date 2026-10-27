"use client";

import type { RoomState } from "@ghost-hunt/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { MatchTimer } from "./match-timer";
import { StatusPill } from "@/components/ui/status-pill";
import { useMatchCountdown } from "@/hooks/use-match-countdown";
import { useRoomChannel } from "@/hooks/use-room-channel";

export function LiveGameStatus({ initialState }: { initialState: RoomState }) {
  const router = useRouter();
  const { roomState, connectionState, connectionError } = useRoomChannel(initialState.room.code, initialState);
  const remainingMs = useMatchCountdown(roomState.room.endsAt, roomState.serverTime);

  useEffect(() => {
    if (roomState.room.status === "LOBBY") router.replace(`/lobby?room=${roomState.room.code}`);
    if (roomState.room.status === "FINISHED") router.replace("/results");
  }, [roomState.room.code, roomState.room.status, router]);

  if (roomState.room.status === "AWAITING_FINALIZATION") {
    return <main className="mx-auto grid w-full max-w-2xl flex-1 place-content-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-center"><p className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-[#ff9b50]">00:00</p><h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">Time is up.</h1><p className="mt-4 text-lg text-[#aaa2b7]">Waiting for the host to publish the final standings.</p><div className="mx-auto mt-8"><StatusPill connected={connectionState === "CONNECTED"} /></div></main>;
  }

  return (
    <main className="mx-auto grid w-full max-w-4xl flex-1 content-center gap-8 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-12 text-center sm:px-8">
      <div className="mx-auto"><StatusPill connected={connectionState === "CONNECTED"} label="Hunt live" /></div>
      <h1 className="text-5xl font-black tracking-[-0.04em] sm:text-7xl">The hunt is live.</h1>
      <div><p className="mb-3 text-sm font-bold text-[#aaa2b7]">Time remaining</p><MatchTimer remainingMs={remainingMs} /></div>
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-[#3a3349] bg-[#12101b]/55 p-6 text-left shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <h2 className="text-xl font-extrabold">Camera checkpoint</h2>
        <p className="mt-2 leading-7 text-[#aaa2b7]">Your match session and server timer are active. The camera hunt control will mount here in the AR slice.</p>
      </section>
      {connectionError ? <p role="status" className="text-sm text-[#ffb36b]">{connectionError}</p> : null}
    </main>
  );
}
