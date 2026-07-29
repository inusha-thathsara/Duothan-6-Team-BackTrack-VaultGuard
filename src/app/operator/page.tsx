"use client";

import React, { useState } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import {
  UserCheck,
  Search,
  ShieldAlert,
  FileText,
  Lock,
  User,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function OperatorPage() {
  const { activeRole, switchRole, addToast } = useVaultGuard();

  const [lookupQuery, setLookupQuery] = useState("941820491V");
  const [accessReason, setAccessReason] = useState("Customer requested support for post-malware re-enrollment verification.");
  const [customerRecord, setCustomerRecord] = useState<any | null>(null);
  const [accessAuditLogs, setAccessAuditLogs] = useState<any[]>([]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeRole !== "SUPPORT_OPERATOR") {
      addToast({
        type: "error",
        title: "Access Denied (FR-05)",
        message: "Operator portal requires SUPPORT_OPERATOR role. Please toggle role in top bar.",
      });
      return;
    }

    if (!accessReason || accessReason.length < 10) {
      addToast({
        type: "warning",
        title: "Attributable Reason Required (NFR-O3)",
        message: "Please enter a valid justification for querying customer PII.",
      });
      return;
    }

    setCustomerRecord({
      fullName: "Alex Perera",
      nationalId: "941820491V",
      email: "alex.perera@vaultguard.bank",
      accounts: [
        { type: "SAVINGS", accNo: "**** 4821", balance: 428650.0, status: "ACTIVE" },
        { type: "CHECKING", accNo: "**** 9102", balance: 125000.0, status: "ACTIVE" },
      ],
      mfaStatus: "ENROLLED (TOTP + Hardware Passkey)",
      lastLogin: "2026-07-29 10:14:02 (Pixel 9 Pro)",
    });

    const newLog = {
      id: `audit_${Date.now()}`,
      operator: "op_sarah_support",
      targetId: "941820491V",
      reason: accessReason,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      kmsSig: "KMS-SIG-8F9A-B342",
    };

    setAccessAuditLogs((prev) => [newLog, ...prev]);

    addToast({
      type: "success",
      title: "Attributable Access Logged (FR-22, NFR-O3)",
      message: "Customer record accessed. Immutable audit entry appended to BigQuery.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050b14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Support Operator Tools</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Customer profile lookup with full attributable audit logging (FR-05, FR-22, NFR-O3)
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Active Role: {activeRole}
          </div>
        </div>

        {activeRole !== "SUPPORT_OPERATOR" && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span>You are currently in <strong>Customer View Mode</strong>. Switch to <strong>Support Operator Role</strong> in top navbar to test FR-22 lookup tools.</span>
            </div>
            <button
              onClick={() => switchRole("SUPPORT_OPERATOR")}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-bold shrink-0"
            >
              Switch to Operator
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Lookup Form Panel */}
          <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
            <h3 className="text-base font-bold text-white">Customer Profile Lookup (FR-22)</h3>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">National ID / Email / Account #</label>
                <input
                  type="text"
                  required
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="e.g. 941820491V"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Access Justification / Case Reason (NFR-O3)
                </label>
                <textarea
                  required
                  rows={3}
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  placeholder="Enter required reason for accessing customer PII..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" /> Perform Audited Lookup
              </button>
            </form>
          </div>

          {/* Customer Profile Result Panel */}
          <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-4">Read-Scoped Customer Profile</h3>
              
              {customerRecord ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Full Legal Name:</span>
                      <strong className="text-white">{customerRecord.fullName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">National ID:</span>
                      <strong className="font-mono text-cyan-400">{customerRecord.nationalId}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-slate-300">{customerRecord.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Security Posture:</span>
                      <span className="text-emerald-400 font-semibold">{customerRecord.mfaStatus}</span>
                    </div>
                  </div>

                  <h4 className="font-semibold text-white">Associated Accounts</h4>
                  <div className="space-y-2 font-mono">
                    {customerRecord.accounts.map((acc: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                        <span>{acc.type} ({acc.accNo})</span>
                        <strong className="text-white">LKR {acc.balance.toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Enter a customer identifier and justification reason to perform a read-scoped operator query.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ATTRIBUTABLE ACCESS AUDIT LOG (NFR-O3) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Attributable Access Audit Log (NFR-O3)</h3>
              <p className="text-xs text-slate-400">Every operator query is signed with who, when, and why reason.</p>
            </div>
            <span className="text-xs text-cyan-400 font-mono">BigQuery Mirror</span>
          </div>

          <div className="divide-y divide-slate-800/60 my-2 font-mono text-xs">
            {accessAuditLogs.length === 0 ? (
              <div className="py-6 text-center text-slate-500 font-sans">
                No operator searches performed in this session.
              </div>
            ) : (
              accessAuditLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-cyan-400 font-bold">{log.operator}</span> queried <span className="text-white font-bold">{log.targetId}</span>
                    <span className="block text-slate-400 text-[11px] font-sans mt-0.5">Reason: "{log.reason}"</span>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <span>{log.timestamp}</span>
                    <span className="block text-emerald-400">{log.kmsSig}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
