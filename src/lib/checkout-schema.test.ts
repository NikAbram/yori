import { describe, expect, it } from "vitest";
import { checkoutSchema, normalizeRussianPhone } from "./checkout-schema";

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
