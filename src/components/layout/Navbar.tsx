"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useVaultGuard } from "@/context/VaultGuardContext";
import {
  Shield,
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
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, isPaymentsDegraded } = useVaultGuard();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOperator = user?.role === "SUPPORT_OPERATOR";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transfer", label: "Transfer", icon: Send },
    { href: "/bill-pay", label: "Bill Pay", icon: CreditCard },
    { href: "/history", label: "History", icon: History },
    { href: "/loans", label: "Loans", icon: Landmark },
    { href: "/security", label: "Security", icon: ShieldCheck },
    ...(isOperator
      ? [{ href: "/operator", label: "Operator", icon: UserCheck }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 border-b border-border backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary/80/20 transition-colors">
              <Shield className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">
              VaultGuard
            </span>
            <span className="hidden md:inline-block text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-slate-700/80">
              Enterprise
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-primary/10 text-foreground/70 border border-border"
                      : "text-muted-foreground hover:text-white hover:bg-muted/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">

            {/* System Health — links to Status */}
            <Link
              href="/status"
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                isPaymentsDegraded
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-muted/50 text-muted-foreground border-border hover:text-foreground hover:border-slate-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPaymentsDegraded ? "bg-amber-400 animate-pulse" : "bg-foreground/40"
                }`}
              />
              {isPaymentsDegraded ? "Degraded" : "All Systems"}
            </Link>

            {/* User Role Badge */}
            {user && (
              <div className="px-2.5 py-1 rounded-md bg-muted/50 border border-border text-[11px] font-mono text-muted-foreground">
                Role: <strong className="text-foreground">{user.role || "CUSTOMER"}</strong>
              </div>
            )}

            {/* User / Logout */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <span className="text-xs font-medium text-foreground/80 hidden xl:block">
                  {user.fullName.split(" ")[0]}
                </span>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-rose-400 hover:bg-muted/80 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/80 text-white font-medium text-xs transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="flex lg:hidden p-2 rounded-lg bg-muted/50 border border-border text-foreground/80 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-[#090d16] px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium ${
                    isActive
                      ? "bg-primary/10 text-foreground/70 border border-border"
                      : "bg-muted/50 text-muted-foreground border border-border"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {user && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border text-xs">
              <span className="text-muted-foreground">
                Role: <span className="text-white font-medium">{user.role}</span>
              </span>
            </div>
          )}

          {user && (
            <button
              onClick={logout}
              className="w-full py-2 text-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-medium"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
};
