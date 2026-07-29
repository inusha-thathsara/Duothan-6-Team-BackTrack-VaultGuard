import { z } from "zod";

export const loanQuerySchema = z.object({
  status: z.enum(["ACTIVE", "PAID_OFF", "DEFAULTED"]).optional(),
});

export const repaymentSchema = z.object({
  loanId: z.string().uuid("Invalid loan ID"),
  amount: z.number().positive("Repayment amount must be positive"),
  fromAccountId: z.string().uuid("Invalid source account ID"),
});

export type LoanQuery = z.infer<typeof loanQuerySchema>;
export type RepaymentInput = z.infer<typeof repaymentSchema>;

