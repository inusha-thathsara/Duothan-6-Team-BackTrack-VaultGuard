"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/common/ToastContainer";
import { Shield, Key, CheckCircle2, UserCheck, Smartphone, Lock, ArrowRight, RefreshCw } from "lucide-react";

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
      addToast({
        type: "success",
        title: "Backup Identity Record Matched",
        message: "Found verified 2065 snapshot for Alex Perera (941820491V). Proceeding to MFA re-enrollment.",
      });
      setStep(2);
    }, 800);
  };

  const handleSetMfa = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      addToast({
        type: "success",
        title: "TOTP & Password Enrolled",
        message: "Cloud KMS ceremony generated new signing keys. Binding device next.",
      });
      setStep(3);
    }, 800);
  };

  const handleFinalize = () => {
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      addToast({
        type: "success",
        title: "Re-Enrollment Complete (FR-01)",
        message: "VaultGuard identity restored. Access granted to digital banking platform.",
      });
      router.push("/dashboard");
    }, 900);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl w-full glass-panel rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl relative my-8">
          
          <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">First-Time Identity Recovery (FR-01)</h2>
              <p className="text-xs text-slate-400">Verify surviving 2065 backup records & enroll new security keys</p>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-3 gap-2 my-8">
            <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? "bg-emerald-400 mint-glow" : "bg-slate-800"}`} />
            <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? "bg-emerald-400 mint-glow" : "bg-slate-800"}`} />
            <div className={`h-1.5 rounded-full transition-all ${step >= 3 ? "bg-emerald-400 mint-glow" : "bg-slate-800"}`} />
          </div>

          {/* Step 1: Backup Record Verification */}
          {step === 1 && (
            <form onSubmit={handleVerifyIdentity} className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                <strong className="text-emerald-400 block font-semibold mb-1">Post-Malware Recovery Protocol:</strong>
                Enter your National Identity Card number to cross-reference with the restored backup snapshot database.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  National ID (NIC) / Account Reference
                </label>
                <input
                  type="text"
                  required
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="941820491V"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Perera"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Cross-Referencing Snapshots...
                  </>
                ) : (
                  <>
                    Verify Identity Record <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Password & MFA Setup */}
          {step === 2 && (
            <form onSubmit={handleSetMfa} className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Identity Verified: <strong>Alex Perera</strong> (Account #**** 4821)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Set New VaultGuard Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" /> TOTP Authenticator Enrollment
                </h4>
                <p className="text-xs text-slate-400">
                  Scan QR code with Google Authenticator or 1Password to generate TOTP secret.
                </p>
                <div className="mt-3 p-3 bg-slate-950 rounded-lg text-center font-mono text-xs text-emerald-400 tracking-widest border border-slate-800">
                  VG65 - M3KR - 9912 - REBUILD - ZERO - TRUST
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isVerifying ? "Engaging Cloud KMS Ceremony..." : "Confirm Credentials & Next"}
              </button>
            </form>
          )}

          {/* Step 3: Device Binding */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                <Smartphone className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Bind Current Device</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Bind this device fingerprint to your zero-trust session to bypass step-up MFA for low-risk actions (FR-03).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Device Fingerprint:</span>
                  <span className="font-mono text-white">Pixel 9 Pro (Linux Android 15)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP Location:</span>
                  <span className="text-white">192.168.1.104 (Colombo, LK)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Master Key Authority:</span>
                  <span className="text-emerald-400 font-mono">Cloud KMS HSM Level-3</span>
                </div>
              </div>

              <button
                onClick={handleFinalize}
                disabled={isVerifying}
                className="w-full py-3.5 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Binding Device Token...
                  </>
                ) : (
                  "Finalize Identity Recovery & Launch App"
                )}
              </button>
            </div>
          )}

        </div>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
