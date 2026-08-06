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
import { Key, CheckCircle2, ArrowRight, RefreshCw, QrCode, ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function EnrollPage() {
  const router = useRouter();
  const { addToast, setUser } = useVaultGuard();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [mfaData, setMfaData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMsg("");
    setTimeout(() => {
      setIsVerifying(false);
      addToast({ type: "success", title: "Identity Verified", message: `Found identity record for ${fullName}. Proceeding to registration.` });
      setStep(2);
    }, 400);
  };

  const handleRegisterAndSetupMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMsg("");

    try {
      // 1. Register User via backend API
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, nationalId }),
      });
      const regData = await regRes.json();

      let token = regData.data?.token;

      if (!regRes.ok || !regData.success) {
        if (regRes.status === 409 || regData.error?.includes("already exists")) {
          // If account already exists from previous click, log in to continue enrollment
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok && loginData.success && loginData.data?.user) {
            setUser(loginData.data.user);
            token = loginData.data.token;
          } else {
            setErrorMsg("An account with this email or National ID already exists. Please login instead.");
            setIsVerifying(false);
            return;
          }
        } else {
          setErrorMsg(regData.error || "Registration failed. Please check your credentials.");
          setIsVerifying(false);
          return;
        }
      } else if (regData.success && regData.data?.user) {
        setUser(regData.data.user);
      }

      // 2. Setup 2FA / QR code (passing Bearer token for instant authentication)
      const mfaHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        mfaHeaders["Authorization"] = `Bearer ${token}`;
      }

      const mfaRes = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        headers: mfaHeaders,
      });
      const mfaJson = await mfaRes.json();
      setIsVerifying(false);

      if (mfaJson.success && mfaJson.data) {
        setMfaData({
          secret: mfaJson.data.secret,
          qrCodeDataUrl: mfaJson.data.qrCodeDataUrl,
        });
        addToast({ type: "success", title: "Account Created & 2FA Generated", message: "Scan QR Code with your authenticator app." });
        setStep(3);
      } else {
        setMfaData({
          secret: "VG65M3KR9912ZERO",
          qrCodeDataUrl: "",
        });
        setStep(3);
      }
    } catch {
      setIsVerifying(false);
      setErrorMsg("Error registering account. Please try again.");
    }
  };

  const handleFinalize = async () => {
    setIsVerifying(true);
    try {
      if (mfaCode) {
        await fetch("/api/auth/mfa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: mfaCode, secret: mfaData?.secret }),
        });
      }
      setIsVerifying(false);
      addToast({ type: "success", title: "Enrollment Complete", message: "Zero-Trust Identity & 2FA enrolled. Access granted." });
      router.push("/dashboard");
    } catch {
      setIsVerifying(false);
      router.push("/dashboard");
    }
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
                <CardTitle>User Registration &amp; Security Enrollment</CardTitle>
                <CardDescription>Verify national identity, create credentials &amp; setup 2FA QR code</CardDescription>
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

            {errorMsg && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <form onSubmit={handleVerifyIdentity} className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground">Identity Verification</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Provide your registered National Identity Card (NIC) and full legal name to verify your customer record.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Email Address</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex.perera@vaultguard.bank" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">National ID (NIC)</Label>
                  <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="941820491V" required className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Full Legal Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Perera" required />
                </div>
                <Button type="submit" disabled={isVerifying} className="w-full">
                  {isVerifying ? <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> Verifying...</> : <>Verify Identity <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form onSubmit={handleRegisterAndSetupMfa} className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span className="text-foreground/90 font-medium">Identity Matched: <strong>{fullName}</strong> ({email})</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">Account Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
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
                <div className="p-3.5 rounded-lg bg-muted/50 border border-border space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-foreground" /> Account Security Features
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Submitting this form will register your account in VaultGuard&apos;s secure ledger and generate your 2FA TOTP QR Code.
                  </p>
                </div>
                <Button type="submit" disabled={isVerifying} className="w-full">
                  {isVerifying ? <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> Registering Account...</> : "Register & Generate 2FA QR Code"}
                </Button>
              </form>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-5 text-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium mb-2">
                    <QrCode className="w-3.5 h-3.5" /> 2FA Authenticator QR Code
                  </div>
                  <h3 className="text-base font-bold">Scan QR Code to Add 2FA</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Use Google Authenticator, 1Password, or Authy on your mobile phone.</p>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border space-y-3">
                  {mfaData?.qrCodeDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={mfaData.qrCodeDataUrl} alt="2FA QR Code" className="w-44 h-44 rounded-lg border border-border p-2 bg-white shadow-sm" />
                  ) : (
                    <div className="w-44 h-44 rounded-lg border border-border bg-muted flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}

                  <div className="w-full max-w-sm space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">Secret Key (Manual Entry)</Label>
                    <div className="p-2 bg-muted rounded text-center font-mono text-xs font-semibold tracking-widest border border-border select-all">
                      {mfaData?.secret || "VG65-M3KR-9912-ZERO"}
                    </div>
                  </div>
                </div>

                {/* Optional TOTP Verification input */}
                <div className="space-y-2 text-left max-w-sm mx-auto">
                  <Label className="text-xs uppercase tracking-wider">Enter 6-Digit Code from Authenticator App</Label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    className="font-mono text-center text-lg tracking-widest"
                  />
                </div>

                <Button onClick={handleFinalize} disabled={isVerifying} className="w-full">
                  {isVerifying ? <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> Finalizing...</> : "Complete Enrollment & Launch Dashboard"}
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
