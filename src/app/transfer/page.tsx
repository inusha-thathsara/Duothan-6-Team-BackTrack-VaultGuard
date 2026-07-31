"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { StepUpMfaModal } from "@/components/common/StepUpMfaModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Send, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw, UserPlus, Lock } from "lucide-react";

export default function TransferPage() {
  const router = useRouter();
  const { accounts, primaryAccount, payees, addPayee, addTransaction, isPaymentsDegraded, triggerStepUpMfa, addToast } =
    useVaultGuard();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fromAccountId, setFromAccountId] = useState(primaryAccount?.id || "acc_sav_4821");
  const [selectedPayeeId, setSelectedPayeeId] = useState(payees[0]?.id || "");
  const [newPayeeName, setNewPayeeName] = useState("");
  const [newPayeeAccount, setNewPayeeAccount] = useState("");
  const [isNewPayee, setIsNewPayee] = useState(false);
  const [amount, setAmount] = useState<string>("12500");
  const [reference, setReference] = useState("Rent Payment");
  const [requestId] = useState(() => `REQ-VG-${Math.floor(100000 + Math.random() * 900000)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const fee = 50.0;
  const isHighRisk = numAmount > 50000 || isNewPayee;

  const handleReviewStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaymentsDegraded) { addToast({ type: "error", title: "Action Suspended", message: "Payments service is in degraded mode." }); return; }
    if (numAmount <= 0) { addToast({ type: "error", title: "Invalid Amount", message: "Amount must be greater than zero." }); return; }
    if (numAmount > (primaryAccount?.balance || 0)) { addToast({ type: "error", title: "Insufficient Funds", message: "Amount exceeds available balance." }); return; }
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
          addPayee({ name: newPayeeName, accountNumber: newPayeeAccount, bankCode: "BOC-001", type: "PERSON" });
        }
        addTransaction({ requestId, type: "TRANSFER", description: `Transfer to ${activePayeeName}`, payeeName: activePayeeName, accountNumber: activePayeeAcc, amount: numAmount, fee, status: "COMPLETED", category: "Personal Transfer" });
        addToast({ type: "success", title: "Payment Committed", message: `Idempotency key ${requestId} committed.` });
        setStep(3);
      }, 700);
    };

    if (isHighRisk) triggerStepUpMfa(performCommit);
    else performCommit();
  };

  const steps = ["Transfer Details", "Review & Authorize", "Confirmation"];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div>
          <h1 className="text-xl font-bold tracking-tight">Wire Transfer</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Idempotent ledger transfer with risk-based step-up authentication.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between bg-card px-5 py-3 rounded-xl border border-border">
          {steps.map((label, i) => {
            const idx = i + 1;
            const active = step >= idx;
            return (
              <React.Fragment key={label}>
                <div className={`flex items-center gap-2 text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${active ? "bg-muted border-border text-foreground" : "bg-transparent border-border text-muted-foreground"}`}>{idx}</span>
                  {label}
                </div>
                {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* STEP 1: Form */}
        {step === 1 && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleReviewStep} className="space-y-5">

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">From Account</Label>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-xs focus:border-ring focus:outline-none font-mono"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.type} ({acc.accountNumber}) — LKR {acc.balance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider">Recipient Payee</Label>
                    <Button type="button" variant="ghost" size="xs" onClick={() => setIsNewPayee(!isNewPayee)}>
                      <UserPlus className="w-3 h-3" />
                      {isNewPayee ? "Use Saved Payee" : "New Payee"}
                    </Button>
                  </div>

                  {!isNewPayee ? (
                    <select
                      value={selectedPayeeId}
                      onChange={(e) => setSelectedPayeeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-xs focus:border-ring focus:outline-none"
                    >
                      {payees.filter((p) => p.type === "PERSON").map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.accountNumber})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Payee Name</Label>
                        <Input value={newPayeeName} onChange={(e) => setNewPayeeName(e.target.value)} placeholder="e.g. Kasun Silva" required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Account Number</Label>
                        <Input value={newPayeeAccount} onChange={(e) => setNewPayeeAccount(e.target.value)} placeholder="e.g. 883921004" required className="font-mono" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Amount (LKR)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">LKR</span>
                    <Input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-12 font-mono text-lg font-bold" placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Payment Reference</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Rent Payment" />
                </div>

                {isHighRisk && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong className="text-amber-300">Step-Up MFA Required:</strong> Amounts &gt; LKR 50,000 or new payees require TOTP verification.</span>
                  </div>
                )}

                <Button type="submit" disabled={isPaymentsDegraded} className="w-full">
                  Review Transfer Details <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Review */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Payment Details</CardTitle>
              <CardDescription>Confirm parameters prior to ledger outbox submission.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2.5 text-xs font-mono">
                {[
                  ["Idempotency Request ID", requestId],
                  ["From Account", primaryAccount?.accountNumber],
                  ["Recipient Payee", isNewPayee ? newPayeeName : payees.find((p) => p.id === selectedPayeeId)?.name],
                  ["Transfer Amount", `LKR ${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                  ["Service Fee", `LKR ${fee.toFixed(2)}`],
                  ["Total Deduction", `LKR ${(numAmount + fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="w-1/3" onClick={() => setStep(1)}>Back</Button>
                <Button className="w-2/3" onClick={handleExecutePayment} disabled={isSubmitting}>
                  {isSubmitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Committing...</> : <><Lock className="w-3.5 h-3.5" /> Authorize & Transfer</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Success */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-8 text-center space-y-5 pb-8">
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center mx-auto text-foreground">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Transfer Executed</h2>
                <p className="text-xs text-muted-foreground mt-1">Transaction committed to <code className="font-mono">payments_db</code> with idempotent reference log.</p>
              </div>

              <div className="rounded-lg bg-muted/50 border border-border p-3.5 text-xs text-left font-mono space-y-1.5 max-w-sm mx-auto">
                {[["Request ID", requestId], ["Amount Sent", `LKR ${numAmount.toLocaleString()}`], ["Saga Ledger", "COMPLETED"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}:</span>
                    <span className="text-foreground">{v}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Make Another Transfer</Button>
                <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        )}

      </main>

      <Footer />
      <StepUpMfaModal />
      <ToastContainer />
    </div>
  );
}
