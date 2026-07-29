"use client";

import React, { useState } from "react";
import { useVaultGuard, TransactionItem } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { StatementModal } from "@/components/common/StatementModal";
import {
  History,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  XCircle,
  FileText
} from "lucide-react";

export default function HistoryPage() {
  const { transactions, openStatementModal } = useVaultGuard();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filteredTx = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.payeeName && tx.payeeName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;
    const matchesType = typeFilter === "ALL" || tx.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Transaction History</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Idempotent payment ledger & audit trail (FR-07, FR-14)
            </p>
          </div>

          <button
            onClick={openStatementModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Download className="w-4 h-4" /> Download Official Statement (FR-07)
          </button>
        </div>

        {/* SEARCH & FILTERS BAR (Matches Wireframe Figure 7) */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description, payee, or request ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-emerald-400 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-emerald-400 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="TRANSFER">Transfer</option>
              <option value="BILL_PAY">Bill Pay</option>
              <option value="LOAN_REPAYMENT">Loan Repayment</option>
            </select>
          </div>
        </div>

        {/* LEDGER TABLE (Matches Wireframe Figure 7) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Request ID (Idempotency)</th>
                  <th className="py-3 px-4">Description / Payee</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Saga Status</th>
                  <th className="py-3 px-4 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No matching transaction records found.
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {tx.date.substring(0, 10)} <span className="text-[10px] text-slate-500">{tx.date.substring(11, 16)}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-cyan-400">{tx.requestId}</td>
                      <td className="py-3.5 px-4 font-sans font-medium text-white">
                        {tx.description}
                        {tx.accountNumber && (
                          <span className="block text-[11px] font-mono text-slate-400">{tx.accountNumber}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : tx.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}>
                          {tx.status === "COMPLETED" && <CheckCircle2 className="w-3 h-3" />}
                          {tx.status === "PENDING" && <Clock className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold text-sm ${
                        tx.category === "Income" ? "text-emerald-400" : "text-slate-100"
                      }`}>
                        {tx.category === "Income" ? "+" : "-"} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <Footer />
      <StatementModal />
      <ToastContainer />
    </div>
  );
}
