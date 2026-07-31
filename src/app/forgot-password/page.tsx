"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/common/ToastContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.success) {
        setResetSent(true);
        if (data.resetToken) {
          setResetToken(data.resetToken);
        }
      } else {
        setErrorMsg(data.error || "Failed to send reset link");
      }
    } catch {
      setIsLoading(false);
      setErrorMsg("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-md w-full my-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <CardTitle>Password Recovery</CardTitle>
                <CardDescription>Reset your zero-trust account credentials</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {resetSent ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Reset Link Dispatched</p>
                    <p className="mt-0.5 text-emerald-600/90 dark:text-emerald-400/90">
                      We sent recovery instructions to <strong>{email}</strong>. Please check your inbox.
                    </p>
                  </div>
                </div>

                {resetToken && (
                  <div className="p-3.5 rounded-lg bg-muted/60 border border-border space-y-2 text-xs">
                    <p className="font-medium text-foreground">Demo Testing Shortcut Token:</p>
                    <div className="p-2 bg-background rounded font-mono text-[11px] break-all border border-border select-all">
                      {resetToken}
                    </div>
                    <Link
                      href={`/reset-password?token=${resetToken}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs mt-1"
                    >
                      Proceed directly to Reset Password page <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                <Link href="/login" className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Enter your registered account email. We will send a secure single-use recovery token.
                </p>

                {errorMsg && (
                  <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider">
                    Registered Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="alex.perera@vaultguard.bank"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Dispatching Token..." : "Send Password Reset Link"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
