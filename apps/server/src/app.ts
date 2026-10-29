import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";

import { RoomEvents } from "./domain/room-events.js";
import { RoomService } from "./domain/room-service.js";
import { EncounterService } from "./domain/encounter-service.js";
import { RoomRepository } from "./db/repositories/room-repository.js";
import type { GameDatabase } from "./db/migrations/types.js";
import { createHealthRouter } from "./http/routes/health.js";
import { createRoomsRouter } from "./http/routes/rooms.js";
import { AppError } from "./utils/app-error.js";

export interface CreateAppOptions {
  publicOrigin?: string;
  roomService?: RoomService;
  roomEvents?: RoomEvents;
  secureCookies?: boolean;
}

export function createApp(
  database: GameDatabase,
  options: CreateAppOptions = {},
): express.Express {
  const app = express();
  const publicOrigin = options.publicOrigin ?? "http://localhost:3000";
  const roomService =
    options.roomService ??
    new RoomService(new RoomRepository(database), {
      encounterService: new EncounterService(database),
    });
  const roomEvents = options.roomEvents ?? new RoomEvents();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: publicOrigin, credentials: true }));
  app.use((request, _response, next) => {
    const origin = request.headers.origin;
    const mutatesState = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (mutatesState && origin && origin !== publicOrigin) {
      next(
        new AppError(
          403,
          "ORIGIN_FORBIDDEN",
          "This request came from an untrusted origin.",
        ),
      );
      return;
    }
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use("/api/health", createHealthRouter(database));
  app.use(
    "/api/rooms",
    createRoomsRouter({
      roomService,
      roomEvents,
      secureCookies: options.secureCookies ?? false,
    }),
  );

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  const handleError: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    void _next;
    if (error instanceof AppError) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.issues ? { issues: error.issues } : {}),
        },
      });
      return;
    }

    if (
      error instanceof SyntaxError &&
      "status" in error &&
      error.status === 400
    ) {
      response.status(400).json({
        error: {
          code: "MALFORMED_JSON",
          message: "The request body is not valid JSON.",
        },
      });
      return;
    }

    console.error("Unhandled request error", error);
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "The server could not complete the request.",
      },
    });
  };

  app.use(handleError);
  return app;
}
