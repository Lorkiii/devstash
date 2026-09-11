import "server-only";

import { NextResponse } from "next/server";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
} as const;

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status, headers: PRIVATE_HEADERS });
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status, headers: PRIVATE_HEADERS });
}
