import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

function privateAuthResponse(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    const response = await handler(request);
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("Pragma", "no-cache");
    return response;
  };
}

export const GET = privateAuthResponse(handlers.GET);
export const POST = privateAuthResponse(handlers.POST);
