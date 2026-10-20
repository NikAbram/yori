import { cookies } from "next/headers";
import { z } from "zod";

import {
  createTelegramSession,
  getTelegramSessionCookieName,
  getTelegramSessionCookieOptions,
  TelegramAuthError,
  TELEGRAM_INIT_DATA_MAX_LENGTH,
  verifyTelegramInitData,
} from "@/services/telegram-auth";

const MAX_REQUEST_BYTES = TELEGRAM_INIT_DATA_MAX_LENGTH + 256;
const requestSchema = z.object({ initData: z.string().min(1).max(TELEGRAM_INIT_DATA_MAX_LENGTH) }).strict();

function privateJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
    },
  });
}

function requestHasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function readBoundedJson(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_REQUEST_BYTES) {
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
    if (bytesRead > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new RangeError("REQUEST_TOO_LARGE");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  return JSON.parse(text);
}

export async function POST(request: Request) {
  if (!requestHasTrustedOrigin(request)) {
    return privateJson({ error: "Запрос отклонён." }, 403);
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return privateJson({ error: "Ожидается JSON." }, 415);
  }

  try {
    const parsedBody = requestSchema.safeParse(await readBoundedJson(request));
    if (!parsedBody.success) return privateJson({ error: "Некорректный запрос." }, 400);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return privateJson({ error: "Telegram-вход временно недоступен." }, 503);

    const identity = verifyTelegramInitData(parsedBody.data.initData, botToken);
    const session = await createTelegramSession(identity);
    const cookieStore = await cookies();
    cookieStore.set(
      getTelegramSessionCookieName(),
      session.token,
      getTelegramSessionCookieOptions(session.ttlSeconds),
    );

    return privateJson({
      authenticated: true,
      user: {
        firstName: session.owner.firstName,
        username: session.owner.username,
      },
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return privateJson({ error: "Запрос слишком большой." }, 413);
    }
    if (error instanceof TelegramAuthError) {
      return privateJson({ error: "Не удалось подтвердить Telegram-сессию." }, 401);
    }
    if (error instanceof SyntaxError) {
      return privateJson({ error: "Некорректный JSON." }, 400);
    }

    return privateJson({ error: "Telegram-вход временно недоступен." }, 503);
  }
}
