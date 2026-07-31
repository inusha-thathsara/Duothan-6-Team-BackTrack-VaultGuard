"use client";

import React, { useState } from "react";
import { useVaultGuard } from "@/context/VaultGuardContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DegradedBanner } from "@/components/common/DegradedBanner";
import { ToastContainer } from "@/components/common/ToastContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck, Smartphone, Laptop, Tablet, MapPin, CheckCircle2, Trash2
} from "lucide-react";

export default function SecurityPage() {
  const { trustedDevices, revokeDevice, securityEvents, addToast } = useVaultGuard();
  const [primaryEmail, setPrimaryEmail] = useState("alex.perera@vaultguard.bank");
  const [recoveryPhone, setRecoveryPhone] = useState("+94 77 123 4567");

  const handleUpdateRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({ type: "success", title: "Recovery Contacts Updated", message: "Encrypted recovery payload stored in secret manager." });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <DegradedBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Security &amp; Device Controls</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Zero-trust identity management, active device sessions, and security event log.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Trusted Devices */}
          <Card className="lg:col-span-7">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  <CardTitle>Trusted Devices</CardTitle>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {trustedDevices.filter((d) => d.status === "ACTIVE").length} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {trustedDevices.map((dev) => (
                  <div key={dev.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground">
                        {dev.deviceLabel.includes("Pixel") ? <Smartphone className="w-4 h-4" /> :
                         dev.deviceLabel.includes("MacBook") ? <Laptop className="w-4 h-4" /> :
                         <Tablet className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold">{dev.deviceLabel}</h3>
                          {dev.isCurrent && <Badge variant="secondary" className="text-[10px]">Current Device</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{dev.location}</span>
                          <span>·</span>
                          <span className="font-mono">{dev.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                    {dev.status === "ACTIVE" && !dev.isCurrent ? (
                      <Button variant="destructive" size="xs" onClick={() => revokeDevice(dev.id)}>
                        <Trash2 className="w-3 h-3" /> Revoke
                      </Button>
                    ) : dev.status !== "ACTIVE" ? (
                      <span className="text-xs text-muted-foreground italic">Revoked</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recovery Contacts */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Recovery Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateRecovery} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider">Primary Recovery Email</Label>
                  <Input type="email" required value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider">Recovery Mobile Number</Label>
                  <Input value={recoveryPhone} onChange={(e) => setRecoveryPhone(e.target.value)} required className="font-mono" />
                </div>
                <Button type="submit" variant="outline" className="w-full">Save Recovery Contacts</Button>
              </form>
              <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border">
                Recovery keys stored in Cloud KMS with zero-trust challenge authentication.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Security Event Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Security Event Log</CardTitle>
                <CardDescription>Immutable identity and session audit events</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">Append-Only</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {securityEvents.map((evt) => (
                <div key={evt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted border border-border text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{evt.action}</h3>
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                        <span>{evt.device}</span>
                        <span>·</span>
                        <span>{evt.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono text-[11px] text-muted-foreground">
                    <span>{evt.timestamp}</span>
                    <span className="block text-muted-foreground/60">{evt.ip}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
