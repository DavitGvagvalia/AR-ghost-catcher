import express, { type ErrorRequestHandler } from "express";

import type { GameDatabase } from "./db/migrations/types.js";
import { createHealthRouter } from "./http/routes/health.js";

export function createApp(database: GameDatabase): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use("/api/health", createHealthRouter(database));

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
    console.error("Unhandled request error", error);
    response.status(503).json({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "The service is temporarily unavailable",
      },
    });
  };

  app.use(handleError);
  return app;
}
