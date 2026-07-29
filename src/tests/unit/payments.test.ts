import { describe, it, expect } from "vitest";
import { transferSchema, billPaySchema, historyQuerySchema } from "@/lib/validation/payment.schema";
import { repaymentSchema } from "@/lib/validation/loan.schema";

describe("Payment & Loan Validation Schemas (Member 3)", () => {
  it("should validate valid transfer input", () => {
    const validData = {
      fromAccountId: "123e4567-e89b-12d3-a456-426614174000",
      toAccountId: "123e4567-e89b-12d3-a456-426614174001",
      amount: 250.50,
      currency: "USD",
      description: "Rent payment",
    };

    const parsed = transferSchema.parse(validData);
    expect(parsed.amount).toBe(250.50);
    expect(parsed.fromAccountId).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("should reject transfer without destination account or payee", () => {
    const invalidData = {
      fromAccountId: "123e4567-e89b-12d3-a456-426614174000",
      amount: 100,
    };

    expect(() => transferSchema.parse(invalidData)).toThrow();
  });

  it("should reject negative or zero transfer amount", () => {
    const invalidData = {
      fromAccountId: "123e4567-e89b-12d3-a456-426614174000",
      toAccountId: "123e4567-e89b-12d3-a456-426614174001",
      amount: -50,
    };

    expect(() => transferSchema.parse(invalidData)).toThrow();
  });

  it("should validate bill payment schema", () => {
    const validBill = {
      fromAccountId: "123e4567-e89b-12d3-a456-426614174000",
      billerId: "123e4567-e89b-12d3-a456-426614174002",
      amount: 85.00,
    };

    const parsed = billPaySchema.parse(validBill);
    expect(parsed.billerId).toBe("123e4567-e89b-12d3-a456-426614174002");
  });

  it("should parse history query parameters with defaults", () => {
    const parsed = historyQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
  });

  it("should validate loan repayment schema", () => {
    const repayment = {
      loanId: "123e4567-e89b-12d3-a456-426614174003",
      amount: 500,
      fromAccountId: "123e4567-e89b-12d3-a456-426614174000",
    };

    const parsed = repaymentSchema.parse(repayment);
    expect(parsed.amount).toBe(500);
  });
});

