"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import {
  Lock,
  Zap,
  ArrowRight,
  ShieldCheck,
  Activity,
  Key,
  Layers,
  Database,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground ">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 border border-border text-muted-foreground text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-Trust Financial Architecture</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
                Institutional-Grade Digital Banking
              </h1>

              <p className="text-sm sm:text-base text-foreground/80 max-w-xl leading-relaxed">
                VaultGuard delivers isolated microservices banking infrastructure powered by zero-trust identity verification, step-up MFA, and real-time ledger resilience.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  href="/dashboard"
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>Open Customer Console</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/enroll"
                  className="px-5 py-2.5 rounded-lg bg-muted/50 hover:bg-slate-800 border border-border text-slate-200 font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Key className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Account Recovery</span>
                </Link>
              </div>

              {/* SLA Highlights Bar */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
                <div className="p-3 rounded-lg bg-card border border-border">
                  <span className="text-lg font-bold font-mono text-muted-foreground">≤ 15m</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">RPO Target</span>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border">
                  <span className="text-lg font-bold font-mono text-slate-200">≤ 4h</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Regional RTO</span>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border">
                  <span className="text-lg font-bold font-mono text-muted-foreground">6</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Isolated Domains</span>
                </div>
              </div>
            </div>

            {/* Right Resiliency Posture Card */}
            <div className="lg:col-span-5">
              <div className="bg-card rounded-xl p-6 border border-border shadow-md">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      System Security Posture
                    </span>
                    <h2 className="text-base font-bold text-foreground mt-0.5">VaultGuard Resiliency Controls</h2>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-foreground/40" />
                </div>

                <div className="space-y-3 my-5">
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded bg-primary/10 text-muted-foreground mt-0.5">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-xs">Zero-Trust Identity Layer</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Step-up MFA challenges, hardware passkey verification, and Cloud KMS master key protection.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded bg-slate-800 text-foreground/80 mt-0.5">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-xs">Domain Isolation</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Decoupled microservices for Auth, Accounts, Payments, Loans, and Immutable Audit.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded bg-amber-500/10 text-amber-400 mt-0.5">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-xs">Graceful Degradation</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Automatic read-only fallback during service maintenance to guarantee availability.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">PostgreSQL + Cloud Run Architecture</span>
                  <Link href="/status" className="text-muted-foreground font-medium hover:underline text-[11px]">
                    View Infrastructure Status →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* DOMAIN BLUEPRINT SECTION */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 bg-background/40 border-y border-border">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-8">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                System Blueprint
              </span>
              <h2 className="text-2xl font-bold text-foreground mt-1">
                Isolated Financial Microservices
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Each domain operates independently to eliminate single points of failure across transactions.
              </p>
            </div>

            {/* Service Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              <div className="bg-card p-5 rounded-xl border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center text-muted-foreground mb-3">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Auth Microservice</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Authenticates sessions, manages TOTP MFA verification, and issues cryptographically signed JWT tokens.
                </p>
                <div className="mt-4 pt-3 border-t border-border/60 text-[11px] font-mono text-muted-foreground">
                  Database: Isolated Auth DB
                </div>
              </div>

              <div className="bg-card p-5 rounded-xl border border-border">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 mb-3">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Accounts Microservice</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Maintains savings, checking, and fixed deposit balances with statement generation and read-only fallback mode.
                </p>
                <div className="mt-4 pt-3 border-t border-border/60 text-[11px] font-mono text-muted-foreground">
                  Database: accounts_db
                </div>
              </div>

              <div className="bg-card p-5 rounded-xl border border-border">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">Payments Microservice</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Executes transfers and bill payments using idempotent outbox transactions and saga events.
                </p>
                <div className="mt-4 pt-3 border-t border-border/60 text-[11px] font-mono text-amber-400">
                  Database: payments_db + Saga Bus
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
          <div className="bg-card p-8 rounded-xl border border-border">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Experience the VaultGuard Digital Banking Platform
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              Test wire transfers, bill payments, credit facilities, step-up MFA, and outage simulation.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground font-medium text-xs sm:text-sm transition-colors"
              >
                Go to Dashboard
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

