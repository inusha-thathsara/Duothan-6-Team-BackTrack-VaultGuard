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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye, EyeOff, Send, CreditCard, Landmark, ShieldCheck,
  Download, ArrowUpRight, ArrowDownLeft, FileText, ChevronRight,
} from "lucide-react";

export default function DashboardPage() {
  const { user, accounts, primaryAccount, transactions, isPaymentsDegraded, openStatementModal } =
    useVaultGuard();

  const [showBalance, setShowBalance] = useState(true);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Welcome back, {user?.fullName || "---"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              User: {user?.email || "---"} · Zero-Trust Session Active
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={openStatementModal}>
            <Download className="w-3.5 h-3.5" />
            Statement
          </Button>
        </div>

        {/* Balance + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Balance Card */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs uppercase tracking-wider">Total Available Balance</CardDescription>
                <Button variant="ghost" size="icon-xs" onClick={() => setShowBalance(!showBalance)}>
                  {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight pt-1">
                {showBalance
                  ? (primaryAccount ? `LKR ${primaryAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "LKR ---")
                  : "LKR ••••••••"}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="font-mono text-[10px]">Primary Account</Badge>
                <span>{primaryAccount?.accountNumber || "---"}</span>
                <span>·</span>
                <span>Domain Isolated</span>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-2">
                <Link href="/transfer"
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium h-7 px-2.5 transition-colors ${
                    isPaymentsDegraded ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/80'
                  }`}>
                  <Send className="w-3 h-3" /> Transfer
                </Link>
                <Link href="/bill-pay"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-foreground hover:bg-muted text-xs font-medium h-7 px-2.5 transition-colors">
                  <CreditCard className="w-3 h-3" /> Pay Bill
                </Link>
                <Link href="/loans"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-foreground hover:bg-muted text-xs font-medium h-7 px-2.5 transition-colors">
                  <Landmark className="w-3 h-3" /> Loans
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Nav */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Quick Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { href: "/transfer", icon: Send, label: "Send Wire", sub: "Domestic transfer" },
                    { href: "/history", icon: FileText, label: "Ledger", sub: "Export logs" },
                    { href: "/loans", icon: Landmark, label: "Credit", sub: "Loan LN-20941" },
                    { href: "/security", icon: ShieldCheck, label: "Security", sub: "MFA & Passkeys" },
                  ].map(({ href, icon: Icon, label, sub }) => (
                    <Link key={href} href={href}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border transition-colors flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      <div>
                        <span className="block text-xs font-semibold">{label}</span>
                        <span className="text-[10px] text-muted-foreground">{sub}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="px-4 py-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs ring-1 ring-border">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isPaymentsDegraded ? "bg-amber-400 animate-pulse" : "bg-foreground/40"}`} />
                <span className="text-muted-foreground">
                  Payments: <strong className={isPaymentsDegraded ? "text-amber-400" : "text-foreground"}>{isPaymentsDegraded ? "Degraded" : "Operational"}</strong>
                </span>
              </div>
              <Link href="/status" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">Status →</Link>
            </div>
          </div>
        </div>

        {/* All Accounts Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Your Bank Accounts</h2>
            <span className="text-xs text-muted-foreground font-mono">{accounts.length} Active Domain Schemas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {accounts.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-6 text-center text-xs text-muted-foreground">
                  No active accounts found (---).
                </CardContent>
              </Card>
            ) : (
              accounts.map((acc) => (
                <Card key={acc.id} className="relative overflow-hidden">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{acc.type}</span>
                      <Badge variant="secondary" className="text-[10px] font-mono">{acc.status}</Badge>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{acc.accountNumber || "---"}</div>
                    <div className="text-xl font-bold font-mono mt-2">
                      {showBalance ? `LKR ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "LKR ••••••"}
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Limit: LKR {acc.dailyLimit.toLocaleString()}</span>
                      <Link href="/history" className="hover:text-foreground underline-offset-4 hover:underline">Activity</Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Idempotent transaction outbox ledger</CardDescription>
              </div>
              <Link href="/history" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 underline-offset-4 hover:underline">
                Full History <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-medium text-foreground">No recent transactions</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Your real-time transaction ledger will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} onClick={() => setSelectedTx(tx)}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-muted/50 px-2 rounded-lg cursor-pointer transition-colors -mx-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tx.category === "Income" ? "bg-muted text-foreground" : "bg-muted/50 text-muted-foreground border border-border"}`}>
                        {tx.category === "Income" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold">{tx.description}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 font-mono">
                          <span>{tx.date.substring(0, 10)}</span>
                          <span>·</span>
                          <span>{tx.requestId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono block">
                        {tx.category === "Income" ? "+" : "-"} LKR {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <Badge variant={tx.status === "COMPLETED" ? "secondary" : "outline"} className="text-[10px] mt-0.5">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
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
              {[
                ["Description", selectedTx.description],
                ["Recipient / Account", selectedTx.payeeName || selectedTx.accountNumber],
                ["Amount", `LKR ${selectedTx.amount.toLocaleString()}`],
                ["Saga Ledger State", selectedTx.sagaStatus],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-border">
                  <span>{label}</span>
                  <span className="font-medium text-foreground font-mono">{value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
      <StepUpMfaModal />
      <StatementModal />
      <ToastContainer />
    </div>
  );
}
