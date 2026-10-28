import type {
  ApiErrorResponse,
  EncounterAbandonedPayload,
  EncounterClaimedPayload,
  EncounterDefeatedPayload,
  EncounterHitResultPayload,
  GameActionResult,
  MarkerRuntimeState,
  RoomState,
  RoomSubscribePayload,
  RoomSubscribeResult,
} from "./contracts.js";
import type {
  EncounterAbandonPayload,
  EncounterHitPayload,
  MarkerClaimPayload,
} from "./contracts.js";

export const CLIENT_EVENTS = {
  roomSubscribe: "room:subscribe",
  markerClaim: "marker:claim",
  encounterHit: "encounter:hit",
  encounterAbandon: "encounter:abandon",
  roomSync: "room:sync",
} as const;

export const SERVER_EVENTS = {
  roomState: "room:state",
  roomStarted: "room:started",
  roomExpired: "room:expired",
  roomFinished: "room:finished",
  markerState: "marker:state",
  encounterClaimed: "encounter:claimed",
  encounterHitResult: "encounter:hit-result",
  encounterDefeated: "encounter:defeated",
  scoreUpdated: "score:updated",
  gameError: "game:error",
} as const;

export interface ClientToServerEvents {
  "room:subscribe": (
    payload: RoomSubscribePayload,
    acknowledge: (result: RoomSubscribeResult) => void,
  ) => void;
  "room:sync": (acknowledge: (result: RoomSubscribeResult) => void) => void;
  "marker:claim": (
    payload: MarkerClaimPayload,
    acknowledge: (result: GameActionResult<EncounterClaimedPayload>) => void,
  ) => void;
  "encounter:hit": (
    payload: EncounterHitPayload,
    acknowledge: (
      result: GameActionResult<
        EncounterHitResultPayload | EncounterDefeatedPayload
      >,
    ) => void,
  ) => void;
  "encounter:abandon": (
    payload: EncounterAbandonPayload,
    acknowledge: (result: GameActionResult<EncounterAbandonedPayload>) => void,
  ) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:started": (payload: { startedAt: number; endsAt: number }) => void;
  "room:expired": () => void;
  "room:finished": () => void;
  "marker:state": (payload: MarkerRuntimeState) => void;
  "encounter:claimed": (payload: EncounterClaimedPayload) => void;
  "encounter:hit-result": (payload: EncounterHitResultPayload) => void;
  "encounter:defeated": (payload: EncounterDefeatedPayload) => void;
  "score:updated": (payload: { playerId: string; score: number }) => void;
  "game:error": (error: ApiErrorResponse["error"]) => void;
}
