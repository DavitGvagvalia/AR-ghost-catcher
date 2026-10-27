import { parseCookie, stringifySetCookie } from "cookie";
import type { Response } from "express";

export const HOST_SESSION_COOKIE = "ghost_host_session";
export const PLAYER_SESSION_COOKIE = "ghost_player_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function readCookies(
  cookieHeader: string | undefined,
): Record<string, string | undefined> {
  return cookieHeader ? parseCookie(cookieHeader) : {};
}

export function setSessionCookie(
  response: Response,
  name: typeof HOST_SESSION_COOKIE | typeof PLAYER_SESSION_COOKIE,
  value: string,
  secure: boolean,
): void {
  response.append(
    "Set-Cookie",
    stringifySetCookie({
      name,
      value,
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure,
    }),
  );
}
