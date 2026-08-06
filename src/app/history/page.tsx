"use client";

import React, { useState, useEffect } from "react";
import { useVaultGuard, TransactionItem } from "@/context/VaultGuardContext";

interface RawTransactionItem {
  id: string;
  requestId?: string;
  createdAt?: string;
  type?: string;
  description?: string;
  toAccount?: { accountNumber: string; user?: { fullName: string } };
  fromAccount?: { accountNumber: string; user?: { fullName: string } };
  amount: number | string;
  status?: string;
  metadata?: { loanId?: string; remainingBalance?: number; targetMonth?: string };
}
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function HistoryPage() {
  const { user, transactions, openStatementModal, payees } = useVaultGuard();
  const isOperator = user?.role === "SUPPORT_OPERATOR";
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [operatorTx, setOperatorTx] = useState<TransactionItem[]>([]);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  useEffect(() => {
    if (!isOperator) return;
    
    async function fetchOperatorHistory() {
      try {
        const queryParams = new URLSearchParams();
        if (searchTerm) queryParams.set("search", searchTerm);
        if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
        if (typeFilter !== "ALL") queryParams.set("type", typeFilter);
        queryParams.set("limit", "50");

        const res = await fetch(`/api/payments/history?${queryParams.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data?.items)) {
            setOperatorTx(
              json.data.items.map((item: RawTransactionItem) => ({
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
                senderName: item.fromAccount?.user?.fullName || "VaultGuard System",
                senderAccountNumber: item.fromAccount?.accountNumber || "",
                recipientName: item.toAccount?.user?.fullName || item.description || "External Payee",
                recipientAccountNumber: item.toAccount?.accountNumber || "",
                metadata: item.metadata,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch operator history:", err);
      }
    }

    const delayDebounce = setTimeout(() => {
      fetchOperatorHistory();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [isOperator, searchTerm, statusFilter, typeFilter]);

  const filteredTx = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.payeeName && tx.payeeName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;
    const matchesType = typeFilter === "ALL" || tx.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const displayTx = isOperator ? operatorTx : filteredTx;

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
                {displayTx.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground font-sans text-xs">
                      No matching transaction records found.
                    </td>
                  </tr>
                ) : (
                  displayTx.map((tx) => (
                    <tr key={tx.id} onClick={() => setSelectedTx(tx)} className="hover:bg-muted/30 cursor-pointer transition-colors">
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

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="p-3 bg-muted rounded-lg border border-border font-mono">
                <span className="text-[10px] uppercase tracking-wider block mb-0.5">Idempotency Request ID</span>
                <strong className="text-foreground text-xs">{selectedTx.requestId}</strong>
              </div>
              {(() => {
                const isLoan = selectedTx.type === "LOAN_REPAYMENT" || 
                               selectedTx.requestId.startsWith("REQ-LOAN-DISB-") || 
                               selectedTx.description.startsWith("Loan Facility Disbursed");

                const isDeposit = selectedTx.requestId.startsWith("REQ-DEP-") || 
                                  selectedTx.description.includes("Deposit by Operator");

                let fields: [string, string][] = [];

                if (isLoan) {
                  const metadata = selectedTx.metadata || {};
                  const loanId = metadata.loanId 
                    ? `LOAN-${metadata.loanId.substring(0, 8).toUpperCase()}` 
                    : `LOAN-${selectedTx.requestId.split("-").pop()?.toUpperCase() || "N/A"}`;
                  
                  const paidAmount = `LKR ${selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                  
                  let remainingBalance = "LKR 0.00";
                  if (metadata.remainingBalance !== undefined) {
                    remainingBalance = `LKR ${Number(metadata.remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                  } else if (selectedTx.requestId.startsWith("REQ-LOAN-DISB-")) {
                    remainingBalance = `LKR ${Number(selectedTx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                  }

                  const forMonth = metadata.targetMonth 
                    ? new Date(metadata.targetMonth + "-15").toLocaleString("default", { month: "long", year: "numeric" })
                    : new Date(selectedTx.date).toLocaleString("default", { month: "long", year: "numeric" });

                  fields = [
                    ["Loan ID", loanId],
                    ["Loan Owner Name", selectedTx.senderName || selectedTx.recipientName || "VaultGuard Customer"],
                    ["Description", selectedTx.description],
                    ["Paid Amount", paidAmount],
                    ["Remaining Loan Amount", remainingBalance],
                    ["Paid For Month", selectedTx.requestId.startsWith("REQ-LOAN-DISB-") ? "N/A" : forMonth],
                    ["Saga Ledger State", selectedTx.sagaStatus || selectedTx.status],
                    ["Date & Time", selectedTx.date.replace("T", " ").substring(0, 19)],
                  ];
                } else if (isDeposit) {
                  fields = [
                    ["Sender Name", "Operator"],
                    ["Sender Account", "Operator"],
                    ["Recipient Name", selectedTx.recipientName || selectedTx.senderName || "Ruwan Silva"],
                    ["Recipient Account", selectedTx.recipientAccountNumber || selectedTx.accountNumber || "N/A"],
                    ["Description", selectedTx.description],
                    ["Amount", `LKR ${selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                    ["Saga Ledger State", selectedTx.sagaStatus || selectedTx.status],
                    ["Date & Time", selectedTx.date.replace("T", " ").substring(0, 19)],
                  ];
                } else {
                  let cleanRecipientName = selectedTx.recipientName || "External / Payee";
                  if (cleanRecipientName === selectedTx.description && selectedTx.description.startsWith("Transfer to ")) {
                    cleanRecipientName = selectedTx.description.replace("Transfer to ", "");
                  }
                  
                  // Keyword-aware payee lookup:
                  // 1. Exact name match
                  // 2. Description contains full payee name
                  // 3. Any significant keyword (>=3 chars) from payee name appears in description
                  const descLower = selectedTx.description.toLowerCase();
                  const payeeMatch = payees?.find(p => {
                    if (p.name === cleanRecipientName) return true;
                    const pLower = p.name.toLowerCase();
                    if (descLower.includes(pLower)) return true;
                    const keywords = pLower.split(/[\s&(),]+/).filter(w => w.length >= 3);
                    return keywords.some(kw => descLower.includes(kw));
                  });
                  // Use payee's saved name (e.g. "City Power & Electric (CEB)" for any bill pay)
                  if (payeeMatch) cleanRecipientName = payeeMatch.name;
                  const recipientAccountNumber = selectedTx.recipientAccountNumber && selectedTx.recipientAccountNumber !== "N/A"
                    ? selectedTx.recipientAccountNumber
                    : (payeeMatch?.accountNumber ?? "N/A");

                  fields = [
                    ["Sender Name", selectedTx.senderName || "VaultGuard System"],
                    ["Sender Account", selectedTx.senderAccountNumber || "System Account"],
                    ["Recipient Name", cleanRecipientName],
                    ["Recipient Account", recipientAccountNumber],
                    ["Description", selectedTx.description],
                    ["Amount", `LKR ${selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                    ["Saga Ledger State", selectedTx.sagaStatus || selectedTx.status],
                    ["Date & Time", selectedTx.date.replace("T", " ").substring(0, 19)],
                  ];
                }

                return fields.map(([label, value]) => (
                  <div key={label} className="flex justify-between items-start gap-4 py-1.5 border-b border-border">
                    <span className="shrink-0 text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground font-mono text-right break-words whitespace-normal">{value}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
      <StatementModal />
      <ToastContainer />
    </div>
  );
}
