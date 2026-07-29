"use client";

import React, { useState } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Tablet,
  Key,
  Lock,
  UserCheck,
  AlertOctagon,
  CheckCircle2,
  Trash2,
  MapPin,
  Clock
} from "lucide-react";

export default function SecurityPage() {
  const { trustedDevices, revokeDevice, securityEvents, addToast } = useVaultGuard();

  const [primaryEmail, setPrimaryEmail] = useState("alex.perera@vaultguard.bank");
  const [recoveryPhone, setRecoveryPhone] = useState("+94 77 123 4567");

  const handleUpdateRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: "success",
      title: "Recovery Contacts Updated",
      message: "Encrypted recovery payload stored in Auth service secret manager.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Security & Recovery Settings</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Zero-Trust identity management, trusted devices, & immutable security activity (FR-03, FR-18, FR-19)
          </p>
        </div>

        {/* TOP CARDS GRID (Matches Wireframe Figure 9) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Trusted Devices List Card (FR-03) */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Trusted Devices (FR-03)</h3>
              </div>
              <span className="text-xs text-slate-400">{trustedDevices.filter(d => d.status === "ACTIVE").length} Active Devices</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {trustedDevices.map((dev) => (
                <div key={dev.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                      {dev.deviceLabel.includes("Pixel") ? (
                        <Smartphone className="w-5 h-5 text-emerald-400" />
                      ) : dev.deviceLabel.includes("MacBook") ? (
                        <Laptop className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <Tablet className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{dev.deviceLabel}</h4>
                        {dev.isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                            Active Now
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{dev.location}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-slate-500">{dev.ipAddress}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {dev.status === "ACTIVE" ? (
                      !dev.isCurrent && (
                        <button
                          onClick={() => revokeDevice(dev.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revoke
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-slate-500 italic">Revoked Token</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery Contacts Form Card */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-4">Recovery Contacts</h3>
              <form onSubmit={handleUpdateRecovery} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Recovery Email</label>
                  <input
                    type="email"
                    required
                    value={primaryEmail}
                    onChange={(e) => setPrimaryEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recovery Phone Number</label>
                  <input
                    type="text"
                    required
                    value={recoveryPhone}
                    onChange={(e) => setRecoveryPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
                >
                  Save Recovery Contacts
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
              Emergency recovery codes are encrypted with HSM Cloud KMS dual-control ceremony keys.
            </div>
          </div>

        </div>

        {/* RECENT SECURITY EVENTS FEED (Matches Wireframe Figure 9 & FR-18) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Recent Security Activity (FR-18)</h3>
              <p className="text-xs text-slate-400">Personal security activity feed (login, device, password events)</p>
            </div>
            <span className="text-xs text-emerald-400 font-mono">Append-Only Immutable</span>
          </div>

          <div className="divide-y divide-slate-800/60 my-2">
            {securityEvents.map((evt) => (
              <div key={evt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{evt.action}</h4>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                      <span>{evt.device}</span>
                      <span>•</span>
                      <span>{evt.location}</span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono text-[11px] text-slate-400">
                  <span>{evt.timestamp}</span>
                  <span className="block text-slate-500">{evt.ip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
