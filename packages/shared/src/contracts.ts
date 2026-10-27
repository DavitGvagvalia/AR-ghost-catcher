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

export interface PlayerSummary {
  id: string;
  nickname: string;
  score: number;
  isConnected: boolean;
  joinedAt: number;
}

export type RoomRole = "HOST" | "PLAYER";

export interface RoomState {
  room: RoomSummary;
  players: PlayerSummary[];
  role: RoomRole;
  currentPlayerId: string | null;
  serverTime: number;
}

export interface CreateRoomResponse {
  state: RoomState;
}

export interface JoinRoomResponse {
  state: RoomState;
}

export interface RoomTransitionResponse {
  state: RoomState;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  score: number;
  isWinner: boolean;
}

export interface FinalResults {
  roomCode: string;
  finalizedAt: number;
  topScore: number;
  winners: string[];
  leaderboard: LeaderboardEntry[];
}

export interface ResultsResponse {
  results: FinalResults;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    issues?: readonly {
      path: string;
      message: string;
    }[];
  };
}

export interface RoomSubscribePayload {
  roomCode: string;
}

export type RoomSubscribeResult =
  | { ok: true; state: RoomState }
  | { ok: false; error: ApiErrorResponse["error"] };
