"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import {
  Shield,
  Activity,
  LayoutDashboard,
  Send,
  CreditCard,
  History,
  Landmark,
  ShieldCheck,
  UserCheck,
  Menu,
  X,
  LogOut,
  SlidersHorizontal,
  UserCircle
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    logout,
    activeRole,
    switchRole,
    isPaymentsDegraded,
    togglePaymentsDegraded,
    servicesHealth,
  } = useVaultGuard();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transfer", label: "Transfer", icon: Send },
    { href: "/bill-pay", label: "Bill Pay", icon: CreditCard },
    { href: "/history", label: "History", icon: History },
    { href: "/loans", label: "Loans", icon: Landmark },
    { href: "/security", label: "Security", icon: ShieldCheck },
    { href: "/status", label: "System Status", icon: Activity },
    ...(activeRole === "SUPPORT_OPERATOR"
      ? [{ href: "/operator", label: "Operator Tools", icon: UserCheck }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl gradient-mint flex items-center justify-center text-slate-950 font-bold shadow-lg mint-glow group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-white group-hover:text-emerald-400 transition-colors">
                  VAULTGUARD
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  REBUILD 2065
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Zero-Trust Digital Banking
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="hidden sm:flex items-center gap-3">
            
            {/* System Health Badge */}
            <Link
              href="/status"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isPaymentsDegraded
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isPaymentsDegraded ? "bg-amber-400" : "bg-emerald-400 animate-ping"
                }`}
              />
              <span>{isPaymentsDegraded ? "Payments Degraded" : "Systems Healthy"}</span>
            </Link>

            {/* Quick Degraded Simulator Toggle Button */}
            <button
              onClick={togglePaymentsDegraded}
              title="FR-08 Degraded Mode Simulator (Toggle Payments Outage)"
              className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
                isPaymentsDegraded
                  ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
                  : "bg-slate-800/60 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Simulate Outage</span>
            </button>

            {/* Role Switcher Pill (FR-05) */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold">
              <button
                onClick={() => switchRole("CUSTOMER")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeRole === "CUSTOMER"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Customer
              </button>
              <button
                onClick={() => switchRole("SUPPORT_OPERATOR")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeRole === "SUPPORT_OPERATOR"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Operator
              </button>
            </div>

            {/* User Profile / Login Button */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="text-right text-xs">
                  <span className="font-semibold text-white block">{user.fullName}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">ID: {user.nationalId}</span>
                </div>
                <button
                  onClick={logout}
                  title="Secure Logout (FR-04)"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl gradient-mint text-slate-950 font-bold text-xs hover:opacity-95 transition-all shadow-md"
              >
                Secure Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-900 text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Role: {activeRole}</span>
            <button
              onClick={() => {
                switchRole(activeRole === "CUSTOMER" ? "SUPPORT_OPERATOR" : "CUSTOMER");
              }}
              className="text-emerald-400 font-semibold underline"
            >
              Switch to {activeRole === "CUSTOMER" ? "Operator" : "Customer"}
            </button>
          </div>

          <button
            onClick={togglePaymentsDegraded}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-500/40 text-xs font-medium flex items-center justify-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {isPaymentsDegraded ? "Restore Payments Service" : "Simulate Payments Outage (FR-08)"}
          </button>

          {user && (
            <button
              onClick={logout}
              className="w-full py-2.5 text-center text-rose-400 bg-rose-500/10 rounded-xl text-xs font-semibold"
            >
              Secure Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
};
