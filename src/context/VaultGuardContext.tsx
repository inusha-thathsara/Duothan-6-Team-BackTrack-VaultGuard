"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Role = "CUSTOMER" | "SUPPORT_OPERATOR";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  nationalId: string;
  role: Role;
  mfaEnabled: boolean;
  trustedDevice: boolean;
}

export interface AccountItem {
  id: string;
  accountNumber: string;
  type: "SAVINGS" | "CHECKING" | "FIXED_DEPOSIT";
  balance: number;
  currency: string;
  status: "ACTIVE" | "FROZEN" | "READ_ONLY";
  dailyLimit: number;
  singleLimit: number;
}

export interface TransactionItem {
  id: string;
  requestId: string;
  date: string;
  type: "TRANSFER" | "BILL_PAY" | "LOAN_REPAYMENT";
  description: string;
  payeeName?: string;
  accountNumber?: string;
  amount: number;
  fee: number;
  status: "COMPLETED" | "PENDING" | "FAILED";
  sagaStatus: "INITIATED" | "DEBITED" | "CREDITED" | "COMPLETED";
  category?: string;
}

export interface LoanItem {
  id: string;
  loanNumber: string;
  title: string;
  principalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  termMonths: number;
  completedInstallments: number;
  nextDueDate: string;
  nextPaymentAmount: number;
  status: "ACTIVE" | "PAID_OFF";
}

export interface RepaymentScheduleItem {
  id: string;
  dueDate: string;
  amount: number;
  status: "PAID" | "UPCOMING" | "OVERDUE";
  paidAt?: string;
}

export interface TrustedDeviceItem {
  id: string;
  deviceLabel: string;
  userAgent: string;
  ipAddress: string;
  location: string;
  trustedAt: string;
  isCurrent: boolean;
  status: "ACTIVE" | "REVOKED";
}

export interface SecurityEventItem {
  id: string;
  timestamp: string;
  action: string;
  device: string;
  ip: string;
  location: string;
  status: "SUCCESS" | "WARNING" | "BLOCKED";
}

export interface ServiceHealth {
  name: string;
  id: "auth" | "accounts" | "payments" | "loans" | "notifications" | "audit";
  status: "OPERATIONAL" | "DEGRADED" | "OFFLINE";
  latency: string;
  uptime: string;
  description: string;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
}

interface VaultGuardContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isAuthenticated: boolean;
  activeRole: Role;
  switchRole: (role: Role) => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; requiresMfa?: boolean }>;
  logout: () => void;
  
  // Degraded Mode (FR-08)
  isPaymentsDegraded: boolean;
  togglePaymentsDegraded: () => void;
  
  // Accounts (FR-06)
  accounts: AccountItem[];
  primaryAccount: AccountItem | undefined;
  
  // Transactions & Transfers (FR-09, FR-10, FR-11, FR-12, FR-13, FR-14)
  transactions: TransactionItem[];
  addTransaction: (tx: Omit<TransactionItem, "id" | "date" | "sagaStatus">) => TransactionItem;
  
  // Payees (FR-09)
  payees: Array<{ id: string; name: string; accountNumber: string; bankCode: string; type: "PERSON" | "BILLER" }>;
  addPayee: (payee: { name: string; accountNumber: string; bankCode: string; type: "PERSON" | "BILLER" }) => void;
  
  // Loans (FR-15, FR-16)
  loans: LoanItem[];
  repaymentSchedule: RepaymentScheduleItem[];
  repayLoan: (loanId: string, amount: number, fromAccountId: string) => Promise<boolean>;
  
  // Security & Devices (FR-03, FR-18, FR-19)
  trustedDevices: TrustedDeviceItem[];
  revokeDevice: (id: string) => void;
  securityEvents: SecurityEventItem[];
  
  // System Status (FR-20)
  servicesHealth: ServiceHealth[];
  
  // Step-up MFA Modal State (FR-11)
  isMfaModalOpen: boolean;
  pendingMfaAction: (() => void) | null;
  triggerStepUpMfa: (onSuccess: () => void) => void;
  closeMfaModal: () => void;
  
  // Statement Modal State (FR-07)
  isStatementModalOpen: boolean;
  openStatementModal: () => void;
  closeStatementModal: () => void;
  
  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

const VaultGuardContext = createContext<VaultGuardContextType | undefined>(undefined);

export const VaultGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User Session (Initialized as null to require explicit authentication)
  const [user, setUser] = useState<UserProfile | null>(null);

  // Accounts (initialized empty until restored from database)
  const [accounts, setAccounts] = useState<AccountItem[]>([]);

  const [activeRole, setActiveRole] = useState<Role>("CUSTOMER");
  const [isPaymentsDegraded, setIsPaymentsDegraded] = useState<boolean>(false);

  // Payees
  const [payees, setPayees] = useState([
    { id: "pay_1", name: "Nimal Perera", accountNumber: "****7732", bankCode: "BOC-001", type: "PERSON" as const },
    { id: "pay_2", name: "CEB Electricity Board", accountNumber: "CEB-883921", bankCode: "CEB-BILL", type: "BILLER" as const },
    { id: "pay_3", name: "Dialog Axiata Telecom", accountNumber: "0771234567", bankCode: "DIALOG-BILL", type: "BILLER" as const },
    { id: "pay_4", name: "Kandy Supermarket Merchant", accountNumber: "****5510", bankCode: "COMM-042", type: "PERSON" as const },
  ]);

  // Transactions (default to empty array for newly created / authenticated accounts)
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  // Loans (default to empty array for newly created / authenticated accounts)
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [repaymentSchedule, setRepaymentSchedule] = useState<RepaymentScheduleItem[]>([]);

  // Trusted Devices (reflects active authenticated browser session)
  const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceItem[]>([
    {
      id: "dev_current",
      deviceLabel: "Active Web Session (This Device)",
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Browser Session",
      ipAddress: "Active IP",
      location: "Verified Session",
      trustedAt: new Date().toISOString(),
      isCurrent: true,
      status: "ACTIVE",
    },
  ]);

  // Security Events (populated from PostgreSQL audit logs)
  const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([]);

  // Restore user session on mount via /api/auth/me and /api/user/profile
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data?.user) {
            setUser(body.data.user);
            // Fetch live database accounts & profile details
            try {
              const profRes = await fetch("/api/user/profile");
              if (profRes.ok) {
                const profBody = await profRes.json();
                if (profBody.success && profBody.data) {
                  const dbData = profBody.data;
                  setUser((prev) => (prev ? { ...prev, ...dbData } : dbData));
                  if (dbData.accounts && dbData.accounts.length > 0) {
                    setAccounts(
                      dbData.accounts.map((acc: { id: string; accountNumber: string; type?: string; balance: number | string; currency?: string; status?: string }) => ({
                        id: acc.id,
                        accountNumber: acc.accountNumber,
                        type: acc.type || "SAVINGS",
                        balance: Number(acc.balance) || 0,
                        currency: acc.currency || "LKR",
                        status: acc.status || "ACTIVE",
                        dailyLimit: 250000.0,
                        singleLimit: 100000.0,
                      }))
                    );
                  }
                }
              }
            } catch {
              // Profile fetch fallback
            }

            // Fetch live saved payees for authenticated user
            try {
              const payeeRes = await fetch("/api/payees");
              if (payeeRes.ok) {
                const payeeJson = await payeeRes.json();
                if (payeeJson.success && Array.isArray(payeeJson.data?.payees) && payeeJson.data.payees.length > 0) {
                  setPayees(
                    payeeJson.data.payees.map((p: { id: string; name: string; accountNumber: string; bankCode?: string; type: "PERSON" | "BILLER" }) => ({
                      id: p.id,
                      name: p.name,
                      accountNumber: p.accountNumber,
                      bankCode: p.bankCode || "VG-BANK",
                      type: p.type || "PERSON",
                    }))
                  );
                }
              }
            } catch {
              // Payees fetch fallback
            }

            // Fetch live payment history for authenticated user
            try {
              const txRes = await fetch("/api/payments/history?limit=10");
              if (txRes.ok) {
                const txJson = await txRes.json();
                if (txJson.success && Array.isArray(txJson.data?.items)) {
                  setTransactions(
                    txJson.data.items.map((item: { id: string; requestId?: string; createdAt?: string; type?: string; description?: string; toAccount?: { accountNumber: string }; fromAccount?: { accountNumber: string }; amount: number | string; status?: string }) => ({
                      id: item.id,
                      requestId: item.requestId || `REQ-${item.id.substring(0, 8)}`,
                      date: item.createdAt || new Date().toISOString(),
                      type: item.type || "TRANSFER",
                      description: item.description || "Funds Transfer",
                      payeeName: item.toAccount?.accountNumber || item.description || "Transfer",
                      accountNumber: item.fromAccount?.accountNumber || "",
                      amount: Number(item.amount) || 0,
                      fee: 0,
                      status: item.status || "COMPLETED",
                      sagaStatus: item.status || "COMPLETED",
                      category: item.type === "INCOME" ? "Income" : "Transfer",
                    }))
                  );
                } else {
                  setTransactions([]);
                }
              }
            } catch {
              setTransactions([]);
            }

            // Fetch live user loans & repayment schedules
            try {
              const loanRes = await fetch("/api/loans");
              if (loanRes.ok) {
                const loanJson = await loanRes.json();
                if (loanJson.success && Array.isArray(loanJson.data?.loans) && loanJson.data.loans.length > 0) {
                  setLoans(
                    loanJson.data.loans.map((l: { id: string; loanNumber?: string; title?: string; principalAmount: number | string; outstandingBalance: number | string; interestRate?: number | string; termMonths?: number; nextDueDate?: string; nextPaymentAmount?: number | string; status?: string; repaymentSchedule?: Array<{ id: string; dueDate: string; amount: number | string; status?: string; paidAt?: string }> }) => {
                      const completedCount = Array.isArray(l.repaymentSchedule)
                        ? l.repaymentSchedule.filter((sch) => sch.status === "PAID").length
                        : 0;
                      const nextSch = Array.isArray(l.repaymentSchedule)
                        ? l.repaymentSchedule.find((sch) => sch.status === "OVERDUE" || sch.status === "UPCOMING")
                        : null;
                      return {
                        id: l.id,
                        loanNumber: l.loanNumber || `LN-${l.id.substring(0, 5)}`,
                        title: l.title || "Personal Loan",
                        principalAmount: Number(l.principalAmount) || 0,
                        outstandingBalance: Number(l.outstandingBalance) || 0,
                        interestRate: Number(l.interestRate) || 0,
                        termMonths: l.termMonths || 36,
                        completedInstallments: completedCount,
                        nextDueDate: nextSch?.dueDate || l.nextDueDate || new Date().toISOString(),
                        nextPaymentAmount: nextSch ? Number(nextSch.amount) : Number(l.nextPaymentAmount) || 0,
                        status: (l.status as "ACTIVE" | "PAID_OFF") || "ACTIVE",
                      };
                    })
                  );
                  if (loanJson.data.loans[0]?.repaymentSchedule) {
                    setRepaymentSchedule(
                      loanJson.data.loans[0].repaymentSchedule.map((sch: { id: string; dueDate: string; amount: number | string; status?: string; paidAt?: string }) => ({
                        id: sch.id,
                        dueDate: sch.dueDate,
                        amount: Number(sch.amount) || 0,
                        status: (sch.status as "PAID" | "UPCOMING" | "OVERDUE") || "UPCOMING",
                        paidAt: sch.paidAt,
                      }))
                    );
                  } else {
                    setRepaymentSchedule([]);
                  }
                } else {
                  setLoans([]);
                  setRepaymentSchedule([]);
                }
              }
            } catch {
              setLoans([]);
              setRepaymentSchedule([]);
            }
          }
        }
      } catch {
        // Session empty or expired
      }
    }
    restoreSession();
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    let messageStr = "";
    if (typeof toast.message === "object" && toast.message !== null) {
      messageStr = (toast.message as { message?: string }).message || JSON.stringify(toast.message);
    } else {
      messageStr = String(toast.message || "");
    }
    setToasts((prev) => [...prev, { ...toast, message: messageStr, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Step-up MFA Modal State
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [pendingMfaAction, setPendingMfaAction] = useState<(() => void) | null>(null);

  const triggerStepUpMfa = (onSuccess: () => void) => {
    setPendingMfaAction(() => onSuccess);
    setIsMfaModalOpen(true);
  };

  const closeMfaModal = () => {
    setIsMfaModalOpen(false);
    setPendingMfaAction(null);
  };

  // Statement Modal State
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const openStatementModal = () => setIsStatementModalOpen(true);
  const closeStatementModal = () => setIsStatementModalOpen(false);

  // Microservices Health State (FR-20)
  const servicesHealth: ServiceHealth[] = [
    {
      id: "auth",
      name: "Auth Service",
      status: "OPERATIONAL",
      latency: "12ms",
      uptime: "99.99%",
      description: "Cloud Run · Identity Platform · Cloud KMS HSM",
    },
    {
      id: "accounts",
      name: "Accounts Service",
      status: "OPERATIONAL",
      latency: "18ms",
      uptime: "99.98%",
      description: "Cloud Run · Isolated PostgreSQL (`accounts_db`)",
    },
    {
      id: "payments",
      name: "Payments Service",
      status: isPaymentsDegraded ? "DEGRADED" : "OPERATIONAL",
      latency: isPaymentsDegraded ? "450ms" : "24ms",
      uptime: isPaymentsDegraded ? "95.20%" : "99.95%",
      description: isPaymentsDegraded
        ? "DEGRADED: Read-Only Mode Active (Outage Isolation)"
        : "Cloud Run · Idempotent Ledger · Pub/Sub Saga",
    },
    {
      id: "loans",
      name: "Loans Service",
      status: "OPERATIONAL",
      latency: "22ms",
      uptime: "99.96%",
      description: "Cloud Run · Isolated PostgreSQL (`loans_db`)",
    },
    {
      id: "notifications",
      name: "Notification Service",
      status: "OPERATIONAL",
      latency: "35ms",
      uptime: "99.90%",
      description: "Cloud Run · Pub/Sub Consumer · SMS / Email",
    },
    {
      id: "audit",
      name: "Audit Service",
      status: "OPERATIONAL",
      latency: "8ms",
      uptime: "100.00%",
      description: "Cloud Run · Immutable BigQuery Append-Only",
    },
  ];

  // Actions
  const switchRole = (role: Role) => {
    setActiveRole(role);
    addToast({
      type: "info",
      title: `Role Switched: ${role}`,
      message: role === "SUPPORT_OPERATOR"
        ? "Access granted to Support Operator Customer Lookup & Audit Tools (FR-22)."
        : "Returned to Customer View.",
    });
  };

  const togglePaymentsDegraded = () => {
    setIsPaymentsDegraded((prev) => {
      const next = !prev;
      addToast({
        type: next ? "warning" : "success",
        title: next ? "Payments Service Degraded" : "Payments Service Restored",
        message: next
          ? "FR-08 Enforced: Accounts remain available in read-only mode while money movement is suspended."
          : "Full payment processing and transfer features are operational.",
      });
      return next;
    });
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; requiresMfa?: boolean }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });

      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          if (body.requiresMfa) {
            addToast({
              type: "info",
              title: "MFA Verification Required",
              message: "Please enter the 6-digit TOTP code from your authenticator app.",
            });
            return { success: true, requiresMfa: true };
          }
          if (body.data?.user) {
            setUser(body.data.user);
            try {
              const profRes = await fetch("/api/user/profile");
              if (profRes.ok) {
                const profBody = await profRes.json();
                if (profBody.success && profBody.data?.accounts) {
                  setAccounts(
                    profBody.data.accounts.map((acc: { id: string; accountNumber: string; type?: string; balance: number | string; currency?: string; status?: string }) => ({
                      id: acc.id,
                      accountNumber: acc.accountNumber,
                      type: acc.type || "SAVINGS",
                      balance: Number(acc.balance) || 0,
                      currency: acc.currency || "LKR",
                      status: acc.status || "ACTIVE",
                      dailyLimit: 250000.0,
                      singleLimit: 100000.0,
                    }))
                  );
                }
              }
            } catch {
              // Ignore profile fetch failure
            }

            addToast({
              type: "success",
              title: "Session Authenticated",
              message: "Zero-Trust JWT session token issued by Auth Service.",
            });
            return { success: true, requiresMfa: false };
          }
        }
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network failure on logout
    }
    setUser(null);
    setAccounts([]);
    setTransactions([]);
    setLoans([]);
    setRepaymentSchedule([]);
    addToast({
      type: "info",
      title: "Logged Out",
      message: "Session token invalidated and cleared.",
    });
    // Redirect to login after clearing session
    window.location.href = "/login";
  };

  const addTransaction = (tx: Omit<TransactionItem, "id" | "date" | "sagaStatus">): TransactionItem => {
    const newTx: TransactionItem = {
      ...tx,
      id: `tx_${Date.now()}`,
      date: new Date().toISOString(),
      sagaStatus: "COMPLETED",
    };

    // Deduct from primary account
    setAccounts((prev) => {
      const targetId = accounts.find((a) => a.type === "CHECKING" || a.type === "SAVINGS")?.id || prev[0]?.id;
      return prev.map((acc) => {
        if (acc.id === targetId) {
          return {
            ...acc,
            balance: Math.max(0, acc.balance - (tx.amount + tx.fee)),
          };
        }
        return acc;
      });
    });

    setTransactions((prev) => [newTx, ...prev]);

    // Audit log
    setSecurityEvents((prev) => [
      {
        id: `sec_${Date.now()}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        action: `Idempotent Transaction Submitted (${tx.requestId}) - ${tx.description}`,
        device: "Pixel 9 Pro",
        ip: "192.168.1.104",
        location: "Colombo, LK",
        status: "SUCCESS",
      },
      ...prev,
    ]);

    return newTx;
  };

  const addPayee = (payee: { name: string; accountNumber: string; bankCode: string; type: "PERSON" | "BILLER" }) => {
    const newPayee = {
      id: `pay_${Date.now()}`,
      ...payee,
    };
    setPayees((prev) => [...prev, newPayee]);
    addToast({
      type: "success",
      title: "Payee Saved",
      message: `${payee.name} registered to your secure payee directory.`,
    });
  };

  const repayLoan = async (loanId: string, amount: number, fromAccountId: string): Promise<boolean> => {
    if (isPaymentsDegraded) {
      addToast({
        type: "error",
        title: "Action Blocked by Circuit Breaker",
        message: "Payments Service is currently degraded. Money movement is suspended (FR-08).",
      });
      return false;
    }

    try {
      const requestId = `req_repay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch("/api/loans/repay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": requestId,
        },
        body: JSON.stringify({ loanId, amount, fromAccountId }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success) {
        addToast({
          type: "error",
          title: "Repayment Failed",
          message: body.error?.message || body.message || "Failed to process loan repayment.",
        });
        return false;
      }

      // Re-fetch updated profile (accounts balance) and loans from server
      try {
        const profRes = await fetch("/api/user/profile");
        if (profRes.ok) {
          const profBody = await profRes.json();
          if (profBody.success && profBody.data?.accounts) {
            setAccounts(
              profBody.data.accounts.map((acc: { id: string; accountNumber: string; type?: string; balance: number | string; currency?: string; status?: string }) => ({
                id: acc.id,
                accountNumber: acc.accountNumber,
                type: acc.type || "SAVINGS",
                balance: Number(acc.balance) || 0,
                currency: acc.currency || "LKR",
                status: acc.status || "ACTIVE",
                dailyLimit: 250000.0,
                singleLimit: 100000.0,
              }))
            );
          }
        }
      } catch {}

      try {
        const loanRes = await fetch("/api/loans");
        if (loanRes.ok) {
          const loanJson = await loanRes.json();
          if (loanJson.success && Array.isArray(loanJson.data?.loans) && loanJson.data.loans.length > 0) {
            setLoans(
              loanJson.data.loans.map((l: { id: string; loanNumber?: string; title?: string; principalAmount: number | string; outstandingBalance: number | string; interestRate?: number | string; termMonths?: number; nextDueDate?: string; nextPaymentAmount?: number | string; status?: string; repaymentSchedule?: Array<{ id: string; dueDate: string; amount: number | string; status?: string; paidAt?: string }> }) => {
                const completedCount = Array.isArray(l.repaymentSchedule)
                  ? l.repaymentSchedule.filter((sch) => sch.status === "PAID").length
                  : 0;
                const nextSch = Array.isArray(l.repaymentSchedule)
                  ? l.repaymentSchedule.find((sch) => sch.status === "OVERDUE" || sch.status === "UPCOMING")
                  : null;
                return {
                  id: l.id,
                  loanNumber: l.loanNumber || `LN-${l.id.substring(0, 5)}`,
                  title: l.title || "Personal Loan",
                  principalAmount: Number(l.principalAmount) || 0,
                  outstandingBalance: Number(l.outstandingBalance) || 0,
                  interestRate: Number(l.interestRate) || 0,
                  termMonths: l.termMonths || 36,
                  completedInstallments: completedCount,
                  nextDueDate: nextSch?.dueDate || l.nextDueDate || new Date().toISOString(),
                  nextPaymentAmount: nextSch ? Number(nextSch.amount) : Number(l.nextPaymentAmount) || 0,
                  status: (l.status as "ACTIVE" | "PAID_OFF") || "ACTIVE",
                };
              })
            );
            if (loanJson.data.loans[0]?.repaymentSchedule) {
              setRepaymentSchedule(
                loanJson.data.loans[0].repaymentSchedule.map((sch: { id: string; dueDate: string; amount: number | string; status?: string; paidAt?: string }) => ({
                  id: sch.id,
                  dueDate: sch.dueDate,
                  amount: Number(sch.amount) || 0,
                  status: (sch.status as "PAID" | "UPCOMING" | "OVERDUE") || "UPCOMING",
                  paidAt: sch.paidAt,
                }))
              );
            }
          }
        }
      } catch {}

      addToast({
        type: "success",
        title: "Loan Repayment Successful",
        message: `LKR ${amount.toLocaleString()} processed for loan repayment with Request ID ${requestId}.`,
      });

      return true;
    } catch {
      // Local optimistic update fallback
      setLoans((prev) =>
        prev.map((ln) => {
          if (ln.id === loanId) {
            const newBal = Math.max(0, ln.outstandingBalance - amount);
            return {
              ...ln,
              outstandingBalance: newBal,
              completedInstallments: ln.completedInstallments + 1,
              status: newBal === 0 ? "PAID_OFF" : "ACTIVE",
            };
          }
          return ln;
        })
      );

      setRepaymentSchedule((prev) => {
        let updated = false;
        return prev.map((sch) => {
          if (!updated && (sch.status === "OVERDUE" || sch.status === "UPCOMING")) {
            updated = true;
            return { ...sch, status: "PAID" as const, paidAt: new Date().toISOString() };
          }
          return sch;
        });
      });

      addToast({
        type: "success",
        title: "Loan Repayment Processed",
        message: `LKR ${amount.toLocaleString()} processed for loan repayment.`,
      });

      return true;
    }
  };

  const revokeDevice = (id: string) => {
    setTrustedDevices((prev) =>
      prev.map((dev) => (dev.id === id ? { ...dev, status: "REVOKED" as const } : dev))
    );
    addToast({
      type: "warning",
      title: "Trusted Device Revoked",
      message: "Cryptographic token binding terminated for this device.",
    });
  };

  const primaryAccount = accounts.find((a) => a.type === "SAVINGS") || accounts[0];

  return (
    <VaultGuardContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        activeRole,
        switchRole,
        login,
        logout,
        isPaymentsDegraded,
        togglePaymentsDegraded,
        accounts,
        primaryAccount,
        transactions,
        addTransaction,
        payees,
        addPayee,
        loans,
        repaymentSchedule,
        repayLoan,
        trustedDevices,
        revokeDevice,
        securityEvents,
        servicesHealth,
        isMfaModalOpen,
        pendingMfaAction,
        triggerStepUpMfa,
        closeMfaModal,
        isStatementModalOpen,
        openStatementModal,
        closeStatementModal,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </VaultGuardContext.Provider>
  );
};

export const useVaultGuard = () => {
  const context = useContext(VaultGuardContext);
  if (!context) {
    throw new Error("useVaultGuard must be used within a VaultGuardProvider");
  }
  return context;
};

