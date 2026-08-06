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
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [manualToken, setManualToken] = useState("");
  const token = tokenParam || manualToken;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const body = await res.json();
      setIsLoading(false);

      if (res.ok && body.success) {
        setSuccess(true);
      } else {
        setErrorMsg(body.error || "Failed to reset password. Please check token.");
      }
    } catch {
      setIsLoading(false);
      setErrorMsg("Network error. Please try again.");
    }
  };

  return (
    <Card className="max-w-md w-full my-8">
      <CardHeader>
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
          <Lock className="w-5 h-5" />
        </div>
        <CardTitle>Reset Your Password</CardTitle>
        <CardDescription>
          Enter your reset authorization token and create a new secure password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center space-y-3">
            <ShieldCheck className="w-8 h-8 mx-auto text-emerald-400" />
            <h4 className="font-semibold text-sm">Password Updated!</h4>
            <p>Your password has been successfully updated. You may now sign in with your new credentials.</p>
            <Button onClick={() => router.push("/login")} className="w-full mt-2" size="sm">
              Proceed to Login <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            {!tokenParam && (
              <div className="space-y-1.5">
                <Label htmlFor="token" className="text-xs uppercase tracking-wider">
                  Reset Token
                </Label>
                <Input
                  id="token"
                  type="text"
                  required
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste reset token from email"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs uppercase tracking-wider">
                New Password
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
              {isLoading ? "Updating..." : "Reset Password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Suspense fallback={<div className="text-center text-sm">Loading reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}

