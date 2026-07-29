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
  isAuthenticated: boolean;
  activeRole: Role;
  switchRole: (role: Role) => void;
  login: (email: string, pass: string) => Promise<boolean>;
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
  repayLoan: (loanId: string, amount: number, fromAccountId: string) => boolean;
  
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
  // User Session
  const [user, setUser] = useState<UserProfile | null>({
    id: "usr_alex_2065",
    email: "alex.perera@vaultguard.bank",
    fullName: "Alex Perera",
    nationalId: "941820491V",
    role: "CUSTOMER",
    mfaEnabled: true,
    trustedDevice: true,
  });

  const [activeRole, setActiveRole] = useState<Role>("CUSTOMER");
  const [isPaymentsDegraded, setIsPaymentsDegraded] = useState<boolean>(false);

  // Accounts
  const [accounts, setAccounts] = useState<AccountItem[]>([
    {
      id: "acc_sav_4821",
      accountNumber: "**** 4821",
      type: "SAVINGS",
      balance: 428650.0,
      currency: "LKR",
      status: "ACTIVE",
      dailyLimit: 250000.0,
      singleLimit: 100000.0,
    },
    {
      id: "acc_chk_9102",
      accountNumber: "**** 9102",
      type: "CHECKING",
      balance: 125000.0,
      currency: "LKR",
      status: "ACTIVE",
      dailyLimit: 500000.0,
      singleLimit: 250000.0,
    },
    {
      id: "acc_fd_3341",
      accountNumber: "**** 3341",
      type: "FIXED_DEPOSIT",
      balance: 1500000.0,
      currency: "LKR",
      status: "ACTIVE",
      dailyLimit: 0,
      singleLimit: 0,
    },
  ]);

  // Payees
  const [payees, setPayees] = useState([
    { id: "pay_1", name: "Nimal Perera", accountNumber: "****7732", bankCode: "BOC-001", type: "PERSON" as const },
    { id: "pay_2", name: "CEB Electricity Board", accountNumber: "CEB-883921", bankCode: "CEB-BILL", type: "BILLER" as const },
    { id: "pay_3", name: "Dialog Axiata Telecom", accountNumber: "0771234567", bankCode: "DIALOG-BILL", type: "BILLER" as const },
    { id: "pay_4", name: "Kandy Supermarket Merchant", accountNumber: "****5510", bankCode: "COMM-042", type: "PERSON" as const },
  ]);

  // Transactions
  const [transactions, setTransactions] = useState<TransactionItem[]>([
    {
      id: "tx_1001",
      requestId: "REQ-2065-9981-01",
      date: "2026-07-29T10:14:00Z",
      type: "TRANSFER",
      description: "Transfer to Nimal Perera",
      payeeName: "Nimal Perera",
      accountNumber: "****7732",
      amount: 12500.0,
      fee: 50.0,
      status: "COMPLETED",
      sagaStatus: "COMPLETED",
      category: "Personal Transfer",
    },
    {
      id: "tx_1002",
      requestId: "REQ-2065-9981-02",
      date: "2026-07-28T16:30:00Z",
      type: "BILL_PAY",
      description: "CEB Electricity Bill Payment",
      payeeName: "CEB Electricity Board",
      accountNumber: "CEB-883921",
      amount: 4820.0,
      fee: 0,
      status: "COMPLETED",
      sagaStatus: "COMPLETED",
      category: "Utilities",
    },
    {
      id: "tx_1003",
      requestId: "REQ-2065-9981-03",
      date: "2026-07-27T09:00:00Z",
      type: "TRANSFER",
      description: "Emergency Salary Credit",
      payeeName: "Apex Cyber Tech PLC",
      accountNumber: "****0012",
      amount: 185000.0,
      fee: 0,
      status: "COMPLETED",
      sagaStatus: "COMPLETED",
      category: "Income",
    },
    {
      id: "tx_1004",
      requestId: "REQ-2065-9981-04",
      date: "2026-07-25T14:20:00Z",
      type: "LOAN_REPAYMENT",
      description: "Personal Loan Repayment LN-20941",
      payeeName: "VaultGuard Loan Service",
      accountNumber: "LN-20941",
      amount: 22000.0,
      fee: 0,
      status: "COMPLETED",
      sagaStatus: "COMPLETED",
      category: "Loan Repayment",
    },
    {
      id: "tx_1005",
      requestId: "REQ-2065-9981-05",
      date: "2026-07-24T11:05:00Z",
      type: "TRANSFER",
      description: "Transfer to Market Stall SME",
      payeeName: "Kandy Supermarket Merchant",
      accountNumber: "****5510",
      amount: 3200.0,
      fee: 25.0,
      status: "PENDING",
      sagaStatus: "DEBITED",
      category: "Merchant",
    },
  ]);

  // Loans
  const [loans, setLoans] = useState<LoanItem[]>([
    {
      id: "loan_20941",
      loanNumber: "LN-20941",
      title: "Post-Disaster Recovery Personal Loan",
      principalAmount: 500000.0,
      outstandingBalance: 312400.0,
      interestRate: 8.5,
      termMonths: 36,
      completedInstallments: 14,
      nextDueDate: "2026-08-01T00:00:00Z",
      nextPaymentAmount: 22000.0,
      status: "ACTIVE",
    },
  ]);

  const [repaymentSchedule, setRepaymentSchedule] = useState<RepaymentScheduleItem[]>([
    { id: "sch_1", dueDate: "2026-06-01", amount: 22000, status: "PAID", paidAt: "2026-06-01T08:12:00Z" },
    { id: "sch_2", dueDate: "2026-07-01", amount: 22000, status: "PAID", paidAt: "2026-07-01T09:30:00Z" },
    { id: "sch_3", dueDate: "2026-08-01", amount: 22000, status: "UPCOMING" },
    { id: "sch_4", dueDate: "2026-09-01", amount: 22000, status: "UPCOMING" },
    { id: "sch_5", dueDate: "2026-10-01", amount: 22000, status: "UPCOMING" },
  ]);

  // Trusted Devices
  const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceItem[]>([
    {
      id: "dev_1",
      deviceLabel: "Pixel 9 Pro (This Device)",
      userAgent: "Mozilla/5.0 (Linux; Android 15)",
      ipAddress: "192.168.1.104",
      location: "Colombo, LK",
      trustedAt: "2026-07-20T21:04:00Z",
      isCurrent: true,
      status: "ACTIVE",
    },
    {
      id: "dev_2",
      deviceLabel: "MacBook Pro M3",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      ipAddress: "112.134.18.90",
      location: "Colombo, LK",
      trustedAt: "2026-07-19T08:12:00Z",
      isCurrent: false,
      status: "ACTIVE",
    },
    {
      id: "dev_3",
      deviceLabel: "iPad Air 5th Gen",
      userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0)",
      ipAddress: "112.134.22.11",
      location: "Kandy, LK",
      trustedAt: "2026-07-10T14:22:00Z",
      isCurrent: false,
      status: "ACTIVE",
    },
  ]);

  // Security Events
  const [securityEvents, setSecurityEvents] = useState<SecurityEventItem[]>([
    {
      id: "sec_1",
      timestamp: "2026-07-29 10:14:02",
      action: "Successful TOTP MFA Step-Up Authentication",
      device: "Pixel 9 Pro",
      ip: "192.168.1.104",
      location: "Colombo, LK",
      status: "SUCCESS",
    },
    {
      id: "sec_2",
      timestamp: "2026-07-29 09:30:11",
      action: "Customer Session Authenticated via Identity Platform",
      device: "Pixel 9 Pro",
      ip: "192.168.1.104",
      location: "Colombo, LK",
      status: "SUCCESS",
    },
    {
      id: "sec_3",
      timestamp: "2026-07-28 16:30:00",
      action: "Idempotent Payment Commitment (REQ-2065-9981-02)",
      device: "Pixel 9 Pro",
      ip: "192.168.1.104",
      location: "Colombo, LK",
      status: "SUCCESS",
    },
    {
      id: "sec_4",
      timestamp: "2026-07-25 11:20:00",
      action: "New Device Registered & Hardware Passkey Bound",
      device: "MacBook Pro M3",
      ip: "112.134.18.90",
      location: "Colombo, LK",
      status: "SUCCESS",
    },
    {
      id: "sec_5",
      timestamp: "2026-07-18 22:41:00",
      action: "Post-Malware Re-Enrollment Ceremony Completed",
      device: "System",
      ip: "10.0.0.1 (VPC Internal)",
      location: "VaultGuard Cloud KMS",
      status: "SUCCESS",
    },
  ]);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
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

  const login = async (email: string, pass: string): Promise<boolean> => {
    if (email && pass) {
      setUser({
        id: "usr_alex_2065",
        email,
        fullName: "Alex Perera",
        nationalId: "941820491V",
        role: activeRole,
        mfaEnabled: true,
        trustedDevice: true,
      });
      addToast({
        type: "success",
        title: "Session Authenticated",
        message: "Zero-Trust token issued by VaultGuard Auth Service.",
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    addToast({
      type: "info",
      title: "Logged Out",
      message: "Session token invalidated and cleared from trusted device memory.",
    });
  };

  const addTransaction = (tx: Omit<TransactionItem, "id" | "date" | "sagaStatus">): TransactionItem => {
    const newTx: TransactionItem = {
      ...tx,
      id: `tx_${Date.now()}`,
      date: new Date().toISOString(),
      sagaStatus: "COMPLETED",
    };

    // Deduct from primary savings account
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === "acc_sav_4821") {
          return {
            ...acc,
            balance: Math.max(0, acc.balance - (tx.amount + tx.fee)),
          };
        }
        return acc;
      })
    );

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

  const repayLoan = (loanId: string, amount: number, fromAccountId: string): boolean => {
    if (isPaymentsDegraded) {
      addToast({
        type: "error",
        title: "Action Blocked by Circuit Breaker",
        message: "Payments Service is currently degraded. Money movement is suspended (FR-08).",
      });
      return false;
    }

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
        if (!updated && sch.status === "UPCOMING") {
          updated = true;
          return { ...sch, status: "PAID" as const, paidAt: new Date().toISOString() };
        }
        return sch;
      });
    });

    // Record transaction
    const reqId = `REQ-REPAY-${Math.floor(100000 + Math.random() * 900000)}`;
    addTransaction({
      requestId: reqId,
      type: "LOAN_REPAYMENT",
      description: "Loan Installment Repayment LN-20941",
      payeeName: "VaultGuard Loan Service",
      accountNumber: "LN-20941",
      amount,
      fee: 0,
      status: "COMPLETED",
      category: "Loan Repayment",
    });

    addToast({
      type: "success",
      title: "Loan Repayment Successful",
      message: `LKR ${amount.toLocaleString()} processed for LN-20941 with Request ID ${reqId}.`,
    });

    return true;
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

  const primaryAccount = accounts.find((a) => a.id === "acc_sav_4821");

  return (
    <VaultGuardContext.Provider
      value={{
        user,
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

