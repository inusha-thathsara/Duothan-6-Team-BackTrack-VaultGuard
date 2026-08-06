"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/common/ToastContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Separator } from "@/components/ui/separator";
import { Shield, Lock, CheckCircle2, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useVaultGuard();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const result = await login(email, password);
      setIsLoading(false);
      if (result.success) {
        if (result.requiresMfa) {
          router.push("/mfa");
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        setErrorMsg("Invalid credentials. Please verify your email and password.");
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-12 overflow-hidden my-8 rounded-xl ring-1 ring-border">

          {/* Left Brand Panel */}
          <div className="md:col-span-5 bg-muted/40 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
            <div>
              <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground mb-5">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Sign In</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Access your zero-trust digital banking dashboard.
              </p>
            </div>

            <div className="space-y-2.5 my-6">
              {[
                "Zero-Trust Session Sign-In",
                "HSM Hardware Key Encryption",
                "Step-Up Challenge Security",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-foreground" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border text-[11px] text-muted-foreground font-mono">
              VaultGuard Identity Gateway v1.0
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="md:col-span-7 p-6 sm:p-8 bg-card flex flex-col justify-center">
            <div className="mb-5 flex justify-between items-start">
              <div>
                <h3 className="text-base font-semibold text-foreground">Enter Credentials</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Use your Customer ID or Email</p>
              </div>
              <Link href="/enroll" className="text-xs text-primary hover:underline">
                New User? Enroll
              </Link>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider">
                  Customer ID or Email
                </Label>
                <Input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@vaultguard.bank"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wider">
                    Password
                  </Label>
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full mt-2">
                {isLoading ? "Authenticating..." : "Continue to MFA Challenge"}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Separator />
              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3" />
                Protected by TLS 1.3 &amp; Cloud Armor
              </p>
            </form>
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
