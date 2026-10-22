import "server-only";

export function privateJson(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      ...headers,
    },
  });
}

export function requestHasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function requestHasJsonContentType(request: Request) {
  const mediaType = request.headers.get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  return mediaType === "application/json";
}

export async function readBoundedJson(request: Request, maximumBytes: number) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maximumBytes) {
    throw new RangeError("REQUEST_TOO_LARGE");
  }

  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > maximumBytes) {
      await reader.cancel();
      throw new RangeError("REQUEST_TOO_LARGE");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  return JSON.parse(text);
}
