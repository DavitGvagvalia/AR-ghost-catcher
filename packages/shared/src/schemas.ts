import { z } from "zod";

import { MARKER_IDS, ROOM_STATUSES } from "./constants.js";
import { GHOST_MODEL_IDS } from "./ghost-manifest.js";

const CONTROL_OR_FORMAT_CHARACTER = /[\p{Cc}\p{Cf}]/u;

export const RoomStatusSchema = z.enum(ROOM_STATUSES);
export const MarkerIdSchema = z.enum(MARKER_IDS);
export const GhostModelIdSchema = z.enum(GHOST_MODEL_IDS);

export const NicknameSchema = z
  .string()
  .trim()
  .min(2, "Nickname must be at least 2 characters")
  .max(24, "Nickname must be at most 24 characters")
  .refine(
    (nickname) => !CONTROL_OR_FORMAT_CHARACTER.test(nickname),
    "Nickname cannot contain control or invisible formatting characters",
  );

export const StableIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine(
    (id) => !CONTROL_OR_FORMAT_CHARACTER.test(id),
    "Identifier contains invalid characters",
  );

export const MarkerClaimPayloadSchema = z
  .object({
    markerId: MarkerIdSchema,
    requestId: StableIdSchema,
  })
  .strict();

export const EncounterHitPayloadSchema = z
  .object({
    encounterId: StableIdSchema,
    attackId: StableIdSchema,
  })
  .strict();

export const EncounterAbandonPayloadSchema = z
  .object({ encounterId: StableIdSchema })
  .strict();
