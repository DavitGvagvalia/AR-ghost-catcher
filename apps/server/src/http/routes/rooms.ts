import {
  JoinRoomPayloadSchema,
  RoomCodeSchema,
  type CreateRoomResponse,
  type JoinRoomResponse,
  type RoomTransitionResponse,
  type ResultsResponse,
} from "@ghost-hunt/shared";
import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { RoomEvents } from "../../domain/room-events.js";
import { RoomService } from "../../domain/room-service.js";
import { AppError } from "../../utils/app-error.js";
import {
  HOST_SESSION_COOKIE,
  PLAYER_SESSION_COOKIE,
  readCookies,
  setSessionCookie,
} from "../cookies.js";

export interface RoomsRouterOptions {
  roomService: RoomService;
  roomEvents: RoomEvents;
  secureCookies: boolean;
}

function parseRoomCode(request: Request): string {
  return RoomCodeSchema.parse(request.params.code);
}

function validationError(error: z.ZodError): AppError {
  return new AppError(
    400,
    "VALIDATION_ERROR",
    "The request contains invalid data.",
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  );
}

function rateLimitHandler(_request: Request, response: Response): void {
  response.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Try again shortly.",
    },
  });
}

function notifyRoom(
  roomEvents: RoomEvents,
  roomId: string,
  kind: Parameters<RoomEvents["roomChanged"]>[1] = "STATE",
): void {
  void roomEvents.roomChanged(roomId, kind).catch((error: unknown) => {
    console.error("Room state notification failed", error);
  });
}

const createRoomLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const joinRoomLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const hostActionLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export function createRoomsRouter({
  roomService,
  roomEvents,
  secureCookies,
}: RoomsRouterOptions): Router {
  const router = Router();

  router.post("/", createRoomLimit, (request, response, next) => {
    try {
      const created = roomService.createRoom();
      setSessionCookie(
        response,
        HOST_SESSION_COOKIE,
        created.hostToken,
        secureCookies,
      );
      response.setHeader("Cache-Control", "no-store");
      const body: CreateRoomResponse = { state: created.state };
      response.status(201).json(body);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/join", joinRoomLimit, (request, response, next) => {
    try {
      const code = parseRoomCode(request);
      const payload = JoinRoomPayloadSchema.parse(request.body);
      const joined = roomService.joinRoom(code, payload.nickname);
      setSessionCookie(
        response,
        PLAYER_SESSION_COOKIE,
        joined.playerToken,
        secureCookies,
      );
      response.setHeader("Cache-Control", "no-store");
      const body: JoinRoomResponse = { state: joined.state };
      response.status(201).json(body);
      notifyRoom(roomEvents, joined.roomId);
    } catch (error) {
      next(error instanceof z.ZodError ? validationError(error) : error);
    }
  });

  router.post("/:code/resume", (request, response, next) => {
    try {
      const code = parseRoomCode(request);
      const cookies = readCookies(request.headers.cookie);
      const state = roomService.resumePlayer(
        code,
        cookies[PLAYER_SESSION_COOKIE],
      );
      response.setHeader("Cache-Control", "no-store");
      const body: JoinRoomResponse = { state };
      response.status(200).json(body);
    } catch (error) {
      next(error instanceof z.ZodError ? validationError(error) : error);
    }
  });

  router.get("/:code/state", (request, response, next) => {
    try {
      const code = parseRoomCode(request);
      const cookies = readCookies(request.headers.cookie);
      const session = roomService.authenticateForRoom(code, {
        hostToken: cookies[HOST_SESSION_COOKIE],
        playerToken: cookies[PLAYER_SESSION_COOKIE],
      });
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({ state: roomService.getState(session) });
    } catch (error) {
      next(error instanceof z.ZodError ? validationError(error) : error);
    }
  });

  router.get("/:code/results", (request, response, next) => {
    try {
      const code = parseRoomCode(request);
      const cookies = readCookies(request.headers.cookie);
      const session = roomService.authenticateForRoom(code, {
        hostToken: cookies[HOST_SESSION_COOKIE],
        playerToken: cookies[PLAYER_SESSION_COOKIE],
      });
      const body: ResultsResponse = { results: roomService.getResults(session) };
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json(body);
    } catch (error) {
      next(error instanceof z.ZodError ? validationError(error) : error);
    }
  });

  router.post(
    "/:code/start",
    hostActionLimit,
    (request, response, next) => {
      try {
        const code = parseRoomCode(request);
        const cookies = readCookies(request.headers.cookie);
        const session = roomService.authenticateForRoom(code, {
          hostToken: cookies[HOST_SESSION_COOKIE],
          playerToken: cookies[PLAYER_SESSION_COOKIE],
        });
        const body: RoomTransitionResponse = {
          state: roomService.startMatch(session),
        };
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json(body);
        notifyRoom(roomEvents, session.roomId, "STARTED");
      } catch (error) {
        next(error instanceof z.ZodError ? validationError(error) : error);
      }
    },
  );

  router.post(
    "/:code/end",
    hostActionLimit,
    (request, response, next) => {
      try {
        const code = parseRoomCode(request);
        const cookies = readCookies(request.headers.cookie);
        const session = roomService.authenticateForRoom(code, {
          hostToken: cookies[HOST_SESSION_COOKIE],
          playerToken: cookies[PLAYER_SESSION_COOKIE],
        });
        const before = roomService.getState(session).room.status;
        const body: RoomTransitionResponse = {
          state: roomService.finalizeMatch(session),
        };
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json(body);
        if (before !== "FINISHED") {
          notifyRoom(roomEvents, session.roomId, "FINISHED");
        }
      } catch (error) {
        next(error instanceof z.ZodError ? validationError(error) : error);
      }
    },
  );

  return router;
}
