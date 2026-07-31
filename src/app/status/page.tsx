"use client";

import React from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { SlidersHorizontal } from "lucide-react";

export default function StatusPage() {
  const { servicesHealth, isPaymentsDegraded, togglePaymentsDegraded } =
    useVaultGuard();

  const overallOk = servicesHealth.every((s) => s.status === "OPERATIONAL");

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">System Status</h1>
            <p className={`text-xs mt-0.5 font-medium ${overallOk ? "text-muted-foreground" : "text-amber-400"}`}>
              {overallOk ? "All systems operational" : "Partial degradation detected"}
            </p>
          </div>

          <button
            onClick={togglePaymentsDegraded}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isPaymentsDegraded
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {isPaymentsDegraded ? "Restore Service" : "Simulate Outage"}
          </button>
        </div>

        {/* Services Table */}
        <div className="bg-[#111726] rounded-xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">Service</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">Latency</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">Uptime</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {servicesHealth.map((svc, i) => {
                const isOk = svc.status === "OPERATIONAL";
                return (
                  <tr
                    key={svc.id}
                    className={`${i < servicesHealth.length - 1 ? "border-b border-slate-800/40" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-white">{svc.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-300">
                      {svc.latency}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-300">
                      {svc.uptime}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                          isOk ? "text-muted-foreground" : "text-amber-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOk ? "bg-foreground/40" : "bg-amber-400 animate-pulse"
                          }`}
                        />
                        {isOk ? "Operational" : "Degraded"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Last checked */}
        <p className="text-xs text-slate-600 text-center">
          Updated in real-time · {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>

      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}

