/**
 * Shared types used across all VaultGuard domain services.
 */

export type AuthContext = {
  userId: string;
  role: "CUSTOMER" | "SUPPORT_OPERATOR";
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
};

export type PaginatedResult<T = unknown> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
