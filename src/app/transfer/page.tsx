"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { StepUpMfaModal } from "@/components/common/StepUpMfaModal";
import {
  Send,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  UserPlus,
  Copy,
  Lock
} from "lucide-react";

export default function TransferPage() {
  const router = useRouter();
  const {
    accounts,
    primaryAccount,
    payees,
    addPayee,
    addTransaction,
    isPaymentsDegraded,
    triggerStepUpMfa,
    addToast
  } = useVaultGuard();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fromAccountId, setFromAccountId] = useState(primaryAccount?.id || "acc_sav_4821");
  const [selectedPayeeId, setSelectedPayeeId] = useState(payees[0]?.id || "");
  const [newPayeeName, setNewPayeeName] = useState("");
  const [newPayeeAccount, setNewPayeeAccount] = useState("");
  const [isNewPayee, setIsNewPayee] = useState(false);
  const [amount, setAmount] = useState<string>("12500");
  const [reference, setReference] = useState("Rent July 2065");
  const [requestId, setRequestId] = useState(() => `REQ-2065-${Math.floor(100000 + Math.random() * 900000)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const fee = 50.0;
  const isHighRisk = numAmount > 50000 || isNewPayee;

  const handleReviewStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaymentsDegraded) {
      addToast({
        type: "error",
        title: "Action Blocked (FR-08)",
        message: "Payments Service is currently degraded. Money movement is suspended.",
      });
      return;
    }

    if (numAmount <= 0) {
      addToast({
        type: "error",
        title: "Invalid Amount",
        message: "Transfer amount must be greater than zero.",
      });
      return;
    }

    if (numAmount > (primaryAccount?.balance || 0)) {
      addToast({
        type: "error",
        title: "Insufficient Funds",
        message: "Transfer amount exceeds available account balance.",
      });
      return;
    }

    setStep(2);
  };

  const handleExecutePayment = () => {
    const activePayeeName = isNewPayee ? newPayeeName : payees.find((p) => p.id === selectedPayeeId)?.name || "Saved Payee";
    const activePayeeAcc = isNewPayee ? newPayeeAccount : payees.find((p) => p.id === selectedPayeeId)?.accountNumber || "";

    const performCommit = () => {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);

        if (isNewPayee && newPayeeName && newPayeeAccount) {
          addPayee({
            name: newPayeeName,
            accountNumber: newPayeeAccount,
            bankCode: "BOC-001",
            type: "PERSON",
          });
        }

        addTransaction({
          requestId,
          type: "TRANSFER",
          description: `Transfer to ${activePayeeName}`,
          payeeName: activePayeeName,
          accountNumber: activePayeeAcc,
          amount: numAmount,
          fee,
          status: "COMPLETED",
          category: "Personal Transfer",
        });

        addToast({
          type: "success",
          title: "Payment Committed (FR-13)",
          message: `Idempotency key ${requestId} committed. Ledger entry stored in payments_db.`,
        });

        setStep(3);
      }, 900);
    };

    if (isHighRisk) {
      triggerStepUpMfa(performCommit);
    } else {
      performCommit();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Transfer Money</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Initiate domestic transfer with risk evaluation & idempotent commit (FR-09, FR-10, FR-11, FR-13)
          </p>
        </div>

        {/* 3-Step Wizard Header (Matches Wireframe Figure 6) */}
        <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-slate-800">
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? "text-emerald-400" : "text-slate-500"}`}>
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[11px]">1</span>
            <span>Details</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-800" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? "text-emerald-400" : "text-slate-500"}`}>
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[11px]">2</span>
            <span>Review</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-800" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step === 3 ? "text-emerald-400" : "text-slate-500"}`}>
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[11px]">3</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* STEP 1: TRANSFER DETAILS */}
        {step === 1 && (
          <form onSubmit={handleReviewStep} className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
            
            {/* From Account */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                From Account
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-400 focus:outline-none font-mono"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.type} ({acc.accountNumber}) — LKR {acc.balance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Payee Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Payee / Recipient
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewPayee(!isNewPayee)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isNewPayee ? "Select Saved Payee" : "+ Add New Payee"}
                </button>
              </div>

              {!isNewPayee ? (
                <select
                  value={selectedPayeeId}
                  onChange={(e) => setSelectedPayeeId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
                >
                  {payees.filter(p => p.type === "PERSON").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.accountNumber})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Payee Name</label>
                    <input
                      type="text"
                      required
                      value={newPayeeName}
                      onChange={(e) => setNewPayeeName(e.target.value)}
                      placeholder="e.g. Kasun Silva"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      required
                      value={newPayeeAccount}
                      onChange={(e) => setNewPayeeAccount(e.target.value)}
                      placeholder="e.g. 883921004"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Amount (LKR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">LKR</span>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-14 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xl font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Payment Reference / Note
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Rent July"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* High Risk MFA Alert Banner (Matches Wireframe Figure 6) */}
            {isHighRisk && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <strong className="font-semibold text-amber-100">Step-up MFA required:</strong> Amounts &gt; LKR 50,000 or new payees automatically trigger TOTP authorization (FR-11).
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPaymentsDegraded}
              className="w-full py-4 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Review Transfer Details <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: REVIEW CONFIRMATION */}
        {step === 2 && (
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white">Review Payment Details (FR-10)</h3>
            <p className="text-xs text-slate-400">Confirm transaction parameters before ledger commit.</p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Idempotency Request ID (FR-13)</span>
                <span className="font-mono text-cyan-400 font-bold">{requestId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">From Account</span>
                <span className="text-white font-mono">{primaryAccount?.accountNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Recipient Payee</span>
                <span className="text-white font-semibold">
                  {isNewPayee ? newPayeeName : payees.find((p) => p.id === selectedPayeeId)?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Transfer Amount</span>
                <span className="text-emerald-400 font-extrabold text-base font-mono">
                  LKR {numAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Transaction Fee</span>
                <span className="text-slate-300 font-mono">LKR {fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Total Deduction</span>
                <span className="text-white font-bold font-mono">
                  LKR {(numAmount + fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={isSubmitting}
                className="w-2/3 py-3.5 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Committing Ledger...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Authorize & Execute Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 3 && (
          <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-emerald-500/40 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 mint-glow">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-white">Transfer Successfully Executed</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Idempotent transaction committed to <code className="text-emerald-400">payments_db</code>. Notification event published to Pub/Sub outbox.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs max-w-md mx-auto text-left font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Request ID:</span>
                <span className="text-cyan-400">{requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Sent:</span>
                <span className="text-emerald-400">LKR {numAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Saga Status:</span>
                <span className="text-white">COMPLETED</span>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={() => {
                  setRequestId(`REQ-2065-${Math.floor(100000 + Math.random() * 900000)}`);
                  setStep(1);
                }}
                className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-800"
              >
                Make Another Transfer
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3 rounded-xl gradient-mint text-slate-950 text-xs font-bold hover:opacity-95"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

      </main>

      <Footer />
      <StepUpMfaModal />
      <ToastContainer />
    </div>
  );
}
