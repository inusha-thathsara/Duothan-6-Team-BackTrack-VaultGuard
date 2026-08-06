"use client";

import React, { useState } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { StepUpMfaModal } from "@/components/common/StepUpMfaModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "lucide-react";

export default function LoansPage() {
  const { loans, repaymentSchedule, repayLoan, isPaymentsDegraded, accounts, primaryAccount, addToast } =
    useVaultGuard();

  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [repayAmountInput, setRepayAmountInput] = useState("");
  const [fromAccountIdInput, setFromAccountIdInput] = useState("");

  const activeLoan = loans[0];
  const fromAccountId = fromAccountIdInput || primaryAccount?.id || accounts[0]?.id || "";
  const repayAmount = repayAmountInput || (activeLoan?.nextPaymentAmount ? String(activeLoan.nextPaymentAmount) : "5000");

  const handleExecuteRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaymentsDegraded) { addToast({ type: "error", title: "Action Suspended", message: "Payments in degraded mode." }); return; }
    const amountNum = parseFloat(repayAmount) || 0;
    if (amountNum <= 0) return;
    const ok = await repayLoan(activeLoan.id, amountNum, fromAccountId);
    if (ok) setIsRepayModalOpen(false);
  };

  const formattedDueDate = activeLoan?.nextDueDate
    ? new Date(activeLoan.nextDueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "01 Aug 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Credit &amp; Loans</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Isolated Loans microservice with automated repayment schedules.</p>
        </div>

        {!activeLoan ? (
          <Card>
            <CardContent className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">No Active Loans Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You currently have no active personal or post-disaster loans on this account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Main Loan Card */}
              <Card className="lg:col-span-7 flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-xs uppercase tracking-wider">{activeLoan.title}</CardDescription>
                    <Badge variant="secondary" className="font-mono text-[10px]">{activeLoan.loanNumber}</Badge>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground block">Outstanding Balance</span>
                    <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight">
                      LKR {activeLoan.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-4" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground">Next Payment Due:</span>
                      <strong className="block font-mono text-xs mt-0.5">
                        {formattedDueDate} — LKR {activeLoan.nextPaymentAmount.toLocaleString()}
                      </strong>
                    </div>
                    <Button onClick={() => setIsRepayModalOpen(true)} disabled={isPaymentsDegraded || activeLoan.status === "PAID_OFF"} size="sm">
                      Repay Installment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule Card */}
              <Card className="lg:col-span-5">
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Installment Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {repaymentSchedule.slice(0, 4).map((sch) => (
                    <div key={sch.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {new Date(sch.dueDate).toISOString().split("T")[0]}
                        </span>
                      </div>
                      <span className="font-semibold">LKR {sch.amount.toLocaleString()}</span>
                      <Badge variant={sch.status === "PAID" ? "secondary" : sch.status === "OVERDUE" ? "destructive" : "outline"} className="text-[10px] font-sans">
                        {sch.status}
                      </Badge>
                    </div>
                  ))}
                  <p className="text-center text-[11px] text-muted-foreground pt-1 border-t border-border">
                    Interest Rate: <strong className="font-mono text-foreground">{activeLoan.interestRate}% p.a.</strong>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Progress */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Repayment Progress</CardTitle>
                    <CardDescription>Automated outbox events notify audit services on repayment completion.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Completed Installments</span>
                  <span>{activeLoan.completedInstallments} of {activeLoan.termMonths} months</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-foreground/60 rounded-full transition-all"
                    style={{ width: `${(activeLoan.completedInstallments / activeLoan.termMonths) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Repay Dialog */}
      <Dialog open={isRepayModalOpen} onOpenChange={setIsRepayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Repay Loan Installment</DialogTitle>
            <DialogDescription>Facility: Personal Loan LN-20941</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleExecuteRepay} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Source Account</Label>
              <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-xs focus:border-ring focus:outline-none font-mono">
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.type} ({acc.accountNumber}) — LKR {acc.balance.toLocaleString()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Repayment Amount (LKR)</Label>
              <Input type="number" required value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} className="font-mono text-lg font-bold" />
            </div>
            <Button type="submit" className="w-full">Confirm Repayment</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
      <StepUpMfaModal />
      <ToastContainer />
    </div>
  );
}
