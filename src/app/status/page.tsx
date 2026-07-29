"use client";

import React from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Server,
  Cloud,
  Clock,
  ShieldCheck
} from "lucide-react";

export default function StatusPage() {
  const { servicesHealth, isPaymentsDegraded, togglePaymentsDegraded } = useVaultGuard();

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">System Status & Ops Transparency</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Transparent health for post-disaster trust — independent service indicators (FR-20)
            </p>
          </div>

          <button
            onClick={togglePaymentsDegraded}
            className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
              isPaymentsDegraded
                ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
                : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {isPaymentsDegraded ? "Restore Payments Service" : "Simulate Payments Outage (FR-08)"}
          </button>
        </div>

        {/* 6 MICROSERVICES STATUS CARDS GRID (Matches Wireframe Figure 10) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesHealth.map((svc) => (
            <div
              key={svc.id}
              className={`glass-panel p-6 rounded-3xl border transition-all ${
                svc.status === "OPERATIONAL"
                  ? "border-slate-800 hover:border-emerald-500/30"
                  : "border-amber-500/40 bg-amber-950/20"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-base">{svc.name}</h3>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      svc.status === "OPERATIONAL" ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"
                    }`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      svc.status === "OPERATIONAL" ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {svc.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">{svc.description}</p>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Latency: <strong className="text-white">{svc.latency}</strong></span>
                <span>Uptime: <strong className="text-emerald-400">{svc.uptime}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* DEGRADED MODE POLICY CARD (Matches Wireframe Figure 10 bottom card) */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 text-emerald-100 bg-emerald-950/10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Degraded Mode Policy (FR-08)</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                If Payments is unavailable or under maintenance, Accounts stays read-only. Transfers queue or reject cleanly — never a silent total outage. Circuit breakers and API Gateway timeouts prevent cascading failures across GCP Cloud Run services.
              </p>
            </div>
          </div>
        </div>

      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
