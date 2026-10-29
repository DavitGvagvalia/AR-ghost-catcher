"use client";

import type { RoomState } from "@ghost-hunt/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { RoomRoster } from "@/components/game/room-roster";
import { StatusPill } from "@/components/ui/status-pill";
import { useRoomChannel } from "@/hooks/use-room-channel";

export function LiveLobby({ initialState }: { initialState: RoomState }) {
  const router = useRouter();
  const { roomState, connectionState, connectionError } = useRoomChannel(
    initialState.room.code,
    initialState,
  );
  const connectedPlayers = roomState.players.filter(
    (player) => player.isConnected,
  ).length;

  useEffect(() => {
    if (roomState.room.status === "RUNNING") router.replace("/game");
    if (roomState.room.status === "FINISHED") {
      router.replace(
        `/results?room=${encodeURIComponent(roomState.room.code)}`,
      );
    }
  }, [roomState.room.code, roomState.room.status, router]);

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-10 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:gap-20 lg:pt-20">
      <section aria-labelledby="lobby-title">
        <h1
          id="lobby-title"
          className="max-w-xl text-5xl font-black leading-[0.92] tracking-[-0.04em] text-[#f6f0e6] sm:text-7xl"
        >
          Crew assembled. <span className="text-[#b9a4ff]">Stay sharp.</span>
        </h1>
        <p className="mt-6 max-w-md text-base leading-7 text-[#aaa2b7]">
          The host will start the hunt when everyone is in. Keep this page
          open—your next stop is the camera.
        </p>
        <div className="mt-10 border-l-2 border-[#ff7a1a] pl-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#8d869b]">
            Room code
          </p>
          <p className="mt-2 font-mono text-4xl font-black tracking-[0.16em] text-[#f6f0e6]">
            {roomState.room.code}
          </p>
        </div>
      </section>

      <section
        aria-labelledby="roster-title"
        className="room-signal rounded-2xl border border-[#3a3349] bg-[#12101b]/55 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-7 lg:p-9"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2
              id="roster-title"
              className="text-2xl font-extrabold tracking-[-0.03em]"
            >
              {connectedPlayers} hunter{connectedPlayers === 1 ? "" : "s"} ready
            </h2>
          </div>
          <StatusPill connected={connectionState === "CONNECTED"} />
        </div>
        {connectionError ? (
          <p role="status" className="mb-4 text-sm text-[#ffb36b]">
            {connectionError}
          </p>
        ) : null}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {connectedPlayers} connected hunter{connectedPlayers === 1 ? "" : "s"}{" "}
          in the room. Connection {connectionState.toLowerCase()}.
        </p>
        <RoomRoster
          players={roomState.players}
          currentPlayerId={roomState.currentPlayerId}
        />
        <p className="mt-5 text-sm leading-6 text-[#8d869b]">
          You can refresh safely. This device will resume using its private
          session cookie.
        </p>
      </section>
    </main>
  );
}
