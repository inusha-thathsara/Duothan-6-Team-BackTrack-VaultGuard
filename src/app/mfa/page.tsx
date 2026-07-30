"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/common/ToastContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Smartphone, RefreshCw, Key } from "lucide-react";

export default function MfaPage() {
  const router = useRouter();
  const { addToast } = useVaultGuard();
  const [code, setCode] = useState(["1", "3", "5", "7", "9", "2"]);
  const [timer, setTimer] = useState(45);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 60)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) document.getElementById(`mfa-pg-input-${index + 1}`)?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.join("") }),
      });

      setIsVerifying(false);

      if (res.ok) {
        addToast({ type: "success", title: "MFA Verified", message: "Identity token issued. Welcome to VaultGuard." });
        router.push("/dashboard");
      } else {
        addToast({ type: "error", title: "Verification Failed", message: "Invalid or expired TOTP code." });
      }
    } catch {
      setIsVerifying(false);
      addToast({ type: "error", title: "Network Error", message: "Failed to connect to authentication server." });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-muted border border-border flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Security Verification</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
            </div>

            <Separator />

            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex justify-center gap-2">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`mfa-pg-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    className="w-10 h-12 text-center text-xl font-bold rounded-lg bg-input border border-border text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 transition-colors"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> Trusted Device
                </span>
                <span>Refreshes in <strong className="text-foreground font-mono">{timer}s</strong></span>
              </div>

              <Button type="submit" disabled={isVerifying} className="w-full">
                {isVerifying ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...</>
                ) : "Verify & Continue"}
              </Button>

              <button
                type="button"
                onClick={() => addToast({ type: "info", title: "SMS Code Sent", message: "A fallback code was dispatched to your mobile." })}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <Key className="w-3 h-3" /> Send SMS Code Instead
              </button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
