export const MATCH_DURATION_MS = 1_800_000;
export const MARKER_COOLDOWN_MS = 30_000;
export const MIN_GHOST_HITS = 3;
export const MAX_GHOST_HITS = 12;
export const ENCOUNTER_LEASE_MS = 60_000;
export const MIN_HIT_INTERVAL_MS = 120;
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const ROOM_STATUSES = [
  "LOBBY",
  "RUNNING",
  "AWAITING_FINALIZATION",
  "FINISHED",
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const MARKER_IDS = [
  "marker-01",
  "marker-02",
  "marker-03",
  "marker-04",
  "marker-05",
  "marker-06",
  "marker-07",
  "marker-08",
  "marker-09",
  "marker-10",
  "marker-11",
  "marker-12",
  "marker-13",
  "marker-14",
  "marker-15",
  "marker-16",
  "marker-17",
  "marker-18",
  "marker-19",
  "marker-20",
  "marker-21",
  "marker-22",
  "marker-23",
  "marker-24",
  "marker-25",
  "marker-26",
  "marker-27",
  "marker-28",
  "marker-29",
  "marker-30",
] as const;

export type MarkerId = (typeof MARKER_IDS)[number];
