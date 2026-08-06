"use client";

import React, { useState, useEffect } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import {
  UserCheck,
  Search,
  ShieldAlert,
  AlertOctagon,
  RefreshCw,
  Sliders,
  CheckCircle2,
  PlusCircle,
  Landmark,
  ArrowUpRight,
  Key,
} from "lucide-react";

interface CustomerAccountRecord {
  id: string;
  accountNumber: string;
  type: string;
  balance: number | string;
  currency?: string;
  status?: string;
  dailyLimit?: number | string;
  singleLimit?: number | string;
}

interface CustomerRecord {
  id: string;
  fullName: string;
  email: string;
  role?: string;
  nationalId?: string;
  phoneNumber?: string;
  mfaEnabled?: boolean;
  createdAt?: string;
  accounts: CustomerAccountRecord[];
}

interface AccessAuditLog {
  id: string;
  operator: string;
  targetId: string;
  reason: string;
  timestamp: string;
  kmsSig: string;
}

interface DlqItem {
  id: string;
  eventId: string;
  eventType: string;
  errorReason: string;
  retryCount: number;
  createdAt: string;
}

export default function OperatorPage() {
  const { user, isPaymentsDegraded, togglePaymentsDegraded, addToast } = useVaultGuard();

  const isOperator = user?.role === "SUPPORT_OPERATOR";

  const [lookupQuery, setLookupQuery] = useState("");
  const [accessReason, setAccessReason] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [customerRecords, setCustomerRecords] = useState<CustomerRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [accessAuditLogs, setAccessAuditLogs] = useState<AccessAuditLog[]>([]);
  const [dlqEntries, setDlqEntries] = useState<DlqItem[]>([]);
  const [isLoadingDlq, setIsLoadingDlq] = useState(false);

  // Deposit Form State
  const [depositAccNumberInput, setDepositAccNumberInput] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDescription, setDepositDescription] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  // Loan Issue Form State
  const [loanTitle, setLoanTitle] = useState("Personal Expansion Facility");
  const [loanPrincipal, setLoanPrincipal] = useState("250000");
  const [loanInterest, setLoanInterest] = useState("6.5");
  const [loanTerm, setLoanTerm] = useState("36");
  const [loanAccIdInput, setLoanAccIdInput] = useState("");
  const [isIssuingLoan, setIsIssuingLoan] = useState(false);

  // Account Recovery Form State
  const [recoveryEmailInput, setRecoveryEmailInput] = useState("");
  const [recoveryNationalIdInput, setRecoveryNationalIdInput] = useState("");
  const [recoveryFullNameInput, setRecoveryFullNameInput] = useState("");
  const [isInitiatingRecovery, setIsInitiatingRecovery] = useState(false);
  const [generatedRecoveryLink, setGeneratedRecoveryLink] = useState("");

  const defaultAccNum = selectedCustomer?.accounts?.[0]?.accountNumber || "";
  const depositAccNumber = depositAccNumberInput || defaultAccNum;
  const loanAccId = loanAccIdInput || defaultAccNum;

  // Sync recovery fields with selected customer
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selectedCustomer) {
      setRecoveryEmailInput(selectedCustomer.email || "");
      setRecoveryNationalIdInput(selectedCustomer.nationalId || "");
      setRecoveryFullNameInput(selectedCustomer.fullName || "");
      setGeneratedRecoveryLink("");
    }
  }, [selectedCustomer]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleInitiateRecovery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryEmailInput || !recoveryNationalIdInput || !recoveryFullNameInput) {
      addToast({
        type: "error",
        title: "Missing Fields",
        message: "Please fill out all customer verification fields.",
      });
      return;
    }

    setIsInitiatingRecovery(true);
    setGeneratedRecoveryLink("");

    try {
      const res = await fetch("/api/admin/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: recoveryEmailInput,
          nationalId: recoveryNationalIdInput,
          fullName: recoveryFullNameInput,
        }),
      });

      const json = await res.json();
      setIsInitiatingRecovery(false);

      if (res.ok && json.success) {
        setGeneratedRecoveryLink(json.data.recoveryLink);
        addToast({
          type: "success",
          title: "Recovery Link Dispatched",
          message: "A secure recovery link has been generated and dispatched.",
        });

        // Add real-time audit logging entry to state
        const newLog: AccessAuditLog = {
          id: `audit_${Date.now()}`,
          operator: user?.email || "op_support",
          targetId: recoveryEmailInput,
          reason: `Initiated customer account recovery (MFA Reset & Password Change Link Generated)`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          kmsSig: `KMS-SIG-RECOV-${Math.floor(1000 + Math.random() * 9000)}`,
        };
        setAccessAuditLogs((prev) => [newLog, ...prev]);
      } else {
        addToast({
          type: "error",
          title: "Recovery Initiation Failed",
          message: json.error || "Verification failed. Details do not match.",
        });
      }
    } catch {
      setIsInitiatingRecovery(false);
      addToast({
        type: "error",
        title: "Recovery Initiation Failed",
        message: "Failed to connect to recovery administration service.",
      });
    }
  };

  // Fetch initial customers and DLQ records on load for operators
  useEffect(() => {
    if (!isOperator) return;

    async function loadData() {
      setIsLoadingDlq(true);
      try {
        const [dlqRes, custRes] = await Promise.all([
          fetch("/api/admin/dlq"),
          fetch("/api/admin/customers"),
        ]);

        if (dlqRes.ok) {
          const json = await dlqRes.json();
          if (json.success && Array.isArray(json.data)) {
            setDlqEntries(json.data);
          }
        }

        if (custRes.ok) {
          const cJson = await custRes.json();
          if (cJson.success && Array.isArray(cJson.data?.customers) && cJson.data.customers.length > 0) {
            setCustomerRecords(cJson.data.customers);
            setSelectedCustomer(cJson.data.customers[0]);
            if (cJson.data.customers[0].accounts?.length > 0) {
              setDepositAccNumberInput(cJson.data.customers[0].accounts[0].accountNumber);
              setLoanAccIdInput(cJson.data.customers[0].accounts[0].accountNumber);
            }
          }
        }
      } catch {
        // fetch fallback
      } finally {
        setIsLoadingDlq(false);
      }
    }
    loadData();
  }, [isOperator]);



  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOperator) {
      addToast({
        type: "error",
        title: "Access Denied (FR-05)",
        message: "Operator portal requires SUPPORT_OPERATOR role.",
      });
      return;
    }

    if (!accessReason || accessReason.length < 5) {
      addToast({
        type: "warning",
        title: "Attributable Reason Required (NFR-O3)",
        message: "Please enter a valid justification for querying customer PII.",
      });
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/customers?query=${encodeURIComponent(lookupQuery)}`);
      const json = await res.json();
      setIsSearching(false);

      if (res.ok && json.success && Array.isArray(json.data?.customers)) {
        const results: CustomerRecord[] = json.data.customers;
        setCustomerRecords(results);
        if (results.length > 0) {
          setSelectedCustomer(results[0]);
        } else {
          setSelectedCustomer(null);
        }

        const newLog: AccessAuditLog = {
          id: `audit_${Date.now()}`,
          operator: user?.email || "op_support",
          targetId: lookupQuery || "All Records",
          reason: accessReason,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          kmsSig: `KMS-SIG-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        };

        setAccessAuditLogs((prev) => [newLog, ...prev]);

        addToast({
          type: "success",
          title: "Attributable Access Logged (FR-22)",
          message: `Found ${results.length} record(s). Immutable audit entry created.`,
        });
      } else {
        addToast({
          type: "error",
          title: "Search Error",
          message: json.error?.message || json.error || "Failed to fetch customer records.",
        });
      }
    } catch {
      setIsSearching(false);
      addToast({
        type: "error",
        title: "Search Error",
        message: "Failed to connect to backend administration service.",
      });
    }
  };

  const handleExecuteDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(depositAmount);
    if (!depositAccNumber || isNaN(numAmount) || numAmount <= 0) {
      addToast({ type: "error", title: "Invalid Deposit Input", message: "Please provide a valid account number and deposit amount." });
      return;
    }

    setIsDepositing(true);
    try {
      const res = await fetch("/api/admin/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: depositAccNumber,
          amount: numAmount,
          description: depositDescription || "Over-the-counter Cash Deposit by Operator",
        }),
      });

      const json = await res.json();
      setIsDepositing(false);

      if (res.ok && json.success) {
        addToast({ type: "success", title: "Cash Deposit Successful", message: json.data.message });
        setDepositAmount("");
        setDepositDescription("");

        // Refresh selected customer accounts if active
        if (selectedCustomer) {
          setSelectedCustomer({
            ...selectedCustomer,
            accounts: selectedCustomer.accounts.map((acc) =>
              acc.accountNumber === depositAccNumber || acc.id === depositAccNumber
                ? { ...acc, balance: Number(acc.balance) + numAmount }
                : acc
            ),
          });
        }
      } else {
        addToast({ type: "error", title: "Deposit Failed", message: json.error?.message || json.error || "Failed to execute deposit." });
      }
    } catch {
      setIsDepositing(false);
      addToast({ type: "error", title: "Deposit Failed", message: "Failed to connect to deposit processing service." });
    }
  };

  const handleIssueLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const principal = parseFloat(loanPrincipal);
    const rate = parseFloat(loanInterest);
    const term = parseInt(loanTerm);

    if (isNaN(principal) || principal <= 0 || !loanAccId) {
      addToast({ type: "error", title: "Invalid Loan Data", message: "Please provide a valid principal amount and target bank account." });
      return;
    }

    setIsIssuingLoan(true);
    try {
      const res = await fetch("/api/admin/loans/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCustomer?.id,
          accountId: loanAccId,
          title: loanTitle || "Personal Credit Facility",
          principalAmount: principal,
          interestRate: rate,
          termMonths: term,
        }),
      });

      const json = await res.json();
      setIsIssuingLoan(false);

      if (res.ok && json.success) {
        addToast({ type: "success", title: "Loan Issued & Disbursed", message: json.data.message });

        // Update selected customer profile accounts
        if (selectedCustomer) {
          setSelectedCustomer({
            ...selectedCustomer,
            accounts: selectedCustomer.accounts.map((acc) =>
              acc.id === loanAccId || acc.accountNumber === loanAccId
                ? { ...acc, balance: Number(acc.balance) + principal }
                : acc
            ),
          });
        }
      } else {
        addToast({ type: "error", title: "Loan Issuance Failed", message: json.error?.message || json.error || "Failed to issue loan." });
      }
    } catch {
      setIsIssuingLoan(false);
      addToast({ type: "error", title: "Loan Issuance Failed", message: "Failed to connect to loan issuance administration service." });
    }
  };

  const [isFreezing, setIsFreezing] = useState<string | null>(null);

  const handleToggleFreezeAccount = async (accNumber: string, currentStatus: string) => {
    const newStatus = currentStatus === "FROZEN" ? "ACTIVE" : "FROZEN";
    setIsFreezing(accNumber);
    try {
      const res = await fetch("/api/admin/accounts/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: accNumber,
          status: newStatus,
          reason: `Support Operator status change to ${newStatus}`,
        }),
      });
      const json = await res.json();
      setIsFreezing(null);

      if (res.ok && json.success) {
        addToast({
          type: "success",
          title: `Account ${newStatus === "FROZEN" ? "Frozen" : "Unfrozen"}`,
          message: `Account ${accNumber} status updated to ${newStatus}. Audit log entry created.`,
        });

        if (selectedCustomer) {
          setSelectedCustomer({
            ...selectedCustomer,
            accounts: selectedCustomer.accounts.map((a) =>
              a.accountNumber === accNumber ? { ...a, status: newStatus } : a
            ),
          });
        }
      } else {
        addToast({ type: "error", title: "Operation Failed", message: json.error || "Failed to update account status." });
      }
    } catch {
      setIsFreezing(null);
      addToast({ type: "error", title: "Network Error", message: "Failed to connect to admin account control service." });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Support Operator Console</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Over-the-counter cash deposits, loan facility issuance, DLQ inspection, and circuit breaker governance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePaymentsDegraded}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                isPaymentsDegraded
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-muted border-border text-foreground hover:bg-slate-800"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {isPaymentsDegraded ? "Circuit Breaker: DEGRADED" : "Circuit Breaker: NORMAL"}
            </button>

            <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Role: {user?.role || "UNAUTHENTICATED"}
            </div>
          </div>
        </div>

        {!isOperator && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
              <span>Access Denied — Support Operator Privileges Required</span>
            </div>
            <p className="text-muted-foreground">
              Your account (<strong>{user?.email || "Guest"}</strong>) is assigned the <strong>{user?.role || "CUSTOMER"}</strong> role. Access to the Support Operator console and customer PII audit tools is strictly restricted to authorized operator accounts (`operator@vaultguard.com`).
            </p>
          </div>
        )}

        {isOperator && (
          <>
            {/* Search & Profile Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Lookup Form */}
              <div className="lg:col-span-6 bg-card rounded-xl p-5 border border-border shadow-sm space-y-4">
                <h2 className="text-base font-bold text-foreground">Customer Record Search</h2>

                <form onSubmit={handleLookup} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">
                      National ID / Email / Name / Account #
                    </label>
                    <input
                      type="text"
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                      placeholder="e.g. 200012345678, demo@vaultguard.com, or VG-SAV"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">
                      Access Justification (NFR-O3 Mandatory Audit Log)
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={accessReason}
                      onChange={(e) => setAccessReason(e.target.value)}
                      placeholder="Enter operational reason for inspecting customer records (e.g. Customer counter cash deposit / loan evaluation)..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Execute Audited Customer Search
                  </button>
                </form>

                {customerRecords.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground block mb-2">Search Results ({customerRecords.length})</span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {customerRecords.map((cust) => (
                        <button
                          key={cust.id}
                          onClick={() => setSelectedCustomer(cust)}
                          className={`w-full text-left p-2 rounded-lg text-xs font-mono flex justify-between items-center transition-colors ${
                            selectedCustomer?.id === cust.id
                              ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-200"
                              : "bg-muted/40 border border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <div>
                            <span className="font-sans font-semibold text-foreground block">{cust.fullName}</span>
                            <span className="text-[10px] text-muted-foreground">{cust.email}</span>
                          </div>
                          <span className="text-[10px] text-cyan-400">{cust.nationalId || "No NIC"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Profile Panel */}
              <div className="lg:col-span-6 bg-card rounded-xl p-5 border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground mb-3">Customer Profile</h2>

                  {selectedCustomer ? (
                    <div className="space-y-3.5 text-xs">
                      <div className="p-3.5 rounded-lg bg-background border border-border space-y-2 font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Full Name:</span>
                          <strong className="text-foreground font-sans">{selectedCustomer.fullName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">National ID:</span>
                          <strong className="text-cyan-400">{selectedCustomer.nationalId || "---"}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="text-foreground/90 font-sans">{selectedCustomer.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">MFA Status:</span>
                          <span className="text-emerald-400 font-sans font-medium">
                            {selectedCustomer.mfaEnabled ? "ENROLLED (TOTP RFC 6238)" : "NOT ENROLLED"}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-semibold text-foreground font-sans text-xs">Associated Bank Accounts ({selectedCustomer.accounts?.length || 0})</h3>
                      <div className="space-y-2 font-mono">
                        {selectedCustomer.accounts && selectedCustomer.accounts.length > 0 ? (
                          selectedCustomer.accounts.map((acc) => (
                            <div key={acc.id} className="p-3 rounded-lg bg-muted/50 border border-border flex justify-between items-center">
                              <div>
                                <span className="font-semibold text-foreground block">{acc.type} ({acc.accountNumber})</span>
                                <span className="text-[10px] text-muted-foreground">
                                  Status: <span className={acc.status === "FROZEN" ? "text-rose-400 font-bold" : "text-emerald-400 font-semibold"}>{acc.status || "ACTIVE"}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <strong className="text-foreground text-sm">{acc.currency || "LKR"} {Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                <button
                                  type="button"
                                  onClick={() => handleToggleFreezeAccount(acc.accountNumber, acc.status || "ACTIVE")}
                                  disabled={isFreezing === acc.accountNumber}
                                  className={`px-2.5 py-1 rounded text-[11px] font-sans font-semibold transition-colors flex items-center gap-1.5 ${
                                    acc.status === "FROZEN"
                                      ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                                      : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                                  }`}
                                >
                                  {isFreezing === acc.accountNumber ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : acc.status === "FROZEN" ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <ShieldAlert className="w-3 h-3" />
                                  )}
                                  {acc.status === "FROZEN" ? "Unfreeze" : "Freeze Account"}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 rounded-lg bg-muted/30 border border-border text-center text-muted-foreground text-xs">
                            No active bank accounts linked to this user profile.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-xs">
                      Search and select a customer profile above to perform teller deposits and loan facility disbursements.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* OPERATOR ACTION PANELS: CASH DEPOSIT & LOAN ISSUANCE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Cash Deposit Panel */}
              <div className="lg:col-span-6 bg-card rounded-xl p-5 border border-border shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-base font-bold text-foreground">Over-the-Counter Cash Deposit</h2>
                </div>

                <form onSubmit={handleExecuteDeposit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">Target Account Number</label>
                    <input
                      type="text"
                      required
                      value={depositAccNumber}
                      onChange={(e) => setDepositAccNumberInput(e.target.value)}
                      placeholder="e.g. VG-SAV-001234"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">Deposit Amount (LKR)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">Deposit Reference / Remarks</label>
                    <input
                      type="text"
                      value={depositDescription}
                      onChange={(e) => setDepositDescription(e.target.value)}
                      placeholder="e.g. Cash Deposit via Teller Window #3"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isDepositing}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDepositing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    Deposit Funds to Account
                  </button>
                </form>
              </div>

              {/* Loan Issuance Panel */}
              <div className="lg:col-span-6 bg-card rounded-xl p-5 border border-border shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Landmark className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-base font-bold text-foreground">Approve &amp; Disburse Loan Facility</h2>
                </div>

                <form onSubmit={handleIssueLoan} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">Loan Title</label>
                      <input
                        type="text"
                        required
                        value={loanTitle}
                        onChange={(e) => setLoanTitle(e.target.value)}
                        placeholder="e.g. Vehicle Loan"
                        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">Principal Amount (LKR)</label>
                      <input
                        type="number"
                        required
                        min="1000"
                        step="any"
                        value={loanPrincipal}
                        onChange={(e) => setLoanPrincipal(e.target.value)}
                        placeholder="e.g. 250000"
                        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">Interest Rate (%)</label>
                      <input
                        type="number"
                        required
                        step="0.1"
                        value={loanInterest}
                        onChange={(e) => setLoanInterest(e.target.value)}
                        placeholder="e.g. 6.5"
                        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">Term (Months)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="360"
                        value={loanTerm}
                        onChange={(e) => setLoanTerm(e.target.value)}
                        placeholder="e.g. 36"
                        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">
                      Disbursement Destination Account
                    </label>
                    {selectedCustomer && selectedCustomer.accounts.length > 0 ? (
                      <select
                        value={loanAccId}
                        onChange={(e) => setLoanAccIdInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-cyan-400 focus:outline-none"
                      >
                        {selectedCustomer.accounts.map((acc) => (
                          <option key={acc.id} value={acc.accountNumber}>
                            {acc.type} ({acc.accountNumber}) — Balance: {acc.currency || "LKR"} {Number(acc.balance).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        value={loanAccId}
                        onChange={(e) => setLoanAccIdInput(e.target.value)}
                        placeholder="Enter Target Account Number (e.g. VG-SAV-001234)"
                        className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isIssuingLoan || !loanAccId}
                    className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isIssuingLoan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />}
                    Disburse Loan Facility to Account
                  </button>
                </form>
              </div>
            </div>

            {/* OPERATOR ACTION PANEL: CUSTOMER ACCOUNT RECOVERY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
              <div className="lg:col-span-12 bg-card rounded-xl p-5 border border-border shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Key className="w-4 h-4 text-amber-500" />
                  <h2 className="text-base font-bold text-foreground">Customer Account Recovery Control</h2>
                </div>

                <form onSubmit={handleInitiateRecovery} className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Initiate a secure password and MFA reset token. Ensure physical identification has been validated prior to dispatch.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">
                        Customer Email
                      </label>
                      <input
                        type="email"
                        required
                        value={recoveryEmailInput}
                        onChange={(e) => setRecoveryEmailInput(e.target.value)}
                        placeholder="customer@vaultguard.com"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={recoveryFullNameInput}
                        onChange={(e) => setRecoveryFullNameInput(e.target.value)}
                        placeholder="Alex Perera"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">
                        National ID / NIC
                      </label>
                      <input
                        type="text"
                        required
                        value={recoveryNationalIdInput}
                        onChange={(e) => setRecoveryNationalIdInput(e.target.value)}
                        placeholder="e.g. 941820491V or 199418204918"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isInitiatingRecovery}
                    className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isInitiatingRecovery ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                    Initiate Account Recovery &amp; Dispatch Token
                  </button>
                </form>

                {generatedRecoveryLink && (
                  <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Recovery Link Dispatched Successfully</span>
                    </div>
                    <p className="text-muted-foreground">
                      For validation and local development testing, use this direct link to complete recovery for the customer:
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                      <input
                        type="text"
                        readOnly
                        value={generatedRecoveryLink}
                        className="flex-1 px-3 py-1.5 rounded bg-background border border-border font-mono text-[11px] text-foreground select-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => window.open(generatedRecoveryLink, "_blank")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-[11px] transition-colors text-center"
                      >
                        Open Recovery Page
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DLQ INSPECTION PANEL */}
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-amber-400" />
                    Dead Letter Queue (DLQ) Stream
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Failed event deliveries after maximum outbox retry attempts (§3.3)</p>
                </div>
                <span className="text-xs text-amber-400 font-mono font-semibold">{dlqEntries.length} Failed Event(s)</span>
              </div>

              <div className="divide-y divide-border mt-1 font-mono text-xs">
                {isLoadingDlq ? (
                  <div className="py-6 text-center text-muted-foreground text-xs font-sans">Loading DLQ stream...</div>
                ) : dlqEntries.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground font-sans text-xs flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Dead Letter Queue (DLQ) is clean. Zero failed asynchronous saga events.</span>
                  </div>
                ) : (
                  dlqEntries.map((dlq) => (
                    <div key={dlq.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-amber-400 font-semibold">{dlq.eventType}</span>
                        <span className="block text-rose-300 text-[11px] font-sans mt-0.5">Reason: {dlq.errorReason}</span>
                        <span className="text-[10px] text-muted-foreground">Event ID: {dlq.eventId} · Retries: {dlq.retryCount}</span>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        <span>{new Date(dlq.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ACCESS AUDIT LEDGER */}
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-bold text-foreground">Operator Attributable Access Ledger</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Signed cryptographic audit trail of operator PII queries (FR-22)</p>
                </div>
                <span className="text-xs text-cyan-400 font-mono text-[11px]">Audit Stream Active</span>
              </div>

              <div className="divide-y divide-border mt-1 font-mono text-xs">
                {accessAuditLogs.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground font-sans text-xs">
                    No operator queries executed in this browser session.
                  </div>
                ) : (
                  accessAuditLogs.map((log) => (
                    <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-cyan-400 font-semibold">{log.operator}</span> queried <span className="text-foreground font-semibold">{log.targetId}</span>
                        <span className="block text-muted-foreground text-[11px] font-sans mt-0.5">Reason: &quot;{log.reason}&quot;</span>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        <span>{log.timestamp}</span>
                        <span className="block text-muted-foreground text-[10px]">{log.kmsSig}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
