"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import {
  Shield,
  Lock,
  Server,
  Zap,
  ArrowRight,
  ShieldCheck,
  Activity,
  Key,
  Layers,
  Database,
  Radio,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"flow" | "architecture">("flow");

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Cyber Glow Background Elements */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Hero Text */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ZERO-TRUST DIGITAL BANKING PLATFORM</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                  Rebuild the Future. <br />
                  <span className="gradient-text">Defend the Digital World.</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-light leading-relaxed">
                  After the 2065 global malware event, trusted digital finance returns with <strong className="text-white font-medium">VaultGuard</strong> — an independent, attack-isolated microservices platform powered by zero-trust identity and Cloud KMS.
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 transition-all shadow-xl mint-glow flex items-center justify-center gap-2"
                  >
                    <span>Launch Customer App</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </Link>

                  <Link
                    href="/enroll"
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>Identity Recovery (FR-01)</span>
                  </Link>
                </div>

                {/* Stat Badges */}
                <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-800/80">
                  <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">≤ 15m</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">RPO Target</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">≤ 4h</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">RTO Regional DR</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                    <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">6</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">Isolated Domains</span>
                  </div>
                </div>
              </div>

              {/* Right Interactive Posture Card (Matches Figure 2 from Wireframes) */}
              <div className="lg:col-span-5">
                <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative">
                  <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                        Post-Attack System Posture
                      </h3>
                      <p className="text-lg font-bold text-white mt-0.5">VaultGuard Resiliency Controls</p>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  </div>

                  <div className="space-y-4 my-6">
                    {/* Card 1: Zero-trust */}
                    <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">Zero-Trust Identity Layer</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            MFA challenge · Hardware Passkey · Cloud KMS Master Key protection
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Isolated Services */}
                    <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">Independent Microservices</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Auth · Accounts · Payments · Loans · Pub/Sub Notifications · Immutable Audit
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Disaster Recovery */}
                    <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">Disaster Recovery by Design</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Read-Only degraded fallback (FR-08) · RPO ≤ 15m · Regional failover
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">GCP Architecture: Cloud Run + PostgreSQL</span>
                    <Link href="/status" className="text-emerald-400 font-semibold hover:underline">
                      View Live Status →
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ARCHITECTURE & DATA FLOW VISUALIZER SECTION */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-950/60 border-y border-slate-800/80">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                System Architecture & Domain Blueprint
              </span>
              <h2 className="text-3xl font-extrabold text-white mt-4">
                Designed so no single failure brings down finance
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Explore how VaultGuard isolates transactional domains and routes async events.
              </p>
            </div>

            {/* Microservice Architecture Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Auth Microservice</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Handles user login, TOTP MFA challenges, trusted-device fingerprinting, and Cloud KMS signing key issuance.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-emerald-400">
                  Database: Private Auth DB
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Accounts Microservice</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Manages customer balances, statements, and profiles. Operates in read-only mode during Payments service maintenance (FR-08).
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-cyan-400">
                  Database: `accounts_db` (Isolated)
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Payments & Saga Bus</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Processes transfers, bill payments, and idempotent ledger entries (FR-13). Publishes events to Pub/Sub outbox.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-amber-400">
                  Database: `payments_db` + Outbox
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* CTA STRIP */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto glass-panel p-10 rounded-3xl border border-emerald-500/30 mint-border-glow">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Ready to experience the production-grade VaultGuard application?
            </h2>
            <p className="text-sm text-slate-300 mt-3 max-w-xl mx-auto">
              Test all 22 functional requirements, step-up MFA, degraded mode simulation, loan repayments, and support operator tools.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-3.5 rounded-xl gradient-mint text-slate-950 font-bold text-sm hover:opacity-95 transition-all shadow-lg"
              >
                Go to Customer Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
