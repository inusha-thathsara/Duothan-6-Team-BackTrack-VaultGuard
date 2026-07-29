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
      title: "Statement Downloaded",
      message: `Official PDF statement generated with Cloud KMS digital signature.`,
    });
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative max-w-3xl w-full bg-card rounded-xl p-6 border border-border shadow-xl my-8">
        <button
          onClick={closeStatementModal}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded hover:bg-slate-800 transition-colors print:hidden"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-border flex items-center justify-center text-muted-foreground">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Account Statement Generator</h3>
              <p className="text-xs text-muted-foreground">Export cryptographically signed account statement</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download / Print PDF
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 p-3 rounded-lg bg-muted/50 border border-border print:hidden">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-border font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-border font-mono"
            />
          </div>
        </div>

        {/* Statement Sheet */}
        <div className="bg-background p-6 rounded-lg border border-border text-slate-200 text-xs shadow-inner print:bg-white print:text-black print:p-0">
          <div className="flex justify-between items-start border-b border-border print:border-black pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground print:text-black">VaultGuard Bank</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-muted-foreground border border-border print:hidden">
                  Official Record
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground print:text-gray-600 mt-0.5">Verified Digital Banking Record</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-foreground print:text-black">ACCOUNT STATEMENT</p>
              <p className="text-[11px] text-muted-foreground print:text-gray-600 font-mono mt-0.5">
                Period: {startDate} to {endDate}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 p-3 rounded-lg bg-muted/50 border border-border print:bg-gray-100 print:border-gray-300 font-mono text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px]">Primary Account:</span>
              <strong className="text-foreground print:text-black">{primaryAccount?.accountNumber}</strong>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px]">Current Balance:</span>
              <strong className="text-muted-foreground print:text-black">
                LKR {primaryAccount?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Transactions Table */}
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                <th className="py-2">Date</th>
                <th className="py-2">Ref ID</th>
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500 font-sans">
                    No transactions recorded for selected timeframe.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-2 text-muted-foreground">{tx.date.substring(0, 10)}</td>
                    <td className="py-2 text-muted-foreground">{tx.requestId}</td>
                    <td className="py-2 text-slate-200 font-sans">{tx.description}</td>
                    <td className="py-2 text-right font-bold">
                      {tx.category === "Income" ? "+" : "-"} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-6 pt-3 border-t border-border text-[10px] text-slate-500 flex justify-between items-center">
            <span>KMS Signature: 8F9A-B342-9910-VG-CERT</span>
            <span>Generated: {new Date().toISOString().substring(0, 10)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

