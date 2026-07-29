"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { StepUpMfaModal } from "@/components/common/StepUpMfaModal";
import { CreditCard, Zap, Smartphone, Droplets, ShieldCheck, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react";

export default function BillPayPage() {
  const router = useRouter();
  const {
    accounts,
    primaryAccount,
    payees,
    addTransaction,
    isPaymentsDegraded,
    triggerStepUpMfa,
    addToast
  } = useVaultGuard();

  const [selectedBiller, setSelectedBiller] = useState(payees.find((p) => p.type === "BILLER")?.id || "pay_2");
  const [billerAccount, setBillerAccount] = useState("CEB-883921");
  const [amount, setAmount] = useState("4820");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<{ reqId: string; billerName: string; amount: number } | null>(null);

  const billerList = payees.filter((p) => p.type === "BILLER");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaymentsDegraded) {
      addToast({
        type: "error",
        title: "Action Blocked (FR-08)",
        message: "Payments Service is currently degraded. Bill payment is suspended.",
      });
      return;
    }

    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return;

    const activeBiller = payees.find((p) => p.id === selectedBiller);
    const reqId = `REQ-BILL-${Math.floor(100000 + Math.random() * 900000)}`;

    const executeBillPay = () => {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);

        addTransaction({
          requestId: reqId,
          type: "BILL_PAY",
          description: `${activeBiller?.name || "Biller"} Payment`,
          payeeName: activeBiller?.name || "Registered Biller",
          accountNumber: billerAccount,
          amount: numAmount,
          fee: 0,
          status: "COMPLETED",
          category: "Utilities",
        });

        setSuccessTx({
          reqId,
          billerName: activeBiller?.name || "Biller",
          amount: numAmount,
        });

        addToast({
          type: "success",
          title: "Bill Payment Processed (FR-12)",
          message: `LKR ${numAmount.toLocaleString()} paid to ${activeBiller?.name}. Receipt generated.`,
        });
      }, 800);
    };

    if (numAmount > 50000) {
      triggerStepUpMfa(executeBillPay);
    } else {
      executeBillPay();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Bill Payment</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Process instant utility & service bill payments (FR-12)
          </p>
        </div>

        {!successTx ? (
          <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Registered Biller
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {billerList.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedBiller(b.id);
                      setBillerAccount(b.accountNumber);
                    }}
                    className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all ${
                      selectedBiller === b.id
                        ? "bg-emerald-500/15 border-emerald-500/40 text-white mint-border-glow"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {b.name.includes("CEB") ? <Zap className="w-4 h-4 text-amber-400" /> : <Smartphone className="w-4 h-4 text-cyan-400" />}
                      <span>{b.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 block">{b.accountNumber}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Biller Account / Consumer Reference
              </label>
              <input
                type="text"
                required
                value={billerAccount}
                onChange={(e) => setBillerAccount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Bill Amount (LKR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">LKR</span>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-14 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xl font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPaymentsDegraded || isSubmitting}
              className="w-full py-4 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Processing Payment...
                </>
              ) : (
                "Pay Bill & Generate Receipt"
              )}
            </button>
          </form>
        ) : (
          <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-emerald-500/40 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 mint-glow">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-white">Bill Payment Confirmed</h3>
            <p className="text-xs text-slate-400">
              Payment of <strong className="text-emerald-400">LKR {successTx.amount.toLocaleString()}</strong> to {successTx.billerName} has been settled.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono max-w-md mx-auto text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt Request ID:</span>
                <span className="text-cyan-400">{successTx.reqId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Biller Reference:</span>
                <span className="text-white">{billerAccount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400">COMPLETED & AUDITED</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessTx(null);
                setAmount("");
              }}
              className="px-8 py-3 rounded-xl gradient-mint text-slate-950 text-xs font-bold hover:opacity-95"
            >
              Pay Another Bill
            </button>
          </div>
        )}
      </main>

      <Footer />
      <StepUpMfaModal />
      <ToastContainer />
    </div>
  );
}
