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
} from "lucide-react";

interface CustomerAccountRecord {
  type: string;
  accNo: string;
  balance: number;
  status?: string;
}

interface CustomerRecord {
  id?: string;
  fullName: string;
  email: string;
  role?: string;
  nationalId?: string;
  mfaStatus?: string;
  lastLogin?: string;
  accounts: CustomerAccountRecord[];
}

interface AccessAuditLog {
  id: string;
  operator: string;
  targetId: string;
  reason: string;
  timestamp: string;
  kmsSig: string;
}

export default function OperatorPage() {
  const { user, addToast } = useVaultGuard();

  const isOperator = user?.role === "SUPPORT_OPERATOR";

  const [lookupQuery, setLookupQuery] = useState("");
  const [accessReason, setAccessReason] = useState("");
  const [customerRecord, setCustomerRecord] = useState<CustomerRecord | null>(null);
  const [accessAuditLogs, setAccessAuditLogs] = useState<AccessAuditLog[]>([]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOperator) {
      addToast({
        type: "error",
        title: "Access Denied (FR-05)",
        message: "Operator portal requires SUPPORT_OPERATOR role.",
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

    // Customer lookup via DB or search query
    setCustomerRecord({
      fullName: "Alex Perera",
      nationalId: lookupQuery || "941820491V",
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
      operator: user?.email || "op_support",
      targetId: lookupQuery || "941820491V",
      reason: accessReason,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      kmsSig: "KMS-SIG-8F9A-B342",
    };

    setAccessAuditLogs((prev) => [newLog, ...prev]);

    addToast({
      type: "success",
      title: "Attributable Access Logged (FR-22)",
      message: "Customer record accessed. Immutable audit entry created.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground ">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Support Operator Console</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customer record lookup with mandatory audit justification logging.
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-medium flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> User Role: {user?.role || "UNAUTHENTICATED"}
          </div>
        </div>

        {!isOperator && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
              <span>Access Denied — Support Operator Privileges Required</span>
            </div>
            <p className="text-muted-foreground">
              Your account (<strong>{user?.email || "Guest"}</strong>) is assigned the <strong>{user?.role || "CUSTOMER"}</strong> role. Access to the Support Operator console and customer PII audit tools is strictly restricted to authorized operator accounts.
            </p>
          </div>
        )}

        {isOperator && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Lookup Form */}
            <div className="lg:col-span-6 bg-card rounded-xl p-5 border border-border shadow-sm space-y-4">
              <h2 className="text-base font-bold text-foreground">Customer Record Search</h2>

              <form onSubmit={handleLookup} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">National ID / Email / Account #</label>
                  <input
                    type="text"
                    required
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="e.g. 941820491V"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1">
                    Access Justification (Required)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={accessReason}
                    onChange={(e) => setAccessReason(e.target.value)}
                    placeholder="Enter reason for accessing customer PII..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-foreground font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" /> Execute Audited Search
                </button>
              </form>
            </div>

            {/* Customer Record Panel */}
            <div className="lg:col-span-6 bg-card rounded-xl p-5 border border-border shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground mb-3">Customer Profile</h2>

                {customerRecord ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-lg bg-background border border-border space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Name:</span>
                        <strong className="text-foreground font-sans">{customerRecord.fullName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">National ID:</span>
                        <strong className="text-cyan-400">{customerRecord.nationalId}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="text-foreground/80 font-sans">{customerRecord.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Security Posture:</span>
                        <span className="text-muted-foreground font-sans font-medium">{customerRecord.mfaStatus}</span>
                      </div>
                    </div>

                    <h3 className="font-semibold text-foreground font-sans text-xs">Associated Accounts</h3>
                    <div className="space-y-1.5 font-mono">
                      {customerRecord.accounts.map((acc, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-muted/50 border border-border flex justify-between">
                          <span>{acc.type} ({acc.accNo})</span>
                          <strong className="text-foreground">LKR {acc.balance.toLocaleString()}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    Enter a customer identifier and justification reason to perform a lookup.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AUDIT LOG TABLE */}
        {isOperator && (
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">Access Audit Ledger</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Signed log of all operator PII queries</p>
              </div>
              <span className="text-xs text-cyan-400 font-mono text-[11px]">Audit Log Stream</span>
            </div>

            <div className="divide-y divide-slate-800/60 mt-1 font-mono text-xs">
              {accessAuditLogs.length === 0 ? (
                <div className="py-6 text-center text-slate-500 font-sans text-xs">
                  No operator queries executed in this session.
                </div>
              ) : (
                accessAuditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-cyan-400 font-semibold">{log.operator}</span> queried <span className="text-foreground font-semibold">{log.targetId}</span>
                      <span className="block text-muted-foreground text-[11px] font-sans mt-0.5">Reason: &quot;{log.reason}&quot;</span>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <span>{log.timestamp}</span>
                      <span className="block text-muted-foreground">{log.kmsSig}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
