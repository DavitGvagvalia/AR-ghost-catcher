"use client";

import type { RoomState } from "@ghost-hunt/shared";
import { useState } from "react";
import Link from "next/link";

import { RoomRoster } from "@/components/game/room-roster";
import { CopyIcon, UsersIcon } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/status-pill";
import { useRoomChannel } from "@/hooks/use-room-channel";
import { useMatchCountdown } from "@/hooks/use-match-countdown";
import { ApiClientError, endRoom, startRoom } from "@/lib/api";
import { MatchTimer } from "@/components/game/match-timer";

export function HostRoom({ initialState }: { initialState: RoomState }) {
  const { roomState, connectionState, connectionError, replaceRoomState } = useRoomChannel(
    initialState.room.code,
    initialState,
  );
  const [copyState, setCopyState] = useState<"IDLE" | "COPIED" | "FAILED">("IDLE");
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const connectedPlayers = roomState.players.filter((player) => player.isConnected).length;
  const remainingMs = useMatchCountdown(roomState.room.endsAt, roomState.serverTime);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(roomState.room.code);
      setCopyState("COPIED");
      window.setTimeout(() => setCopyState("IDLE"), 1800);
    } catch {
      setCopyState("FAILED");
    }
  }

  async function transition(action: "START" | "END") {
    setTransitionBusy(true);
    setTransitionError(null);
    try {
      const nextState = action === "START"
        ? await startRoom(roomState.room.code)
        : await endRoom(roomState.room.code);
      replaceRoomState(nextState);
    } catch (caught) {
      setTransitionError(caught instanceof ApiClientError ? caught.message : "The room could not change state.");
    } finally {
      setTransitionBusy(false);
    }
  }

  const statusLabel = roomState.room.status === "LOBBY"
    ? "Lobby"
    : roomState.room.status === "RUNNING"
      ? "Running"
      : roomState.room.status === "AWAITING_FINALIZATION"
        ? "Time up"
        : "Finished";

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-12 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20 lg:pt-16">
      <section aria-labelledby="host-room-title">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill connected={connectionState === "CONNECTED"} />
          <span className="inline-flex min-h-9 items-center rounded-full border border-[#b9a4ff]/25 bg-[#b9a4ff]/8 px-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#b9a4ff]">{statusLabel}</span>
        </div>
        <h1 id="host-room-title" className="mt-9 text-5xl font-black leading-[0.92] tracking-[-0.04em] sm:text-7xl">Open the gate.</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-[#aaa2b7]">Put this code on the big screen. Players use it at check-in, then appear here in real time.</p>

        <div className="mt-10 border-y border-[#3a3349] py-7">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#8d869b]">Room code</p>
          <div className="mt-3 flex items-center gap-4">
            <strong data-testid="room-code" className="font-mono text-4xl font-black tracking-[0.15em] text-[#f6f0e6] sm:text-5xl">{roomState.room.code}</strong>
            <button type="button" onClick={copyCode} aria-label="Copy room code" className="grid size-12 shrink-0 place-items-center border border-[#4a425c] text-[#b9a4ff] transition-colors hover:border-[#b9a4ff] hover:text-[#d7ceff]"><CopyIcon className="size-5" /></button>
          </div>
          <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-sm font-semibold ${copyState === "FAILED" ? "text-[#ffb36b]" : "text-[#7df9e7]"}`}>{copyState === "COPIED" ? "Copied to clipboard" : copyState === "FAILED" ? "Copy failed. Select the code and copy it manually." : ""}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#3a3349] bg-[#12101b]/55 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          {roomState.room.status === "LOBBY" ? (
            <>
              <h2 className="text-xl font-extrabold tracking-[-0.03em]">Ready to release the ghosts?</h2>
              <p className="mt-2 text-sm leading-6 text-[#aaa2b7]">Starting records the server deadline and moves every connected hunter into the match.</p>
              <button type="button" onClick={() => transition("START")} disabled={transitionBusy} className="mt-5 min-h-13 w-full rounded-xl bg-[#ff7a1a] px-5 font-extrabold text-[#120b06] hover:bg-[#ff9144] disabled:cursor-not-allowed disabled:bg-[#4d3a2c] disabled:text-[#a38b78]">
                {transitionBusy ? "Starting hunt…" : "Start hunt"}
              </button>
            </>
          ) : roomState.room.status === "RUNNING" ? (
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-extrabold">Hunt in progress</h2><p className="mt-1 text-sm text-[#aaa2b7]">Server deadline</p></div><MatchTimer remainingMs={remainingMs} /></div>
          ) : roomState.room.status === "AWAITING_FINALIZATION" ? (
            <>
              <h2 className="text-xl font-extrabold">Time is up</h2>
              <p className="mt-2 text-sm leading-6 text-[#aaa2b7]">Gameplay is locked. Publish the final standings when you are ready.</p>
              <button type="button" onClick={() => transition("END")} disabled={transitionBusy} className="mt-5 min-h-13 w-full rounded-xl bg-[#ff7a1a] px-5 font-extrabold text-[#120b06] hover:bg-[#ff9144] disabled:cursor-not-allowed disabled:opacity-60">
                {transitionBusy ? "Publishing results…" : "End game and publish results"}
              </button>
            </>
          ) : (
            <><h2 className="text-xl font-extrabold">Results published</h2><Link href="/results" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#ff7a1a] px-5 font-extrabold text-[#120b06]">View final standings</Link></>
          )}
          {transitionError ? <p role="alert" className="mt-4 text-sm text-[#ffb36b]">{transitionError}</p> : null}
        </div>
      </section>

      <section aria-labelledby="host-roster-title" className="room-signal rounded-2xl border border-[#3a3349] bg-[#12101b]/55 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-8 lg:p-10">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#3a3349] pb-5">
          <div>
            <h2 id="host-roster-title" className="text-3xl font-extrabold tracking-[-0.04em]">Hunter crew</h2>
          </div>
          <div className="flex items-center gap-2 text-[#7df9e7]"><UsersIcon className="size-5" /><strong className="text-2xl">{connectedPlayers}</strong></div>
        </div>
        {connectionError ? <p role="status" className="mb-4 text-sm text-[#ffb36b]">{connectionError}</p> : null}
        <p className="sr-only" aria-live="polite" aria-atomic="true">{connectedPlayers} connected hunter{connectedPlayers === 1 ? "" : "s"} in the room. Connection {connectionState.toLowerCase()}.</p>
        <RoomRoster players={roomState.players} currentPlayerId={null} />
      </section>
    </main>
  );
}
