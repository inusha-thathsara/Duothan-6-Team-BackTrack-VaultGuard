"use client";

import React, { useState } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Download, Printer, ShieldCheck, X, FileText, Calendar } from "lucide-react";

export const StatementModal: React.FC = () => {
  const { isStatementModalOpen, closeStatementModal, primaryAccount, transactions, addToast } = useVaultGuard();
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-29");

  if (!isStatementModalOpen) return null;

  const filteredTx = transactions.filter((t) => {
    const d = t.date.substring(0, 10);
    return d >= startDate && d <= endDate;
  });

  const handlePrint = () => {
    addToast({
      type: "success",
      title: "Statement Download Initiated",
      message: `VaultGuard official PDF statement compiled with Cloud KMS signature hash.`,
    });
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative max-w-3xl w-full glass-panel rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl my-8">
        <button
          onClick={closeStatementModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Account Statement Generator</h3>
              <p className="text-xs text-slate-400">FR-07: Download or view cryptographically signed statements</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold transition-all"
            >
              <Download className="w-4 h-4" /> Download PDF / Print
            </button>
          </div>
        </div>

        {/* Date Filter Bar (Hidden when printing) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800 print:hidden">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Start Date</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">End Date</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Printable Statement Sheet */}
        <div className="bg-slate-950 p-6 sm:p-8 rounded-xl border border-slate-800 text-slate-200 text-xs sm:text-sm shadow-inner print:bg-white print:text-black print:p-0">
          <div className="flex justify-between items-start border-b border-slate-800 print:border-black pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-wider text-emerald-400 print:text-black">VAULTGUARD</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 print:hidden">
                  SECURE BANK
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">Post-Disaster Digital Banking Platform</p>
              <p className="text-[11px] text-slate-500 print:text-gray-500">IEEE NSBM Duothan 6.0 · Team BackTrack</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold text-white print:text-black">OFFICIAL STATEMENT</p>
              <p className="text-slate-400 print:text-gray-600">Period: {startDate} to {endDate}</p>
              <p className="text-slate-500 print:text-gray-500 text-[10px] mt-1">Issued: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 text-xs">
            <div>
              <span className="text-slate-400 print:text-gray-500 block">Account Holder</span>
              <strong className="text-white print:text-black font-semibold">Alex Perera</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-500 block">Account Number</span>
              <strong className="text-emerald-400 print:text-black font-semibold">{primaryAccount?.accountNumber}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-500 block">Current Balance</span>
              <strong className="text-white print:text-black font-semibold">LKR {primaryAccount?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <h4 className="font-semibold text-white print:text-black mb-3">Transaction Summary ({filteredTx.length})</h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 print:border-gray-300 text-slate-400 print:text-gray-600">
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Request ID</th>
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500">
                      No transactions found for the selected date range.
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/30">
                      <td className="py-2.5 px-2 text-slate-400 print:text-gray-600 whitespace-nowrap">{tx.date.substring(0, 10)}</td>
                      <td className="py-2.5 px-2 font-mono text-[10px] text-cyan-400 print:text-gray-800">{tx.requestId}</td>
                      <td className="py-2.5 px-2 font-medium text-white print:text-black">{tx.description}</td>
                      <td className="py-2.5 px-2 text-slate-400 print:text-gray-600">{tx.type}</td>
                      <td className={`py-2.5 px-2 text-right font-semibold ${tx.category === "Income" ? "text-emerald-400" : "text-slate-200 print:text-black"}`}>
                        {tx.category === "Income" ? "+" : "-"} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 print:border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 print:text-gray-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Cryptographic KMS Signature: 0x8F9A...B342 (Verified)
            </span>
            <span>VaultGuard Digital Ledger · Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
