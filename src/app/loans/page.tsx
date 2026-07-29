"use client";

import React, { useState } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { StepUpMfaModal } from "@/components/common/StepUpMfaModal";
import {
  Landmark,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  X
} from "lucide-react";

export default function LoansPage() {
  const {
    loans,
    repaymentSchedule,
    repayLoan,
    isPaymentsDegraded,
    accounts,
    primaryAccount,
    addToast
  } = useVaultGuard();

  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState("22000");
  const [fromAccountId, setFromAccountId] = useState(primaryAccount?.id || "acc_sav_4821");

  const activeLoan = loans[0];

  const handleExecuteRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaymentsDegraded) {
      addToast({
        type: "error",
        title: "Action Blocked (FR-08)",
        message: "Payments Service is currently degraded. Repayment is suspended.",
      });
      return;
    }

    const amountNum = parseFloat(repayAmount) || 0;
    if (amountNum <= 0) return;

    const ok = repayLoan(activeLoan.id, amountNum, fromAccountId);
    if (ok) {
      setIsRepayModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Loans & Credit Overview</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Isolated Loans Microservice (`loans_db`) · Facilities, schedules, & repayments (FR-15, FR-16)
          </p>
        </div>

        {/* HERO CARDS GRID (Matches Wireframe Figure 8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Loan Card */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden gradient-dark-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {activeLoan.title}
                </span>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
                  {activeLoan.loanNumber}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-xs text-slate-400 block">Outstanding Principal</span>
                <span className="text-3xl sm:text-5xl font-extrabold font-mono text-white tracking-tight">
                  LKR {activeLoan.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400">Next Payment Due:</span>
                <strong className="text-white block font-mono text-sm">
                  01 Aug 2026 — LKR {activeLoan.nextPaymentAmount.toLocaleString()}
                </strong>
              </div>

              <button
                onClick={() => setIsRepayModalOpen(true)}
                disabled={isPaymentsDegraded || activeLoan.status === "PAID_OFF"}
                className="px-6 py-3 rounded-xl gradient-mint text-slate-950 font-bold text-xs hover:opacity-95 disabled:opacity-50 transition-all shadow-lg mint-glow"
              >
                Repay Now (FR-16)
              </button>
            </div>
          </div>

          {/* Payment Schedule Summary Card */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Payment Schedule</h3>
              <div className="space-y-3 font-mono text-xs">
                {repaymentSchedule.slice(0, 4).map((sch) => (
                  <div
                    key={sch.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-white">{sch.dueDate}</span>
                    </div>
                    <span className="font-bold text-slate-200">LKR {sch.amount.toLocaleString()}</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded font-sans font-semibold ${
                      sch.status === "PAID"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {sch.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 text-center">
              <span className="text-[11px] text-slate-400">
                Loan Interest Rate: <strong className="text-emerald-400 font-mono">{activeLoan.interestRate}% p.a.</strong>
              </span>
            </div>
          </div>

        </div>

        {/* LOAN HEALTH & TERM PROGRESS (Matches Wireframe Figure 8) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-white">Loan Health & Term Progress</h3>
          <p className="text-xs text-slate-400">
            On track — no overdue installments since post-disaster account restoration. Repayments emit events to Pub/Sub outbox without coupling to Accounts writes.
          </p>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-slate-400">Term Progress</span>
              <span className="text-emerald-400 font-mono">
                {activeLoan.completedInstallments} of {activeLoan.termMonths} Installments Completed
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
              <div
                className="h-full gradient-mint rounded-full transition-all duration-500"
                style={{ width: `${(activeLoan.completedInstallments / activeLoan.termMonths) * 100}%` }}
              />
            </div>
          </div>
        </div>

      </main>

      {/* Loan Repayment Modal (FR-16) */}
      {isRepayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative max-w-md w-full glass-panel rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl">
            <button
              onClick={() => setIsRepayModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white">Repay Loan (FR-16)</h3>
            <p className="text-xs text-slate-400 mt-1">Initiate repayment for Personal Loan LN-20941</p>

            <form onSubmit={handleExecuteRepay} className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Deduct From Account
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Repayment Amount (LKR)
                </label>
                <input
                  type="number"
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xl font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 transition-all shadow-lg"
              >
                Confirm Loan Repayment
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <StepUpMfaModal />
      <ToastContainer />
    </div>
  );
}
