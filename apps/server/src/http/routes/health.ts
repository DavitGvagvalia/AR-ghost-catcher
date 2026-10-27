import type { HealthResponse } from "@ghost-hunt/shared";
import { Router } from "express";

import type { GameDatabase } from "../../db/migrations/types.js";

interface DatabaseProbe {
  ok: number;
}

export function createHealthRouter(database: GameDatabase): Router {
  const router = Router();
  const probeDatabase = database.prepare("SELECT 1 AS ok");

  router.get("/", (_request, response, next) => {
    try {
      const probe = probeDatabase.get() as DatabaseProbe | undefined;

      if (probe?.ok !== 1) {
        throw new Error("SQLite readiness probe returned an unexpected result");
      }

      const body: HealthResponse = {
        status: "ok",
        database: "ready",
        serverTime: Date.now(),
      };

      response.status(200).json(body);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
