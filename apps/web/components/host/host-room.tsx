"use client";

import {
  compareStableText,
  type MarkerRuntimeState,
  type RoomState,
} from "@ghost-hunt/shared";
import { useMemo, useState } from "react";
import Link from "next/link";

import { RoomRoster } from "@/components/game/room-roster";
import { CopyIcon, UsersIcon } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/status-pill";
import { useRoomChannel } from "@/hooks/use-room-channel";
import { useMatchCountdown } from "@/hooks/use-match-countdown";
import { ApiClientError, endRoom, startRoom } from "@/lib/api";
import { MatchTimer } from "@/components/game/match-timer";

const markerStateCopy: Record<
  MarkerRuntimeState["status"],
  { short: string; label: string; style: string }
> = {
  AVAILABLE: {
    short: "A",
    label: "Available",
    style: "border-[#3a3349] bg-[#0d0b14] text-[#aaa2b7]",
  },
  RESERVED: {
    short: "R",
    label: "Reserved",
    style: "border-[#ff7a1a]/65 bg-[#ff7a1a]/12 text-[#ffb36b]",
  },
  COOLDOWN: {
    short: "CD",
    label: "Cooldown",
    style: "border-[#b9a4ff]/55 bg-[#b9a4ff]/10 text-[#d4c9ff]",
  },
};

export function HostRoom({ initialState }: { initialState: RoomState }) {
  const { roomState, connectionState, connectionError, replaceRoomState } =
    useRoomChannel(initialState.room.code, initialState);
  const [copyState, setCopyState] = useState<"IDLE" | "COPIED" | "FAILED">(
    "IDLE",
  );
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const connectedPlayers = roomState.players.filter(
    (player) => player.isConnected,
  ).length;
  const remainingMs = useMatchCountdown(
    roomState.room.endsAt,
    roomState.serverTime,
  );
  const leaderboard = useMemo(
    () =>
      [...roomState.players].sort(
        (left, right) =>
          right.score - left.score ||
          compareStableText(left.nickname, right.nickname) ||
          compareStableText(left.id, right.id),
      ),
    [roomState.players],
  );
  const markerCounts = useMemo(
    () =>
      roomState.markers.reduce(
        (counts, marker) => {
          counts[marker.status] += 1;
          return counts;
        },
        { AVAILABLE: 0, RESERVED: 0, COOLDOWN: 0 },
      ),
    [roomState.markers],
  );
  const serverTime = `${new Date(roomState.serverTime).toISOString().slice(11, 19)} UTC`;

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
      const nextState =
        action === "START"
          ? await startRoom(roomState.room.code)
          : await endRoom(roomState.room.code);
      replaceRoomState(nextState);
    } catch (caught) {
      setTransitionError(
        caught instanceof ApiClientError
          ? caught.message
          : "The room could not change state.",
      );
    } finally {
      setTransitionBusy(false);
    }
  }

  const statusLabel =
    roomState.room.status === "LOBBY"
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
          <span className="inline-flex min-h-9 items-center rounded-full border border-[#b9a4ff]/25 bg-[#b9a4ff]/8 px-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#b9a4ff]">
            {statusLabel}
          </span>
        </div>
        <h1
          id="host-room-title"
          className="mt-9 text-5xl font-black leading-[0.92] tracking-[-0.04em] sm:text-7xl"
        >
          Open the gate.
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-[#aaa2b7]">
          Put this code on the big screen. Players use it at check-in, then
          appear here in real time.
        </p>

        <div className="mt-10 border-y border-[#3a3349] py-7">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#8d869b]">
            Room code
          </p>
          <div className="mt-3 flex items-center gap-4">
            <strong
              data-testid="room-code"
              className="font-mono text-4xl font-black tracking-[0.15em] text-[#f6f0e6] sm:text-5xl"
            >
              {roomState.room.code}
            </strong>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy room code"
              className="grid size-12 shrink-0 place-items-center border border-[#4a425c] text-[#b9a4ff] transition-colors hover:border-[#b9a4ff] hover:text-[#d7ceff]"
            >
              <CopyIcon className="size-5" />
            </button>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 min-h-5 text-sm font-semibold ${copyState === "FAILED" ? "text-[#ffb36b]" : "text-[#7df9e7]"}`}
          >
            {copyState === "COPIED"
              ? "Copied to clipboard"
              : copyState === "FAILED"
                ? "Copy failed. Select the code and copy it manually."
                : ""}
          </p>
          <Link
            href="/marker-test"
            className="inline-flex min-h-11 items-center border-b border-[#b9a4ff]/55 py-2 text-sm font-bold text-[#b9a4ff] hover:border-[#d7ceff] hover:text-[#d7ceff]"
          >
            Open camera-only marker test
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-[#3a3349] bg-[#12101b]/55 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          {roomState.room.status === "LOBBY" ? (
            <>
              <h2 className="text-xl font-extrabold tracking-[-0.03em]">
                Ready to release the ghosts?
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#aaa2b7]">
                Starting records the server deadline and moves every connected
                hunter into the match.
              </p>
              <button
                type="button"
                onClick={() => transition("START")}
                disabled={transitionBusy}
                className="mt-5 min-h-13 w-full rounded-xl bg-[#ff7a1a] px-5 font-extrabold text-[#120b06] hover:bg-[#ff9144] disabled:cursor-not-allowed disabled:bg-[#4d3a2c] disabled:text-[#a38b78]"
              >
                {transitionBusy ? "Starting hunt…" : "Start hunt"}
              </button>
            </>
          ) : roomState.room.status === "RUNNING" ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold">Hunt in progress</h2>
                <p className="mt-1 text-sm text-[#aaa2b7]">Server deadline</p>
              </div>
              <MatchTimer remainingMs={remainingMs} />
            </div>
          ) : roomState.room.status === "AWAITING_FINALIZATION" ? (
            <>
              <h2 className="text-xl font-extrabold">Time is up</h2>
              <p className="mt-2 text-sm leading-6 text-[#aaa2b7]">
                Gameplay is locked. Publish the final standings when you are
                ready.
              </p>
              <button
                type="button"
                onClick={() => transition("END")}
                disabled={transitionBusy}
                className="mt-5 min-h-13 w-full rounded-xl bg-[#ff7a1a] px-5 font-extrabold text-[#120b06] hover:bg-[#ff9144] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {transitionBusy
                  ? "Publishing results…"
                  : "End game and publish results"}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-extrabold">Results published</h2>
              <Link
                href={`/results?room=${encodeURIComponent(roomState.room.code)}`}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#ff7a1a] px-5 font-extrabold text-[#120b06]"
              >
                View final standings
              </Link>
            </>
          )}
          {transitionError ? (
            <p role="alert" className="mt-4 text-sm text-[#ffb36b]">
              {transitionError}
            </p>
          ) : null}
        </div>
      </section>

      <div className="space-y-6">
        <section
          aria-labelledby="host-roster-title"
          className="room-signal rounded-2xl border border-[#3a3349] bg-[#12101b]/55 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-8 lg:p-10"
        >
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#3a3349] pb-5">
            <h2
              id="host-roster-title"
              className="text-3xl font-extrabold tracking-[-0.04em]"
            >
              Hunter crew
            </h2>
            <div className="flex items-center gap-2 text-[#7df9e7]">
              <UsersIcon className="size-5" />
              <strong className="text-2xl tabular-nums">
                {connectedPlayers}
              </strong>
            </div>
          </div>
          {connectionError ? (
            <p role="status" className="mb-4 text-sm text-[#ffb36b]">
              {connectionError}
            </p>
          ) : null}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {connectedPlayers} connected hunter
            {connectedPlayers === 1 ? "" : "s"} in the room. Connection{" "}
            {connectionState.toLowerCase()}.
          </p>
          <RoomRoster players={roomState.players} currentPlayerId={null} />
        </section>

        <section
          aria-labelledby="live-ledger-title"
          className="rounded-2xl border border-[#3a3349] bg-[#12101b]/55 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-8 lg:p-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#3a3349] pb-5">
            <h2
              id="live-ledger-title"
              className="text-3xl font-extrabold tracking-[-0.04em]"
            >
              Live field ledger
            </h2>
            <time
              dateTime={new Date(roomState.serverTime).toISOString()}
              className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#aaa2b7]"
            >
              Server {serverTime}
            </time>
          </div>

          <div className="py-6">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h3 className="text-xl font-extrabold">Leaderboard</h3>
              <span className="text-sm text-[#aaa2b7]">
                {leaderboard.length} hunter{leaderboard.length === 1 ? "" : "s"}
              </span>
            </div>
            {leaderboard.length === 0 ? (
              <p className="border-y border-[#2b2639] py-5 text-sm text-[#aaa2b7]">
                Scores appear after hunters join the room.
              </p>
            ) : (
              <ol className="divide-y divide-[#2b2639] border-y border-[#2b2639]">
                {leaderboard.map((player, index) => (
                  <li
                    key={player.id}
                    className="flex min-h-14 items-center gap-3 py-2.5"
                  >
                    <span className="w-7 shrink-0 font-mono text-sm font-black tabular-nums text-[#b9a4ff]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{player.nickname}</p>
                      <p
                        className={`text-xs ${player.isConnected ? "text-[#7df9e7]" : "text-[#8d869b]"}`}
                      >
                        {player.isConnected ? "Connected" : "Disconnected"}
                      </p>
                    </div>
                    <strong className="font-mono text-xl tabular-nums">
                      {player.score}
                    </strong>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="border-t border-[#3a3349] pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-xl font-extrabold">Marker status</h3>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#aaa2b7]">
                {markerCounts.AVAILABLE} available · {markerCounts.RESERVED}{" "}
                reserved · {markerCounts.COOLDOWN} cooldown
              </p>
            </div>
            <ul
              className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-6"
              aria-label="Status of all 30 markers"
            >
              {roomState.markers.map((marker) => {
                const state = markerStateCopy[marker.status];
                return (
                  <li
                    key={marker.markerId}
                    title={`${marker.markerId}: ${state.label}`}
                    className={`grid min-h-12 place-items-center border px-1 py-1.5 text-center ${state.style}`}
                  >
                    <span className="font-mono text-[10px] font-black tabular-nums">
                      {marker.markerId.slice(-2)}
                    </span>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.08em]">
                      {state.short}
                      <span className="sr-only"> {state.label}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div
              className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#aaa2b7]"
              aria-hidden="true"
            >
              {Object.entries(markerStateCopy).map(([status, state]) => (
                <span key={status} className="inline-flex items-center gap-2">
                  <span className={`size-3 border ${state.style}`} />{" "}
                  {state.short} - {state.label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
