"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/common/ToastContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Key, ArrowRight, ShieldAlert, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

function RecoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [manualToken, setManualToken] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const token = tokenParam || manualToken;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg("Recovery token is required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const body = await res.json();
      setIsLoading(false);

      if (res.ok && body.success) {
        setSuccess(true);
      } else {
        setErrorMsg(body.error || "Failed to recover account. The token may be invalid or expired.");
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
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
              <Key className="w-5 h-5" />
            </div>
            <CardTitle>Zero-Trust Account Recovery</CardTitle>
            <CardDescription>
              Recover your password and reset your multi-factor credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <h4 className="font-semibold text-sm">Account Recovered!</h4>
                <p>
                  Your credentials have been updated and all active 2FA factors have been cleared. 
                  You can now log in using your new password. You will be prompted to register a new 2FA device.
                </p>
                <Button onClick={() => router.push("/login")} className="w-full mt-2" size="sm">
                  Proceed to Sign In <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            ) : token ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {errorMsg}
                  </div>
                )}

                <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-xs text-cyan-400/90 font-mono break-all">
                  <span className="font-sans font-semibold text-foreground block mb-0.5">Active Token:</span>
                  {token}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs uppercase tracking-wider">
                    New Secure Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Recovering Account..." : "Reset Password & Clear MFA"}
                </Button>

                {tokenParam && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <div className="space-y-5">
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 text-amber-300">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                    <span>Operator Authorization Required</span>
                  </div>
                  <p className="leading-relaxed">
                    To maintain strict zero-trust security compliance, customers cannot initiate self-service account recovery.
                  </p>
                  <p className="leading-relaxed">
                    Please contact a Support Operator at <strong>operator@vaultguard.bank</strong> to verify your identity. The operator will then generate and dispatch a secure recovery token.
                  </p>
                </div>

                {!showManualInput ? (
                  <div className="space-y-2">
                    <Button onClick={() => setShowManualInput(true)} variant="outline" className="w-full text-xs">
                      Enter Recovery Token Manually
                    </Button>
                    <Link href="/login" className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors">
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to Sign In
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div className="space-y-1.5">
                      <Label htmlFor="manualToken" className="text-xs uppercase tracking-wider">
                        Enter Security Recovery Token
                      </Label>
                      <Input
                        id="manualToken"
                        type="text"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value.trim())}
                        placeholder="Paste token provided by operator"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowManualInput(false)} variant="outline" className="w-1/3 text-xs">
                        Back
                      </Button>
                      <Button onClick={() => {}} disabled={!manualToken} className="w-2/3 text-xs">
                        Verify Token
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}

export default function RecoveryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="text-center text-muted-foreground">Loading Account Recovery...</div>
        </main>
        <Footer />
      </div>
    }>
      <RecoveryContent />
    </Suspense>
  );
}
