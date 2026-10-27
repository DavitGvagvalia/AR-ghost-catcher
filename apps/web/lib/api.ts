import type { ApiErrorResponse, CreateRoomResponse, FinalResults, JoinRoomResponse, ResultsResponse, RoomState, RoomTransitionResponse } from "@ghost-hunt/shared";
import { API_ORIGIN } from "./config";

export class ApiClientError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError("NETWORK_ERROR", "The game server is unreachable. Check that it is running, then try again.", 0);
  }

  const body = (await response.json().catch(() => null)) as T | ApiErrorResponse | null;
  if (!response.ok) {
    const error =
      body !== null && typeof body === "object" && "error" in body
        ? body.error
        : null;
    throw new ApiClientError(error?.code ?? "REQUEST_FAILED", error?.message ?? "The request could not be completed.", response.status);
  }
  if (body === null) {
    throw new ApiClientError("INVALID_RESPONSE", "The game server returned an invalid response.", response.status);
  }
  return body as T;
}

export async function createRoom(): Promise<RoomState> {
  return (await request<CreateRoomResponse>("/api/rooms", { method: "POST" })).state;
}

export async function joinRoom(roomCode: string, nickname: string): Promise<RoomState> {
  return (await request<JoinRoomResponse>(`/api/rooms/${encodeURIComponent(roomCode)}/join`, {
    method: "POST",
    body: JSON.stringify({ nickname }),
  })).state;
}

export async function resumeRoom(roomCode: string): Promise<RoomState> {
  return (await request<JoinRoomResponse>(`/api/rooms/${encodeURIComponent(roomCode)}/resume`, { method: "POST" })).state;
}

export async function getRoomState(roomCode: string): Promise<RoomState> {
  return (await request<{ state: RoomState }>(`/api/rooms/${encodeURIComponent(roomCode)}/state`)).state;
}

export async function startRoom(roomCode: string): Promise<RoomState> {
  return (await request<RoomTransitionResponse>(`/api/rooms/${encodeURIComponent(roomCode)}/start`, { method: "POST" })).state;
}

export async function endRoom(roomCode: string): Promise<RoomState> {
  return (await request<RoomTransitionResponse>(`/api/rooms/${encodeURIComponent(roomCode)}/end`, { method: "POST" })).state;
}

export async function getResults(roomCode: string): Promise<FinalResults> {
  return (await request<ResultsResponse>(`/api/rooms/${encodeURIComponent(roomCode)}/results`)).results;
}
