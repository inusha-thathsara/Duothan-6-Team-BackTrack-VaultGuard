"use client";

import React, { useState } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { StatementModal } from "@/components/common/StatementModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Download, CheckCircle2, Clock } from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Transaction Ledger</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Idempotent payment outbox audit history and statement logs.</p>
          </div>
          <Button size="sm" onClick={openStatementModal}>
            <Download className="w-3.5 h-3.5" /> Download Statement
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search description, payee, or request ID..." className="pl-9" />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {[
                  { value: statusFilter, setter: setStatusFilter, options: [["ALL", "All Statuses"], ["COMPLETED", "Completed"], ["PENDING", "Pending"], ["FAILED", "Failed"]] },
                  { value: typeFilter, setter: setTypeFilter, options: [["ALL", "All Types"], ["TRANSFER", "Transfer"], ["BILL_PAY", "Bill Pay"], ["LOAN_REPAYMENT", "Loan Repayment"]] },
                ].map(({ value, setter, options }, i) => (
                  <select key={i} value={value} onChange={(e) => setter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-input border border-border text-xs text-foreground focus:border-ring focus:outline-none">
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Description / Recipient</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground font-sans text-xs">
                      No matching transaction records found.
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {tx.date.substring(0, 10)} <span className="text-[10px]">{tx.date.substring(11, 16)}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground/80">{tx.requestId}</td>
                      <td className="py-3 px-4 font-sans font-medium text-foreground">
                        {tx.description}
                        {tx.accountNumber && (
                          <span className="block text-[11px] font-mono text-muted-foreground">{tx.accountNumber}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <Badge variant="outline" className="text-[10px]">{tx.type}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={tx.status === "COMPLETED" ? "secondary" : tx.status === "PENDING" ? "outline" : "destructive"}
                          className="text-[10px] gap-1">
                          {tx.status === "COMPLETED" && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {tx.status === "PENDING" && <Clock className="w-2.5 h-2.5" />}
                          {tx.status}
                        </Badge>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${tx.category === "Income" ? "text-foreground" : "text-foreground/80"}`}>
                        {tx.category === "Income" ? "+" : "-"} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <Footer />
      <StatementModal />
      <ToastContainer />
    </div>
  );
}
