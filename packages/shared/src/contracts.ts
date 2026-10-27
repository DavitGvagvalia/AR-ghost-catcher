import type { MarkerId, RoomStatus } from "./constants.js";

export interface HealthResponse {
  status: "ok";
  database: "ready";
  serverTime: number;
}

export interface MarkerClaimPayload {
  markerId: MarkerId;
  requestId: string;
}

export interface EncounterHitPayload {
  encounterId: string;
  attackId: string;
}

export interface EncounterAbandonPayload {
  encounterId: string;
}

export interface RoomSummary {
  code: string;
  status: RoomStatus;
  startedAt: number | null;
  endsAt: number | null;
  finalizedAt: number | null;
}
