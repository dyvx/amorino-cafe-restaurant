"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AmorinoLogo } from "./AmorinoLogo";
import { UserRole, SessionUser } from "@/lib/auth";
import { Lock, Shield, ChefHat, ClipboardList, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface StaffAuthGateProps {
  allowedRoles: UserRole[];
  portalTitle: string;
  portalSubtitle: string;
  defaultQuickRole: UserRole;
  children: (
    user: SessionUser,
    logout: () => Promise<void>,
    quickSwitch: (role: UserRole) => Promise<void>
  ) => React.ReactNode;
}

export function StaffAuthGate({
  allowedRoles,
  portalTitle,
  portalSubtitle,
  defaultQuickRole,
  children,
}: StaffAuthGateProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const checkSession = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data.user && allowedRoles.includes(data.user.role)) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, [allowedRoles]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials.");
        setSubmitting(false);
        return;
      }
      if (!allowedRoles.includes(data.user.role)) {
        setError(
          `Your account role (${data.user.role}) does not have access to ${portalTitle}. Required: ${allowedRoles.join(
            " / "
          )}.`
        );
        setSubmitting(false);
        return;
      }
      setUser(data.user);
    } catch {
      setError("Authentication request failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRoleLogin = async (role: UserRole) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickRole: role }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      } else {
        setError(data.error || "Unable to sign in.");
      }
    } catch {
      setError("Network error while signing in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-obsidian text-crema flex flex-col items-center justify-center p-6">
        <AmorinoLogo size={72} className="animate-pulse mb-4 border border-gold/30" />
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-gold">
          Verifying Hospitality Credentials…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-obsidian text-crema flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-umber border border-gold/30 rounded-2xl p-6 sm:p-8 shadow-luxury space-y-6">
          <div className="text-center space-y-2">
            <AmorinoLogo
              size={84}
              ringGlow
              className="mx-auto border border-gold/35 mb-3"
            />
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold block">
              AMORINO CAFE &amp; RESTAURANT • KENYA
            </span>
            <h1 className="font-serif text-3xl text-crema">{portalTitle}</h1>
            <p className="text-xs text-champagne">{portalSubtitle}</p>
          </div>

          {/* Instant One-Click Authorized Role Access */}
          <div className="p-4 rounded-xl bg-obsidian border border-gold/25 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold">
                Authorized One-Click Portal Access
              </span>
              <Lock className="w-3.5 h-3.5 text-gold" />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickRoleLogin(defaultQuickRole)}
              className="w-full py-3 px-4 rounded-xl bg-gold hover:bg-gold-light text-obsidian font-semibold text-xs uppercase tracking-[0.16em] transition shadow-gold-glow flex items-center justify-center gap-2"
            >
              <span>Enter {portalTitle} ({defaultQuickRole})</span>
            </button>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickRoleLogin("ADMIN")}
                className="py-2 px-2 rounded-lg bg-umber hover:bg-roast border border-gold/20 text-[10px] font-mono text-champagne hover:text-gold flex items-center justify-center gap-1 transition"
              >
                <Shield className="w-3 h-3 text-gold" />
                <span>ADMIN</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickRoleLogin("STAFF")}
                className="py-2 px-2 rounded-lg bg-umber hover:bg-roast border border-gold/20 text-[10px] font-mono text-champagne hover:text-gold flex items-center justify-center gap-1 transition"
              >
                <ClipboardList className="w-3 h-3 text-gold" />
                <span>STAFF</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickRoleLogin("KITCHEN")}
                className="py-2 px-2 rounded-lg bg-umber hover:bg-roast border border-gold/20 text-[10px] font-mono text-champagne hover:text-gold flex items-center justify-center gap-1 transition"
              >
                <ChefHat className="w-3 h-3 text-gold" />
                <span>KITCHEN</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gold/15" />
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-widest text-taupe">
              Or Sign In with Credentials
            </span>
            <div className="flex-grow border-t border-gold/15" />
          </div>

          {/* Standard Email + Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-champagne mb-1.5">
                Staff Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@amorino.co.ke"
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-gold/20 focus:border-gold text-xs text-crema focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-champagne mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian border border-gold/20 focus:border-gold text-xs text-crema focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-terracotta-bg border border-terracotta/50 text-terracotta-light text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-roast hover:bg-gold hover:text-obsidian border border-gold/35 text-gold-light font-semibold text-xs uppercase tracking-[0.18em] transition"
            >
              {submitting ? "Signing In…" : "Sign In"}
            </button>
          </form>

          <div className="pt-2 border-t border-gold/15 text-center">
            <Link
              href="/order?table=T12"
              className="inline-flex items-center gap-1.5 text-xs text-champagne hover:text-gold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Customer Table Menu (Table 12)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(user, handleLogout, handleQuickRoleLogin)}</>;
}
