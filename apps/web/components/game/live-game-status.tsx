"use client";

import {
  type EncounterSnapshot,
  type MarkerId,
  type RoomState,
} from "@ghost-hunt/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArHuntScene } from "@/components/ar/ar-hunt-scene";
import { Brand } from "@/components/ui/brand";
import { useMatchCountdown } from "@/hooks/use-match-countdown";
import { useRoomChannel } from "@/hooks/use-room-channel";
import { getGameSocket } from "@/lib/socket";
import { formatMatchTime } from "./match-timer";

type CameraPhase = "GATE" | "STARTING" | "ACTIVE" | "ERROR";

function cameraFailureMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera access was denied. Allow camera access in your browser settings, then try again.";
    }
    if (
      error.name === "NotFoundError" ||
      error.name === "OverconstrainedError"
    ) {
      return "No compatible rear camera is available on this device.";
    }
    if (error.name === "NotReadableError" || error.name === "AbortError") {
      return "The camera is busy or was interrupted. Close other camera apps, then try again.";
    }
  }
  return "The camera could not start. Check browser permission and try again.";
}

function scoreForCurrentPlayer(state: RoomState): number {
  return (
    state.players.find((player) => player.id === state.currentPlayerId)
      ?.score ?? 0
  );
}

export function LiveGameStatus({ initialState }: { initialState: RoomState }) {
  const router = useRouter();
  const { roomState, connectionState, connectionError, replaceRoomState } =
    useRoomChannel(initialState.room.code, initialState);
  const remainingMs = useMatchCountdown(
    roomState.room.endsAt,
    roomState.serverTime,
  );
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>("GATE");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [runtimeState, setRuntimeState] = useState<
    "LOADING" | "READY" | "ERROR"
  >("LOADING");
  const [visibleMarkers, setVisibleMarkers] = useState<ReadonlySet<MarkerId>>(
    () => new Set(),
  );
  const [localEncounter, setLocalEncounter] =
    useState<EncounterSnapshot | null>(initialState.activeEncounter);
  const [claimPending, setClaimPending] = useState(false);
  const [lastScannedMarker, setLastScannedMarker] = useState<MarkerId | null>(
    null,
  );
  const [hitPending, setHitPending] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [hitSignal, setHitSignal] = useState(0);
  const [defeatSignal, setDefeatSignal] = useState(0);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const defeatingRef = useRef(false);

  const activeEncounter = localEncounter ?? roomState.activeEncounter;
  const activeMarkerVisible = activeEncounter
    ? visibleMarkers.has(activeEncounter.markerId)
    : false;
  const score = scoreForCurrentPlayer(roomState);
  const lastMarkerState = lastScannedMarker
    ? (roomState.markers.find(
        (marker) => marker.markerId === lastScannedMarker,
      ) ?? null)
    : null;
  const cooldownRemainingMs = useMatchCountdown(
    lastMarkerState?.cooldownUntil ?? null,
    roomState.serverTime,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!defeatingRef.current) setLocalEncounter(roomState.activeEncounter);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [roomState.activeEncounter, roomState.serverTime]);

  useEffect(() => {
    if (!activeEncounter) return;
    const delay = Math.max(
      0,
      activeEncounter.leaseExpiresAt - roomState.serverTime,
    );
    const timer = window.setTimeout(() => {
      if (defeatingRef.current) return;
      setLocalEncounter(null);
      getGameSocket(roomState.room.code, "PLAYER").emit(
        "room:sync",
        (result) => {
          if (result.ok) replaceRoomState(result.state);
        },
      );
    }, delay + 100);
    return () => window.clearTimeout(timer);
  }, [
    activeEncounter,
    replaceRoomState,
    roomState.room.code,
    roomState.serverTime,
  ]);

  useEffect(() => {
    if (roomState.room.status === "LOBBY") {
      router.replace(`/lobby?room=${roomState.room.code}`);
    }
    if (roomState.room.status === "FINISHED") {
      router.replace(
        `/results?room=${encodeURIComponent(roomState.room.code)}`,
      );
    }
  }, [roomState.room.code, roomState.room.status, router]);

  useEffect(() => {
    if (cameraPhase !== "ACTIVE" || runtimeState !== "READY") return;
    const checkCamera = (): void => {
      if (document.visibilityState !== "visible") return;
      const stream = document.querySelector<HTMLVideoElement>(
        "video[data-ghost-hunt-camera]",
      )?.srcObject;
      const hasLiveTrack =
        stream instanceof MediaStream &&
        stream.getVideoTracks().some((track) => track.readyState === "live");
      if (!hasLiveTrack) {
        setCameraError(
          "The camera stopped while the hunt was interrupted. Resume it to continue.",
        );
        setCameraPhase("ERROR");
      }
    };
    document.addEventListener("visibilitychange", checkCamera);
    window.addEventListener("pageshow", checkCamera);
    return () => {
      document.removeEventListener("visibilitychange", checkCamera);
      window.removeEventListener("pageshow", checkCamera);
    };
  }, [cameraPhase, runtimeState]);

  useEffect(
    () => () => {
      void audioContextRef.current?.close();
    },
    [],
  );

  const startCamera = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "This browser does not provide the camera access required for AR.",
      );
      setCameraPhase("ERROR");
      return;
    }

    setCameraPhase("STARTING");
    setCameraError(null);
    setRuntimeState("LOADING");
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      for (const track of permissionStream.getTracks()) track.stop();
      setCameraKey((value) => value + 1);
      setCameraPhase("ACTIVE");
    } catch (error) {
      setCameraError(cameraFailureMessage(error));
      setCameraPhase("ERROR");
    }
  }, []);

  const playHitTone = useCallback(
    (defeated: boolean): void => {
      if (!soundEnabled) return;
      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = defeated ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(
        defeated ? 520 : 220,
        context.currentTime,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        defeated ? 860 : 160,
        context.currentTime + 0.12,
      );
      gain.gain.setValueAtTime(0.07, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
    },
    [soundEnabled],
  );

  const handleMarkerVisibility = useCallback(
    (markerId: MarkerId, visible: boolean) => {
      setVisibleMarkers((current) => {
        const next = new Set(current);
        if (visible) next.add(markerId);
        else next.delete(markerId);
        return next;
      });
    },
    [],
  );

  const handleMarkerStable = useCallback(
    (markerId: MarkerId): void => {
      if (claimPending || activeEncounter || connectionState !== "CONNECTED")
        return;
      setLastScannedMarker(markerId);
      setClaimPending(true);
      setActionMessage(`Checking ${markerId}…`);
      getGameSocket(roomState.room.code, "PLAYER").emit(
        "marker:claim",
        { markerId, requestId: crypto.randomUUID() },
        (result) => {
          setClaimPending(false);
          if (!result.ok) {
            setActionMessage(result.error.message);
            return;
          }
          setLocalEncounter(result.data);
          setActionMessage(`Ghost locked to ${result.data.markerId}.`);
        },
      );
    },
    [activeEncounter, claimPending, connectionState, roomState.room.code],
  );

  const handleAttack = useCallback((): void => {
    if (
      !activeEncounter ||
      !activeMarkerVisible ||
      hitPending ||
      connectionState !== "CONNECTED"
    ) {
      return;
    }
    setHitPending(true);
    getGameSocket(roomState.room.code, "PLAYER").emit(
      "encounter:hit",
      {
        encounterId: activeEncounter.encounterId,
        attackId: crypto.randomUUID(),
      },
      (result) => {
        setHitPending(false);
        if (!result.ok) {
          setActionMessage(result.error.message);
          return;
        }
        if ("pointsAwarded" in result.data) {
          defeatingRef.current = true;
          setDefeatSignal((value) => value + 1);
          setLastPoints(result.data.pointsAwarded);
          setActionMessage(
            `Ghost defeated. +${result.data.pointsAwarded} points verified.`,
          );
          playHitTone(true);
          window.setTimeout(() => {
            defeatingRef.current = false;
            setLocalEncounter(null);
          }, 520);
          return;
        }
        if (!result.data.duplicate) {
          setHitSignal((value) => value + 1);
          playHitTone(false);
        }
        setLocalEncounter(result.data);
        setActionMessage(`${result.data.remainingHits} hits remaining.`);
      },
    );
  }, [
    activeEncounter,
    activeMarkerVisible,
    connectionState,
    hitPending,
    playHitTone,
    roomState.room.code,
  ]);

  const huntInstruction = useMemo(() => {
    if (connectionState !== "CONNECTED") return "Reconnecting to the hunt…";
    if (runtimeState !== "READY") return "Starting the camera view…";
    if (claimPending) return actionMessage ?? "Checking marker…";
    if (activeEncounter && !activeMarkerVisible) {
      return `Find ${activeEncounter.markerId} again to continue.`;
    }
    if (activeEncounter) {
      return `${activeEncounter.remainingHits} hit${activeEncounter.remainingHits === 1 ? "" : "s"} remaining`;
    }
    if (
      lastMarkerState?.status === "COOLDOWN" &&
      cooldownRemainingMs !== null &&
      cooldownRemainingMs > 0
    ) {
      return `${lastMarkerState.markerId} recovering — ${Math.ceil(cooldownRemainingMs / 1_000)}s`;
    }
    if (
      lastMarkerState?.status === "RESERVED" &&
      !lastMarkerState.reservedByCurrentPlayer
    ) {
      return "Ghost being hunted by another player.";
    }
    return actionMessage ?? "Hold a printed marker steady in the frame.";
  }, [
    actionMessage,
    activeEncounter,
    activeMarkerVisible,
    claimPending,
    connectionState,
    cooldownRemainingMs,
    lastMarkerState,
    runtimeState,
  ]);

  if (roomState.room.status === "AWAITING_FINALIZATION") {
    return (
      <main className="grid min-h-dvh place-content-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center">
        <p className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-[#ffb36b]">
          00:00
        </p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Time is up.
        </h1>
        <p className="mt-4 text-lg text-[#aaa2b7]">
          Waiting for the host to publish the final standings.
        </p>
      </main>
    );
  }

  if (cameraPhase !== "ACTIVE") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <header className="flex items-center justify-between">
          <Brand />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#aaa2b7]">
            Room {roomState.room.code}
          </span>
        </header>
        <section className="my-auto max-w-2xl py-12">
          <h1 className="max-w-xl text-5xl font-black tracking-[-0.04em] sm:text-7xl">
            Put a ghost in the room.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#d4ccdc]">
            Enter the hunt to grant camera access. Point the rear camera at one
            printed marker and keep it visible while you attack.
          </p>
          {cameraError ? (
            <p role="alert" className="mt-6 max-w-lg text-[#ffb36b]">
              {cameraError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={cameraPhase === "STARTING"}
            className="mt-8 min-h-14 rounded-xl bg-[#ff7a1a] px-7 font-extrabold text-[#120b06] transition-colors hover:bg-[#ff9144] disabled:cursor-wait disabled:bg-[#5b351d] disabled:text-[#aaa2b7]"
          >
            {cameraPhase === "STARTING"
              ? "Requesting camera…"
              : cameraPhase === "ERROR"
                ? "Try camera again"
                : "Enter hunt"}
          </button>
          <p className="mt-5 max-w-md text-sm leading-6 text-[#aaa2b7]">
            Camera access requires HTTPS or localhost. The camera cannot remain
            active while your browser is backgrounded or your phone is locked.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#09070f]">
      <ArHuntScene
        key={cameraKey}
        activeEncounter={activeEncounter}
        hitSignal={hitSignal}
        defeatSignal={defeatSignal}
        disabled={
          hitPending || !activeMarkerVisible || connectionState !== "CONNECTED"
        }
        onMarkerStable={handleMarkerStable}
        onMarkerVisibility={handleMarkerVisibility}
        onAttack={handleAttack}
        onRuntimeState={(state) => {
          setRuntimeState(state);
          if (state === "ERROR") {
            setCameraError(
              "The AR runtime could not start. Check the camera permission and try again.",
            );
            setCameraPhase("ERROR");
          }
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-[#09070f]/95 via-[#09070f]/62 to-transparent pb-14 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-4 px-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#d4ccdc]">
              Time
            </p>
            <time className="font-mono text-2xl font-black tabular-nums tracking-[0.06em]">
              {formatMatchTime(remainingMs)}
            </time>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#d4ccdc]">
              Score
            </p>
            <p className="font-mono text-2xl font-black tabular-nums text-[#7df9e7]">
              {score}
            </p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#09070f] via-[#09070f]/88 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-24 sm:px-6">
        <div className="pointer-events-auto mx-auto max-w-lg">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p role="status" className="max-w-sm font-bold text-[#f6f0e6]">
                {huntInstruction}
              </p>
              {activeEncounter ? (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#b9a4ff]">
                  Ghost · {activeEncounter.markerId}
                </p>
              ) : lastPoints ? (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#7df9e7]">
                  Last capture +{lastPoints}
                </p>
              ) : null}
            </div>
            <span
              className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${connectionState === "CONNECTED" ? "text-[#7df9e7]" : "text-[#ffb36b]"}`}
            >
              {connectionState === "CONNECTED" ? "Live" : "Offline"}
            </span>
          </div>

          {activeEncounter ? (
            <button
              type="button"
              onClick={handleAttack}
              disabled={
                !activeMarkerVisible ||
                hitPending ||
                connectionState !== "CONNECTED"
              }
              className="min-h-14 w-full rounded-xl bg-[#ff7a1a] px-6 text-lg font-black text-[#120b06] transition-colors hover:bg-[#ff9144] disabled:cursor-not-allowed disabled:bg-[#5b351d] disabled:text-[#aaa2b7]"
            >
              {hitPending
                ? "Verifying hit…"
                : activeMarkerVisible
                  ? "Attack ghost"
                  : "Marker out of view"}
            </button>
          ) : null}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen((value) => !value)}
              className="min-h-11 flex-1 rounded-xl border border-[#3a3349] bg-[#12101b]/92 px-4 text-sm font-bold"
            >
              Camera help
            </button>
            <button
              type="button"
              aria-pressed={soundEnabled}
              onClick={() => setSoundEnabled((value) => !value)}
              className="min-h-11 flex-1 rounded-xl border border-[#3a3349] bg-[#12101b]/92 px-4 text-sm font-bold"
            >
              Sound {soundEnabled ? "on" : "off"}
            </button>
          </div>

          {helpOpen ? (
            <div className="mt-3 rounded-xl bg-[#12101b] p-4 text-sm leading-6 text-[#d4ccdc] shadow-[0_14px_40px_rgba(0,0,0,0.42)]">
              Keep the full black border of one marker in view. If tracking is
              lost, move slowly back to the same marker. If the camera stops
              after switching apps or locking the phone, resume it below.
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setCameraPhase("GATE");
                }}
                className="mt-3 min-h-11 w-full rounded-xl border border-[#b9a4ff] px-4 font-bold text-[#b9a4ff]"
              >
                Resume camera
              </button>
            </div>
          ) : null}
          {connectionError ? (
            <p className="mt-3 text-sm text-[#ffb36b]">{connectionError}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
