"use client";

import type { RoomState } from "@ghost-hunt/shared";
import Link from "next/link";
import { useEffect, useState } from "react";

import { HostRoom } from "@/components/host/host-room";
import { Brand } from "@/components/ui/brand";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ApiClientError, createRoom, getRoomState } from "@/lib/api";
import { roomMemory } from "@/lib/session";

export default function HostPage() {
  const [storedRoomCode] = useState(() => roomMemory.getHostRoom());
  const [state, setState] = useState<RoomState | null>(null);
  const [checking, setChecking] = useState(() => storedRoomCode !== null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storedRoomCode) return;
    getRoomState(storedRoomCode)
      .then(setState)
      .catch(() => setError("The stored host room could not be reopened. Create a new room to continue."))
      .finally(() => setChecking(false));
  }, [storedRoomCode]);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const nextState = await createRoom();
      roomMemory.setHostRoom(nextState.room.code);
      setState(nextState);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to create a room.");
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Brand href="/host" />
        <Link href="/login" className="flex min-h-11 items-center rounded-sm px-2 text-sm font-bold text-[#aaa2b7] underline decoration-[#4b4459] underline-offset-4 hover:text-[#f6f0e6]">Player check-in</Link>
      </header>

      {state ? <HostRoom initialState={state} /> : (
        <main className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-24">
          <section aria-labelledby="host-title">
            <h1 id="host-title" className="max-w-3xl text-6xl font-black leading-[0.9] tracking-[-0.04em] sm:text-8xl lg:text-[7rem]">Call the crew. <span className="text-[#b9a4ff]">Start the night.</span></h1>
          </section>
          <section className="border-t border-[#3a3349] pt-7 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Create an event room</h2>
            <p className="mt-3 leading-7 text-[#aaa2b7]">This browser receives the private host session. The public room code can be shared with every player.</p>
            {error ? <p role="alert" className="mt-5 border-l-2 border-[#ff7a1a] pl-3 text-sm leading-6 text-[#ffb36b]">{error}</p> : null}
            <button type="button" onClick={create} disabled={checking || creating} className="group mt-8 flex min-h-14 w-full items-center justify-between bg-[#ff7a1a] px-5 font-extrabold text-[#120b06] transition-[background-color,transform] hover:bg-[#ff9144] active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#4d3a2c] disabled:text-[#8d7868]">
              <span>{checking ? "Checking host session…" : creating ? "Opening room…" : "Create room"}</span>
              <ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="mt-4 text-xs leading-5 text-[#aaa2b7]">Host access is stored in an HTTP-only cookie and is never added to the URL.</p>
          </section>
        </main>
      )}
    </div>
  );
}
