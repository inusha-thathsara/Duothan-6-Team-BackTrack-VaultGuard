"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/common/ToastContainer";
import { Shield, Lock, ShieldCheck, Key, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, addToast } = useVaultGuard();
  const [email, setEmail] = useState("alex.perera@vaultguard.bank");
  const [password, setPassword] = useState("••••••••••••");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(async () => {
      const ok = await login(email, password);
      setIsLoading(false);
      if (ok) {
        router.push("/mfa");
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-0 glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-8">
          
          {/* Left Dark Brand Panel (Wireframe Figure 3) */}
          <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-[#071325] p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
            <div>
              <div className="w-12 h-12 rounded-2xl gradient-mint flex items-center justify-center text-slate-950 font-bold mb-6 mint-glow">
                <Shield className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome back</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Sign in to restore your secure banking session on top of restored customer backups.
              </p>
            </div>

            <div className="space-y-4 my-8">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero-Trust Identity Verification</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hardware HSM Key Encryption</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cloud Armor WAF Rate Limiting</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-500">
              Post-Attack Rebuild · VaultGuard Security Fabric
            </div>
          </div>

          {/* Right Login Form Panel */}
          <div className="md:col-span-7 p-8 sm:p-10 bg-slate-950/80 flex flex-col justify-center">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Secure Sign In</h3>
              <p className="text-xs text-slate-400 mt-1">Enter your Customer ID or Email address</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Customer ID or Email
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.perera@vaultguard.bank"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <Link href="/enroll" className="text-xs text-emerald-400 hover:underline">
                    First-Time Re-Enrollment?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? "Authenticating Session..." : "Continue to MFA Challenge"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Security Badges Footer */}
              <div className="pt-6 mt-6 border-t border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected by Identity Platform · TLS 1.3 · Cloud Armor</span>
              </div>
            </form>
          </div>

        </div>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
