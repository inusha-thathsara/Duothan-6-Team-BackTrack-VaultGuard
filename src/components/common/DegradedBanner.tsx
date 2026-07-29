"use client";

import React from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { ShieldAlert, RefreshCw } from "lucide-react";

export const DegradedBanner: React.FC = () => {
  const { isPaymentsDegraded, togglePaymentsDegraded } = useVaultGuard();

  if (!isPaymentsDegraded) return null;

  return (
    <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-amber-950/90 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 text-xs sm:text-sm shadow-inner backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>
            <strong className="font-semibold text-amber-100">FR-08 Outage Isolation Active:</strong> Payments Service is degraded. Accounts service remains fully available in <span className="underline decoration-amber-400 font-medium">Read-Only Mode</span>. Transfers & repayments are suspended.
          </span>
        </div>
        <button
          onClick={togglePaymentsDegraded}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 rounded-lg transition-all text-xs font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Restore Payments Service
        </button>
      </div>
    </div>
  );
};
