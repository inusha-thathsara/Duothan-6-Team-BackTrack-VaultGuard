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
import { Key, ArrowRight, ShieldAlert, CheckCircle2, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

function RecoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [emailInput, setEmailInput] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSentMsg, setEmailSentMsg] = useState("");

  const [manualToken, setManualToken] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [showOperatorInfo, setShowOperatorInfo] = useState(false);
  const token = tokenParam || manualToken;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setIsSendingEmail(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      const body = await res.json();
      setIsSendingEmail(false);

      if (res.ok && body.success) {
        setEmailSent(true);
        setEmailSentMsg(`Recovery link and security verification token dispatched to ${emailInput} via Resend Email Gateway.`);
      } else {
        setErrorMsg(body.error || "Failed to dispatch recovery email.");
      }
    } catch {
      setIsSendingEmail(false);
      setErrorMsg("Network error. Please try again.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
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
            <CardTitle>Account Recovery &amp; Email Verification</CardTitle>
            <CardDescription>
              Verify your identity via email to recover password and reset 2FA factors.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {success ? (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <h4 className="font-semibold text-sm">Account Successfully Recovered!</h4>
                <p className="leading-relaxed text-muted-foreground">
                  Your password has been updated and active 2FA factors have been cleared. You can now log in using your new credentials.
                </p>
                <Button onClick={() => router.push("/login")} className="w-full mt-2" size="sm">
                  Proceed to Sign In <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            ) : token ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {errorMsg}
                  </div>
                )}

                <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-xs text-cyan-400/90 font-mono break-all">
                  <span className="font-sans font-semibold text-foreground block mb-0.5">Verification Token:</span>
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

                <div className="text-center pt-2 flex justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setManualToken(""); router.push("/recovery"); }}
                    aria-label="Change email or token"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Change Email / Token
                  </button>
                  <Link href="/login" className="text-muted-foreground hover:text-foreground">
                    Sign In
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {errorMsg}
                  </div>
                )}

                {emailSent ? (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-400" />
                      <div>
                        <p className="font-semibold text-foreground">Recovery Email Sent!</p>
                        <p className="mt-1 leading-relaxed">{emailSentMsg}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label htmlFor="tokenPaste" className="text-xs uppercase tracking-wider">
                        Received Token? Enter Below:
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="tokenPaste"
                          placeholder="Paste token from email"
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value.trim())}
                          className="font-mono text-xs"
                        />
                        <Button disabled={!manualToken} onClick={() => {}} className="shrink-0 text-xs">
                          Continue
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendEmail} className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter your registered email address to verify identity and receive an automated recovery link via Resend Email Gateway.
                    </p>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs uppercase tracking-wider">
                        Registered Account Email
                      </Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          required
                          placeholder="alex.perera@vaultguard.bank"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="pl-9"
                        />
                        <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <Button type="submit" disabled={isSendingEmail} className="w-full">
                      {isSendingEmail ? "Dispatching Email..." : "Send Email Recovery Link"}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </form>
                )}

                {!showManualInput && !emailSent && (
                  <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      aria-label="Toggle token input"
                      className="text-primary hover:underline"
                    >
                      Have a token? Enter manually
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOperatorInfo(!showOperatorInfo)}
                      aria-label="Toggle operator authorization info"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Operator assistance
                    </button>
                  </div>
                )}

                {showManualInput && !emailSent && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <Label htmlFor="manualInput" className="text-xs uppercase tracking-wider">
                      Enter Security / Recovery Token
                    </Label>
                    <Input
                      id="manualInput"
                      placeholder="Paste recovery token"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value.trim())}
                      className="font-mono text-xs"
                    />
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => setShowManualInput(false)}>
                        Back
                      </Button>
                      <Button size="sm" disabled={!manualToken} onClick={() => {}}>
                        Verify Token <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {showOperatorInfo && (
                  <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5 text-amber-300">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Operator Assistance Option</span>
                    </div>
                    <p className="leading-relaxed">
                      If you cannot access your email, contact Support at <strong>operator@vaultguard.bank</strong> to issue an operator token.
                    </p>
                  </div>
                )}

                <div className="text-center pt-2">
                  <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
                  </Link>
                </div>
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
