import { describe, expect, it } from "vitest";
import { checkoutSchema, createOrderRequestSchema, normalizeRussianPhone } from "./checkout-schema";

const validInput = {
  recipientName: "Анна",
  phone: "+7 927 123-45-67",
  city: "Самара",
  street: "Ленинградская",
  house: "12",
  apartment: "",
  entrance: "",
  floor: "",
  comment: "",
  paymentMethod: "CASH_ON_DELIVERY" as const,
  consent: true,
};

describe("checkout schema", () => {
  it("normalizes common Russian phone formats", () => {
    expect(normalizeRussianPhone("8 (927) 123-45-67")).toBe("+79271234567");
    expect(normalizeRussianPhone("9271234567")).toBe("+79271234567");
  });

  it("accepts valid input and returns normalized values", () => {
    const result = checkoutSchema.parse(validInput);
    expect(result.phone).toBe("+79271234567");
    expect(result.recipientName).toBe("Анна");
  });

  it("rejects missing consent and invalid phone", () => {
    const result = checkoutSchema.safeParse({ ...validInput, phone: "123", consent: false });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors).toMatchObject({ phone: expect.any(Array), consent: expect.any(Array) });
  });
});

describe("create order request schema", () => {
  const productId = "9ab96f80-58b8-4c49-8c93-1a6d282d3016";

  it("accepts bounded cart lines and rejects client prices", () => {
    const valid = {
      ...validInput,
      items: [{ productId, quantity: 2 }],
      paymentMethod: "CASH_ON_DELIVERY",
      idempotencyKey: "99e7fe9f-44dc-4792-a146-27814902392d",
    };

    expect(createOrderRequestSchema.parse(valid).phone).toBe("+79271234567");
    expect(createOrderRequestSchema.safeParse({ ...valid, totalKopeks: 1 }).success).toBe(false);
  });

  it("rejects duplicate products and an excessive total quantity", () => {
    const result = createOrderRequestSchema.safeParse({
      ...validInput,
      items: [
        { productId, quantity: 20 },
        { productId, quantity: 20 },
        { productId: "532f7f9a-d932-4700-866b-d390a56b55f5", quantity: 20 },
      ],
      paymentMethod: "CARD_ON_DELIVERY",
      idempotencyKey: "99e7fe9f-44dc-4792-a146-27814902392d",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          "Каждый товар должен встречаться в корзине один раз",
          "В заказе может быть не более 50 товаров",
        ]),
      );
    }
  });
});
