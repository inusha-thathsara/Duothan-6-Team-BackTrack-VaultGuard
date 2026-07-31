"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/common/ToastContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Key, CheckCircle2, Smartphone, ArrowRight, RefreshCw, Lock } from "lucide-react";

export default function EnrollPage() {
  const router = useRouter();
  const { addToast } = useVaultGuard();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nationalId, setNationalId] = useState("941820491V");
  const [fullName, setFullName] = useState("Alex Perera");
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      addToast({ type: "success", title: "Identity Verified", message: "Found record for Alex Perera. Proceeding to security setup." });
      setStep(2);
    }, 600);
  };

  const handleSetMfa = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      addToast({ type: "success", title: "TOTP Enrolled", message: "Generated signing keys. Binding trusted device." });
      setStep(3);
    }, 600);
  };

  const handleFinalize = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      addToast({ type: "success", title: "Enrollment Complete", message: "Identity re-enrolled. Access granted." });
      router.push("/dashboard");
    }, 700);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-xl w-full my-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center">
                <Key className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <CardTitle>Account Re-Enrollment</CardTitle>
                <CardDescription>Verify national identity &amp; setup hardware keys</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress bar */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1 rounded-full transition-all ${step >= s ? "bg-foreground/60" : "bg-border"}`} />
              ))}
            </div>

            <Separator />

            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleVerifyIdentity} className="space-y-4">
                <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted border border-border">
                  Enter your National Identity Card (NIC) number to cross-reference with our database.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">National ID (NIC)</Label>
                  <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="941820491V" required className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Full Legal Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Perera" required />
                </div>
                <Button type="submit" disabled={isVerifying} className="w-full">
                  {isVerifying ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...</> : <>Verify Identity <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form onSubmit={handleSetMfa} className="space-y-4">
                <div className="p-3 rounded-lg bg-muted border border-border text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-foreground" />
                  <span className="text-muted-foreground">Identity Matched: <strong className="text-foreground">Alex Perera</strong></span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">New Account Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 12 characters" required />
                </div>
                <div className="p-3.5 rounded-lg bg-muted/50 border border-border space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" /> TOTP Authenticator Key
                  </div>
                  <p className="text-[11px] text-muted-foreground">Scan with Google Authenticator or 1Password.</p>
                  <div className="p-2 bg-background rounded text-center font-mono text-xs tracking-wider border border-border">
                    VG65-M3KR-9912-ZERO-TRUST
                  </div>
                </div>
                <Button type="submit" disabled={isVerifying} className="w-full">
                  {isVerifying ? "Enrolling Security Keys..." : "Save Credentials"}
                </Button>
              </form>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center mx-auto">
                  <Smartphone className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Bind Current Device</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Save device fingerprint to bypass step-up MFA for low-risk actions.</p>
                </div>
                <div className="p-3.5 rounded-lg bg-muted/50 border border-border text-left text-xs space-y-1.5 font-mono">
                  {[["Device Fingerprint", "Pixel 9 Pro (Android 15)"], ["IP Location", "192.168.1.104 (Colombo)"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}:</span>
                      <span className="text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handleFinalize} disabled={isVerifying} className="w-full">
                  {isVerifying ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Binding Device...</> : "Finalize Enrollment & Launch Dashboard"}
                </Button>
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
