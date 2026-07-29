"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/90 text-slate-400 text-xs py-10 mt-auto backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-slate-800/60">
          
          {/* Col 1: Platform Overview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-wider">VAULTGUARD</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Post-cyberattack digital banking rebuild platform engineered with zero-trust architecture, domain isolation, and HSM key management.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-mono">
              <ShieldCheck className="w-4 h-4" /> Cloud KMS HSM Master Key Secured
            </div>
          </div>

          {/* Col 2: Microservice SLA Metrics */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white uppercase text-[11px] tracking-wider mb-3">
              Resilience & SLAs
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li className="flex items-center justify-between border-b border-slate-800/40 pb-1">
                <span className="text-slate-400">RPO Target</span>
                <span className="font-mono text-emerald-400">≤ 15 minutes</span>
              </li>
              <li className="flex items-center justify-between border-b border-slate-800/40 pb-1">
                <span className="text-slate-400">RTO Regional Failover</span>
                <span className="font-mono text-emerald-400">≤ 4 hours</span>
              </li>
              <li className="flex items-center justify-between border-b border-slate-800/40 pb-1">
                <span className="text-slate-400">Read Path p95 Latency</span>
                <span className="font-mono text-emerald-400">&lt; 500 ms</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">Audit Trail Retention</span>
                <span className="font-mono text-cyan-400">BigQuery Immutable</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Architecture Stack */}
          <div className="space-y-2">
            <h4 className="font-semibold text-white uppercase text-[11px] tracking-wider mb-3">
              Google Cloud Platform
            </h4>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Cloud Run Microservices
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Cloud SQL PostgreSQL
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Memorystore Redis
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Pub/Sub Event Bus
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Cloud Armor WAF
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Identity Platform
              </span>
            </div>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2065 VaultGuard Rebuild Project. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/status" className="hover:text-emerald-400 transition-colors">
              Microservice Status Page
            </Link>
            <Link href="/security" className="hover:text-emerald-400 transition-colors">
              Zero-Trust Audit Log
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
