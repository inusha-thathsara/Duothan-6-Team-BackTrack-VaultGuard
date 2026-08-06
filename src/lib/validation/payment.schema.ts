import { z } from "zod";

export const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Invalid source account ID"),
  toAccountId: z.string().min(1, "Invalid destination account ID").optional(),
  payeeId: z.string().min(1, "Invalid payee ID").optional(),
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1_000_000, "Amount exceeds maximum allowed"),
  currency: z.string().length(3).default("USD"),
  description: z.string().max(500).optional(),
  mfaVerified: z.boolean().optional(),
}).refine(
  (data) => data.toAccountId || data.payeeId,
  { message: "Either toAccountId or payeeId must be provided", path: ["toAccountId"] }
);

export const billPaySchema = z.object({
  fromAccountId: z.string().min(1, "Invalid source account ID"),
  billerId: z.string().min(1, "Invalid biller ID"),
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1_000_000, "Amount exceeds maximum allowed"),
  currency: z.string().length(3).default("USD"),
  description: z.string().max(500).optional(),
  mfaVerified: z.boolean().optional(),
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["TRANSFER", "BILL_PAY", "LOAN_REPAYMENT"]).optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "COMPENSATED"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().max(200).optional(),
  accountId: z.string().uuid().optional(),
});

export const createPayeeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  accountNumber: z.string().min(5, "Account number too short").max(30),
  bankCode: z.string().max(20).optional(),
  type: z.enum(["PERSON", "BILLER"]).default("PERSON"),
});

export type TransferInput = z.infer<typeof transferSchema>;
export type BillPayInput = z.infer<typeof billPaySchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type CreatePayeeInput = z.infer<typeof createPayeeSchema>;

