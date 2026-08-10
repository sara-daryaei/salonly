import { NextResponse } from "next/server";

export type ApiSuccess<T = unknown> = {
  ok: true;
  data?: T;
};

export type ApiFailure = {
  ok: false;
  error: string;
};

export function apiOk<T>(data?: T, init?: ResponseInit) {
  const body: ApiSuccess<T> = data === undefined ? { ok: true } : { ok: true, data };
  return NextResponse.json(body, init);
}

export function apiError(error: string, status: 400 | 401 | 403 | 404 | 409 | 500) {
  const body: ApiFailure = { ok: false, error };
  return NextResponse.json(body, { status });
}

export function safeApiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}
