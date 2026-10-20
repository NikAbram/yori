import { createOrderRequestSchema } from "@/lib/checkout-schema";
import { privateJson, readBoundedJson, requestHasTrustedOrigin } from "@/lib/server-request";
import { CartPricingError } from "@/services/cart-pricing";
import { CheckoutRateLimitError } from "@/services/checkout-rate-limit";
import { createOrder, OrderingError } from "@/services/ordering";
import { getCurrentTelegramSession } from "@/services/telegram-auth";

const MAX_REQUEST_BYTES = 16_384;

export async function POST(request: Request) {
  if (!requestHasTrustedOrigin(request)) {
    return privateJson({ error: "Запрос отклонён." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return privateJson({ error: "Ожидается JSON." }, 415);
  }

  try {
    const input = createOrderRequestSchema.safeParse(
      await readBoundedJson(request, MAX_REQUEST_BYTES),
    );
    if (!input.success) return privateJson({ error: "Проверьте данные заказа." }, 400);

    const session = await getCurrentTelegramSession();
    if (!session) return privateJson({ error: "Требуется вход через Telegram." }, 401);

    // Until part 3.5 introduces the complete mode policy, checkout fails closed.
    if (process.env.ORDER_MODE !== "private_test" || !session.allowPrivateTest) {
      return privateJson({ error: "Приём заказов сейчас закрыт." }, 409);
    }

    const result = await createOrder(session.userId, input.data);
    return privateJson({ order: result.order, repeated: !result.created }, result.created ? 201 : 200);
  } catch (error) {
    if (error instanceof RangeError) {
      return privateJson({ error: "Запрос слишком большой." }, 413);
    }
    if (error instanceof SyntaxError) {
      return privateJson({ error: "Некорректный JSON." }, 400);
    }
    if (error instanceof CheckoutRateLimitError) {
      return privateJson(
        { error: "Слишком много попыток оформления. Попробуйте позже." },
        429,
        { "Retry-After": String(error.retryAfterSeconds) },
      );
    }
    if (error instanceof CartPricingError) {
      if (error.code === "MINIMUM_ORDER_NOT_MET") {
        return privateJson({
          error: "Минимальная сумма заказа ещё не достигнута.",
          minimumOrderKopeks: error.details?.minimumOrderKopeks,
        }, 409);
      }
      if (error.code === "ITEM_UNAVAILABLE") {
        return privateJson({ error: "Состав корзины изменился. Проверьте товары ещё раз." }, 409);
      }
      return privateJson({ error: "Приём заказов сейчас закрыт." }, 409);
    }
    if (error instanceof OrderingError) {
      return privateJson(
        { error: error.code === "PAYMENT_METHOD_UNAVAILABLE"
          ? "Выбранный способ оплаты сейчас недоступен."
          : "Не удалось безопасно повторить запрос." },
        409,
      );
    }

    return privateJson({ error: "Не удалось создать заказ. Попробуйте позже." }, 503);
  }
}
