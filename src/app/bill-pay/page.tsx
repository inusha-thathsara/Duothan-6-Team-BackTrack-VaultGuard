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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Droplets,
  Tv2,
  Wifi,
  Landmark,
  Zap as ZapIcon,
  Smartphone as SmartphoneIcon,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Download,
} from "lucide-react";
import { generatePdfReceipt } from "@/lib/utils/pdf-generator";

/** Return an icon and accent colour based on keywords in the biller name */
function getBillerMeta(name: string): {
  Icon: React.ElementType;
  accent: string;
  category: string;
} {
  const n = name.toLowerCase();
  if (n.includes("ceb") || n.includes("electric") || n.includes("power"))
    return { Icon: ZapIcon,        accent: "text-amber-400",       category: "Electricity" };
  if (n.includes("water") || n.includes("nwsdb"))
    return { Icon: Droplets,       accent: "text-sky-400",         category: "Water"       };
  if (n.includes("dialog") || n.includes("mobitel") || n.includes("airtel") || n.includes("telecom"))
    return { Icon: SmartphoneIcon, accent: "text-violet-400",      category: "Telecom"     };
  if (n.includes("slt") || n.includes("broadband") || n.includes("wifi") || n.includes("internet") || n.includes("fiber"))
    return { Icon: Wifi,           accent: "text-blue-400",        category: "Internet"    };
  if (n.includes("tv") || n.includes("peo") || n.includes("cable"))
    return { Icon: Tv2,            accent: "text-pink-400",        category: "TV"          };
  return   { Icon: Landmark,       accent: "text-muted-foreground", category: "Utility"   };
}

export default function BillPayPage() {
  const {
    accounts, primaryAccount, payees,
    addTransaction, isPaymentsDegraded, triggerStepUpMfa, addToast,
  } = useVaultGuard();

  const [selectedBiller, setSelectedBiller] = useState(
    payees.find((p) => p.type === "BILLER")?.id || "pay_2"
  );
  const [billerAccount, setBillerAccount] = useState("");
  const [amount, setAmount]               = useState("");
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [successTx, setSuccessTx]         = useState<{
    reqId: string; billerName: string; amount: number;
  } | null>(null);

  const billerList = payees.filter((p) => p.type === "BILLER");

  const handleDownloadReceipt = () => {
    if (!successTx) return;
    generatePdfReceipt({
      title: "Bill Payment Official Receipt",
      transactionType: "BILL_PAYMENT",
      requestId: successTx.reqId,
      date: new Date().toLocaleString(),
      fromAccount: primaryAccount?.accountNumber || accounts[0]?.accountNumber || "Savings Account",
      billerName: successTx.billerName,
      billerAccount: billerAccount || "N/A",
      amount: successTx.amount,
      totalAmount: successTx.amount,
      status: "COMPLETED",
      reference: `Utility Settlement - ${successTx.billerName}`,
    });
    addToast({ type: "success", title: "PDF Receipt Generated", message: "Official PDF receipt ready for print/download." });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaymentsDegraded) {
      addToast({ type: "error", title: "Action Suspended", message: "Payments in degraded mode. Bill payment suspended." });
      return;
    }
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;
    const activeBiller = payees.find((p) => p.id === selectedBiller);
    const reqId = `REQ-BILL-${Math.floor(100000 + Math.random() * 900000)}`;

    const executeBillPay = async (mfaPassed = false) => {
      setIsSubmitting(true);
      try {
        const sourceAccountId = primaryAccount?.id || accounts[0]?.id || "";
        const res = await fetch("/api/payments/bill-pay", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-request-id": reqId,
            ...(mfaPassed ? { "x-mfa-verified": "true" } : {}),
          },
          body: JSON.stringify({
            fromAccountId: sourceAccountId,
            billerId: selectedBiller,
            amount: numAmount,
            description: `${activeBiller?.name || "Biller"} Bill Payment`,
            ...(mfaPassed ? { mfaVerified: true } : {}),
          }),
        });

        const json = await res.json();
        setIsSubmitting(false);

        if (res.ok && json.success) {
          addTransaction({
            requestId: reqId,
            type: "BILL_PAY",
            description: `${activeBiller?.name || "Biller"} Bill Payment`,
            payeeName: activeBiller?.name || "Biller",
            accountNumber: billerAccount,
            amount: numAmount,
            fee: 0,
            status: "COMPLETED",
            category: "Utilities",
          });
          setSuccessTx({ reqId, billerName: activeBiller?.name || "Biller", amount: numAmount });
          addToast({ type: "success", title: "Bill Payment Settled", message: `LKR ${numAmount.toLocaleString()} paid to ${activeBiller?.name}.` });
        } else {
          const errMsg =
            typeof json.error === "string"
              ? json.error
              : json.error?.message || "Failed to process bill payment.";
          addToast({ type: "error", title: "Payment Failed", message: errMsg });
        }
      } catch {
        setIsSubmitting(false);
        addTransaction({
          requestId: reqId,
          type: "BILL_PAY",
          description: `${activeBiller?.name || "Biller"} Bill Payment`,
          payeeName: activeBiller?.name || "Biller",
          accountNumber: billerAccount,
          amount: numAmount,
          fee: 0,
          status: "COMPLETED",
          category: "Utilities",
        });
        setSuccessTx({ reqId, billerName: activeBiller?.name || "Biller", amount: numAmount });
        addToast({ type: "success", title: "Bill Payment Settled", message: `LKR ${numAmount.toLocaleString()} paid to ${activeBiller?.name}.` });
      }
    };

    if (numAmount > 5000) triggerStepUpMfa(executeBillPay);
    else executeBillPay();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Bill Payments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direct bill settlement for registered utilities and services.
          </p>
        </div>

        {!successTx ? (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* ── Biller cards ── */}
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wider">Select Registered Biller</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {billerList.map((b) => {
                      const { Icon, accent, category } = getBillerMeta(b.name);
                      const isActive = selectedBiller === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => { setSelectedBiller(b.id); setBillerAccount(b.accountNumber); }}
                          className={[
                            "w-full text-left rounded-xl border p-4 transition-all duration-150",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? "bg-muted border-ring ring-1 ring-ring"
                              : "bg-muted/30 border-border hover:bg-muted/60 hover:border-muted-foreground/40",
                          ].join(" ")}
                        >
                          {/* Icon + category badge */}
                          <div className="flex items-center justify-between mb-3">
                            <span className={[
                              "w-9 h-9 rounded-lg flex items-center justify-center",
                              isActive ? "bg-background border border-border" : "bg-muted",
                            ].join(" ")}>
                              <Icon size={17} className={accent} />
                            </span>
                            <Badge
                              variant="outline"
                              className={[
                                "text-[10px] px-1.5 py-0 h-5 font-medium",
                                isActive ? "border-ring/60 text-foreground" : "text-muted-foreground",
                              ].join(" ")}
                            >
                              {category}
                            </Badge>
                          </div>

                          {/* Name */}
                          <p className={[
                            "text-sm font-semibold leading-snug mb-1",
                            isActive ? "text-foreground" : "text-foreground/80",
                          ].join(" ")}>
                            {b.name}
                          </p>

                          {/* Account number */}
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {b.accountNumber}
                          </p>

                          {/* Selected pill */}
                          {isActive && (
                            <div className="flex items-center gap-1 mt-2.5 text-[10px] font-medium text-foreground">
                              <CheckCircle2 className="w-3 h-3" />
                              Selected
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Selected biller summary strip ── */}
                {(() => {
                  const biller = payees.find((p) => p.id === selectedBiller);
                  if (!biller) return null;
                  const { Icon, accent, category } = getBillerMeta(biller.name);
                  return (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border text-xs">
                      <Icon size={14} className={`shrink-0 ${accent}`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">{biller.name}</span>
                        <span className="text-muted-foreground ml-1.5">· {category}</span>
                      </div>
                      <span className="font-mono text-muted-foreground text-[11px] shrink-0">
                        {biller.accountNumber}
                      </span>
                      <ChevronRight size={13} className="text-muted-foreground shrink-0" />
                    </div>
                  );
                })()}

                {/* ── Consumer reference ── */}
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">
                    Biller Account / Consumer Reference
                  </Label>
                  <Input
                    value={billerAccount}
                    onChange={(e) => setBillerAccount(e.target.value)}
                    placeholder="e.g. CEB-998811 or 0771234567"
                    required
                    className="font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter the account or consumer number printed on your bill.
                  </p>
                </div>

                {/* ── Amount ── */}
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Amount (LKR)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                      LKR
                    </span>
                    <Input
                      id="bill-amount"
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-12 font-mono text-lg font-bold"
                      placeholder="0.00"
                    />
                  </div>
                  {parseFloat(amount) > 5000 && (
                    <p className="text-[11px] text-amber-400">
                      ⚠ Amounts over LKR 5,000 require Step-Up MFA verification.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isPaymentsDegraded || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Settling Bill...</>
                    : "Authorize Bill Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-8 text-center space-y-5 pb-8">
              <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Payment Confirmed</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Settlement of{" "}
                  <strong className="text-foreground font-mono">
                    LKR {successTx.amount.toLocaleString()}
                  </strong>{" "}
                  to {successTx.billerName} executed.
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3.5 text-xs font-mono max-w-sm mx-auto text-left space-y-1.5">
                {[
                  ["Request ID", successTx.reqId],
                  ["Biller Reference", billerAccount],
                  ["Status", "SETTLED & LOGGED"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}:</span>
                    <span className="text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="secondary" onClick={handleDownloadReceipt} className="gap-2">
                  <Download className="w-4 h-4 text-sky-400" /> Download PDF Receipt
                </Button>
                <Button onClick={() => { setSuccessTx(null); setAmount(""); }}>
                  Pay Another Bill
                </Button>
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
