"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useVaultGuard, TransactionItem } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { StepUpMfaModal } from "@/components/common/StepUpMfaModal";
import { StatementModal } from "@/components/common/StatementModal";
import {
  Wallet,
  Eye,
  EyeOff,
  Send,
  CreditCard,
  Landmark,
  ShieldCheck,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";

export default function DashboardPage() {
  const {
    user,
    accounts,
    primaryAccount,
    transactions,
    isPaymentsDegraded,
    openStatementModal,
    addToast
  } = useVaultGuard();

  const [showBalance, setShowBalance] = useState(true);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Welcome & System Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Good evening, <span className="gradient-text">{user?.fullName || "Alex"}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Restored zero-trust banking session · ID: <span className="font-mono text-emerald-400">{user?.nationalId}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openStatementModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Statement (FR-07)</span>
            </button>
          </div>
        </div>

        {/* HERO CARDS & QUICK ACTIONS (Matches Figure 5 from Wireframes) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Total Available Balance Card */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden gradient-dark-card">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Available Balance</span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="text-slate-400 hover:text-emerald-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
              >
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="my-2">
              <span className="text-3xl sm:text-5xl font-extrabold font-mono text-white tracking-tight">
                {showBalance
                  ? `LKR ${primaryAccount?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : "LKR ••••••••"}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-semibold">
                Primary
              </span>
              <span>{primaryAccount?.accountNumber}</span>
              <span className="mx-2">•</span>
              <span className="text-emerald-400 font-medium">Isolated Cloud SQL (`accounts_db`)</span>
            </div>

            {/* Quick Action Buttons inside Card */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              <Link
                href="/transfer"
                className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md ${
                  isPaymentsDegraded
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60"
                    : "gradient-mint text-slate-950 hover:opacity-95 mint-glow"
                }`}
              >
                <Send className="w-4 h-4" /> Transfer
              </Link>
              <Link
                href="/bill-pay"
                className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white transition-all ${
                  isPaymentsDegraded ? "opacity-60" : ""
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-400" /> Pay Bill
              </Link>
              <Link
                href="/loans"
                className="col-span-2 sm:col-span-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white transition-all"
              >
                <Landmark className="w-4 h-4 text-cyan-400" /> View Loans
              </Link>
            </div>
          </div>

          {/* Quick Shortcuts & Security Widget Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Quick Shortcuts</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/transfer"
                  className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center gap-3 group"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white">Send Money</span>
                    <span className="text-[10px] text-slate-400">Domestic transfer</span>
                  </div>
                </Link>

                <Link
                  href="/history"
                  className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center gap-3 group"
                >
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white">Statements</span>
                    <span className="text-[10px] text-slate-400">Export history</span>
                  </div>
                </Link>

                <Link
                  href="/loans"
                  className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center gap-3 group"
                >
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white">Credit & Loans</span>
                    <span className="text-[10px] text-slate-400">LN-20941 Active</span>
                  </div>
                </Link>

                <Link
                  href="/security"
                  className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center gap-3 group"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white">Security</span>
                    <span className="text-[10px] text-slate-400">Trusted devices</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Microservice Degraded Status Info Badge */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isPaymentsDegraded ? "bg-amber-400" : "bg-emerald-400"}`} />
                <span className="text-slate-300">
                  Payments Mode: <strong className={isPaymentsDegraded ? "text-amber-400" : "text-emerald-400"}>
                    {isPaymentsDegraded ? "Degraded (Read-Only)" : "Fully Operational"}
                  </strong>
                </span>
              </div>
              <Link href="/status" className="text-xs text-emerald-400 font-semibold hover:underline">
                View Status →
              </Link>
            </div>

          </div>

        </div>

        {/* ACCOUNTS LIST (FR-06) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Your Bank Accounts (FR-06)</h2>
            <span className="text-xs text-slate-400">3 Isolated Balances</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{acc.type}</span>
                  <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                    {acc.status}
                  </span>
                </div>
                <div className="font-mono text-lg font-bold text-white mt-1">{acc.accountNumber}</div>
                <div className="text-2xl font-extrabold text-white mt-3 font-mono">
                  {showBalance ? `LKR ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "LKR ••••••"}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Daily Limit: LKR {acc.dailyLimit.toLocaleString()}</span>
                  <Link href="/history" className="text-emerald-400 font-medium hover:underline">
                    History
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ACTIVITY FEED (Matches Figure 5 & FR-14) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Recent Activity Feed</h2>
              <p className="text-xs text-slate-400">Idempotent transaction ledger logs (FR-14)</p>
            </div>
            <Link
              href="/history"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              View Full History <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60 my-2">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="py-4 flex items-center justify-between gap-4 hover:bg-slate-900/40 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    tx.category === "Income"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-slate-800 text-slate-300"
                  }`}>
                    {tx.category === "Income" ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{tx.description}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{tx.date.substring(0, 10)}</span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-cyan-400">{tx.requestId}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-sm font-bold block ${
                    tx.category === "Income" ? "text-emerald-400" : "text-white"
                  }`}>
                    {tx.category === "Income" ? "+" : "-"} LKR {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded mt-1 ${
                    tx.status === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Transaction Detail Drawer Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative max-w-md w-full glass-panel rounded-2xl p-6 border border-slate-700 shadow-2xl">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-2">Transaction Detail</h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                <span className="text-slate-400 block text-[10px]">Idempotent Request ID (FR-13)</span>
                <strong className="text-cyan-400 text-sm">{selectedTx.requestId}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Description</span>
                <span className="font-semibold text-white">{selectedTx.description}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Payee / Account</span>
                <span className="text-white">{selectedTx.payeeName || selectedTx.accountNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Amount</span>
                <span className="font-bold text-emerald-400">LKR {selectedTx.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Saga Status</span>
                <span className="font-mono text-emerald-300">{selectedTx.sagaStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <StepUpMfaModal />
      <StatementModal />
      <ToastContainer />
    </div>
  );
}
