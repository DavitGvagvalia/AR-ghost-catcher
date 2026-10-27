import type {
  ApiErrorResponse,
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
  "marker:claim": (payload: MarkerClaimPayload) => void;
  "encounter:hit": (payload: EncounterHitPayload) => void;
  "encounter:abandon": (payload: EncounterAbandonPayload) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:started": (payload: { startedAt: number; endsAt: number }) => void;
  "room:expired": () => void;
  "room:finished": () => void;
  "marker:state": (payload: unknown) => void;
  "encounter:claimed": (payload: unknown) => void;
  "encounter:hit-result": (payload: unknown) => void;
  "encounter:defeated": (payload: unknown) => void;
  "score:updated": (payload: unknown) => void;
  "game:error": (error: ApiErrorResponse["error"]) => void;
}
