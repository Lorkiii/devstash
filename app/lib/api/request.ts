import "server-only";

import { getAuthEnvironment } from "../auth/environment";

export class InvalidJsonRequestError extends Error {
  override readonly name = "InvalidJsonRequestError";
}

export function hasTrustedMutationOrigin(request: Request): boolean {
  const environment = getAuthEnvironment();
  if (!environment) return false;

  const expected = new URL(environment.origin);
  const requestUrl = new URL(request.url);
  if (requestUrl.host !== expected.host || request.headers.get("host") !== expected.host) {
    return false;
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost && forwardedHost !== expected.host) return false;
  return request.headers.get("origin") === environment.origin;
}

export async function readBoundedJson(request: Request, maximumBytes: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") {
    throw new InvalidJsonRequestError();
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new InvalidJsonRequestError();
  }
  if (!request.body) throw new InvalidJsonRequestError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new InvalidJsonRequestError();
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof InvalidJsonRequestError) throw error;
    throw new InvalidJsonRequestError();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return JSON.parse(text) as unknown;
  } catch {
    throw new InvalidJsonRequestError();
  }
}
