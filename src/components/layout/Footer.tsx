"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-border bg-background text-muted-foreground text-xs py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-6 border-b border-border/60">
          
          {/* Brand Col */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground tracking-tight">VaultGuard</span>
              <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded bg-primary/10">v1.0</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Zero-trust digital banking platform with domain isolation and hardware key security.
            </p>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SOC2 Type II Compliant</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground uppercase text-[10px] tracking-wider">
              Banking Services
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Customer Dashboard</Link></li>
              <li><Link href="/transfer" className="hover:text-foreground transition-colors">Instant Wire Transfer</Link></li>
              <li><Link href="/bill-pay" className="hover:text-foreground transition-colors">Bill Payments</Link></li>
              <li><Link href="/loans" className="hover:text-foreground transition-colors">Credit Facilities</Link></li>
            </ul>
          </div>

          {/* SLAs & Metrics */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground uppercase text-[10px] tracking-wider">
              Service Level Objectives
            </h4>
            <ul className="space-y-1 text-[11px]">
              <li className="flex justify-between text-muted-foreground">
                <span>RPO Target</span>
                <span className="font-mono text-muted-foreground">≤ 15m</span>
              </li>
              <li className="flex justify-between text-muted-foreground">
                <span>Regional RTO</span>
                <span className="font-mono text-muted-foreground">≤ 4h</span>
              </li>
              <li className="flex justify-between text-muted-foreground">
                <span>Read Latency</span>
                <span className="font-mono text-muted-foreground">&lt; 50ms</span>
              </li>
            </ul>
          </div>

          {/* Architecture */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground uppercase text-[10px] tracking-wider">
              Security Infrastructure
            </h4>
            <div className="flex flex-wrap gap-1 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-muted/50 border border-border text-foreground/80">Isolated Microservices</span>
              <span className="px-2 py-0.5 rounded bg-muted/50 border border-border text-foreground/80">KMS Encryption</span>
              <span className="px-2 py-0.5 rounded bg-muted/50 border border-border text-foreground/80">Step-Up Auth</span>
              <span className="px-2 py-0.5 rounded bg-muted/50 border border-border text-foreground/80">Immutable Audit Bus</span>
            </div>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 VaultGuard Digital Banking Systems. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/status" className="hover:text-muted-foreground transition-colors">Infrastructure Status</Link>
            <Link href="/security" className="hover:text-muted-foreground transition-colors">Security Controls</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

