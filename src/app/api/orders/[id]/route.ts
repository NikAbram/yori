import { z } from "zod";

import { privateJson } from "@/lib/server-request";
import { getCustomerOrder } from "@/services/customer-orders";
import { getCurrentTelegramSession } from "@/services/telegram-auth";

const orderIdSchema = z.uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentTelegramSession();
  if (!session) return privateJson({ error: "Требуется вход через Telegram." }, 401);

  const parsedId = orderIdSchema.safeParse((await context.params).id);
  if (!parsedId.success) return privateJson({ error: "Заказ не найден." }, 404);

  try {
    const order = await getCustomerOrder(session.userId, parsedId.data);
    if (!order) return privateJson({ error: "Заказ не найден." }, 404);
    return privateJson({ order });
  } catch {
    return privateJson({ error: "Не удалось загрузить заказ." }, 503);
  }
}
