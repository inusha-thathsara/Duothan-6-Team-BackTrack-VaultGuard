"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/common/ToastContainer";
import { ShieldCheck, Lock, Smartphone, RefreshCw, Key } from "lucide-react";

export default function MfaPage() {
  const router = useRouter();
  const { addToast } = useVaultGuard();
  const [code, setCode] = useState(["1", "3", "5", "7", "9", "2"]);
  const [timer, setTimer] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 60));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`mfa-pg-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      addToast({
        type: "success",
        title: "MFA Verified & Trusted Device Bound",
        message: "Identity Platform token issued. Welcome to VaultGuard Banking.",
      });
      router.push("/dashboard");
    }, 700);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 sm:p-10 border border-emerald-500/30 shadow-2xl relative text-center">
          
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6 text-emerald-400 mint-glow">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-white">Verify it's you</h2>
          <p className="text-xs text-slate-400 mt-2">
            Enter the 6-digit code from your authenticator app or hardware passkey.
          </p>

          <form onSubmit={handleVerify} className="mt-8 space-y-6">
            <div className="flex justify-between gap-2">
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  id={`mfa-pg-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-2xl bg-slate-900 border border-slate-700 text-emerald-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:outline-none transition-all"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Pixel 9 Bound
              </span>
              <span>
                Code refreshes in <strong className="text-emerald-400">{timer}s</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Code...
                </>
              ) : (
                "Verify & Continue to Dashboard"
              )}
            </button>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  addToast({
                    type: "info",
                    title: "SMS Backup Sent",
                    message: "A emergency fallback OTP has been dispatched to +94 77 *** 4567.",
                  });
                }}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
              >
                <Key className="w-3.5 h-3.5" /> Send SMS Backup Code Instead
              </button>
            </div>
          </form>

        </div>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
