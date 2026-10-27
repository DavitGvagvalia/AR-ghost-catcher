"use client";

import { RoomCodeSchema } from "@ghost-hunt/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Brand } from "@/components/ui/brand";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ApiClientError, joinRoom, resumeRoom } from "@/lib/api";
import { roomMemory } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [lastRoom] = useState(() => roomMemory.getPlayerRoom());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const state = await joinRoom(roomCode, nickname);
      roomMemory.setPlayerRoom(state.room.code);
      router.push(`/lobby?room=${encodeURIComponent(state.room.code)}`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to join this room.");
      setBusy(false);
    }
  }

  async function resume() {
    if (!lastRoom) return;
    setBusy(true);
    setError(null);
    try {
      const state = await resumeRoom(lastRoom);
      router.push(`/lobby?room=${encodeURIComponent(state.room.code)}`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to resume this room.");
      setBusy(false);
    }
  }

  const validRoom = RoomCodeSchema.safeParse(roomCode).success;
  const validNickname = nickname.trim().length >= 2 && nickname.trim().length <= 24;

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Brand />
        <Link href="/host" className="flex min-h-11 items-center rounded-sm px-2 text-sm font-bold text-[#aaa2b7] underline decoration-[#4b4459] underline-offset-4 transition-colors hover:text-[#f6f0e6]">Host a game</Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-24 lg:py-14">
        <section aria-labelledby="login-title">
          <h1 id="login-title" className="max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.04em] text-[#f6f0e6] sm:text-7xl lg:text-[7.1rem] lg:leading-[0.88]">
            Find the signal. <span className="text-[#b9a4ff]">Catch the ghosts.</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#aaa2b7] sm:mt-6 sm:text-lg sm:leading-7">
            Join your event room, scan the hidden markers, and tap fast. Every ghost is worth exactly as many points as it takes to defeat.
          </p>
        </section>

        <section className="relative rounded-2xl border border-[#3a3349] bg-[#12101b]/65 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-8 lg:ml-2" aria-label="Join a room">
          <div className="absolute -left-px top-8 h-20 w-0.5 bg-[#ff7a1a] shadow-[0_0_24px_rgba(255,122,26,0.45)]" />
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Enter the hunt</h2>

          <form onSubmit={submit} className="mt-5 space-y-4 sm:mt-7 sm:space-y-5" noValidate>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#d4ccdc]">Room code</span>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                maxLength={6}
                placeholder="ABC123"
                aria-describedby="room-help"
                className="min-h-12 w-full rounded-xl border border-[#4a425c] bg-[#0d0b14] px-4 font-mono text-lg font-black uppercase tracking-[0.18em] text-[#f6f0e6] caret-[#ff7a1a] transition-colors hover:border-[#6a607f] focus:border-[#7df9e7] focus:outline-none sm:min-h-14"
              />
              <span id="room-help" className="mt-2 block text-xs text-[#8d869b]">Six characters from your host screen.</span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#d4ccdc]">Hunter name</span>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value.slice(0, 24))}
                autoComplete="nickname"
                maxLength={24}
                placeholder="Night Owl"
                className="min-h-12 w-full rounded-xl border border-[#4a425c] bg-[#0d0b14] px-4 text-base font-bold text-[#f6f0e6] caret-[#ff7a1a] transition-colors hover:border-[#6a607f] focus:border-[#7df9e7] focus:outline-none sm:min-h-14"
              />
            </label>

            {error ? <p role="alert" className="border-l-2 border-[#ff7a1a] pl-3 text-sm leading-6 text-[#ffb36b]">{error}</p> : null}

            <button type="submit" disabled={busy || !validRoom || !validNickname} className="group flex min-h-13 w-full items-center justify-between rounded-xl bg-[#ff7a1a] px-5 font-extrabold text-[#120b06] transition-[background-color,transform] hover:bg-[#ff9144] active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#4d3a2c] disabled:text-[#a38b78] sm:min-h-14">
              <span>{busy ? "Checking signal…" : "Join the room"}</span>
              <ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <p className="mt-3 text-xs leading-5 text-[#aaa2b7]">Your private player session stays on this device and is never placed in the room URL.</p>

          {lastRoom ? (
            <button type="button" disabled={busy} onClick={resume} className="mt-5 min-h-11 text-sm font-bold text-[#b9a4ff] underline decoration-[#574c78] underline-offset-4 hover:text-[#d4caff] disabled:opacity-50">
              Resume room {lastRoom}
            </button>
          ) : null}
        </section>
      </main>
    </div>
  );
}
