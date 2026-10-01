"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { StaffAuthGate } from "@/components/StaffAuthGate";
import { AmorinoLogo } from "@/components/AmorinoLogo";
import Link from "next/link";
import {
  Flame,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  ClipboardList,
  LayoutDashboard,
  Utensils,
  LogOut,
  Check,
  AlertTriangle,
} from "lucide-react";

export default function KitchenDisplayPage() {
  return (
    <StaffAuthGate
      allowedRoles={["ADMIN", "STAFF", "KITCHEN"]}
      portalTitle="Kitchen Display System (KDS)"
      portalSubtitle="High-contrast culinary production board for Tablet, TV, and Kitchen Stations."
      defaultQuickRole="KITCHEN"
    >
      {(user, logout) => <KitchenDisplayContent user={user} logout={logout} />}
    </StaffAuthGate>
  );
}

function KitchenDisplayContent({
  logout,
}: {
  user: any;
  logout: () => Promise<void>;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [mobileColumn, setMobileColumn] = useState<
    "NEW" | "PREPARING" | "READY" | "ALL"
  >("ALL");

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events");
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (
            payload.type === "ORDER_CREATED" ||
            payload.type === "ORDER_UPDATED"
          ) {
            fetchOrders();
          }
        } catch {}
      };
    } catch {}

    const poll = setInterval(fetchOrders, 5000);
    return () => {
      if (es) es.close();
      clearInterval(poll);
    };
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: number, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchOrders();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const newOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "ACCEPTED")
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [orders]
  );

  const preparingOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "PREPARING")
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [orders]
  );

  const readyOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "READY")
        .sort(
          (a, b) =>
            new Date(b.ready_at || b.created_at).getTime() -
            new Date(a.ready_at || a.created_at).getTime()
        ),
    [orders]
  );

  const pendingFloorCount = useMemo(
    () => orders.filter((o) => o.status === "PENDING").length,
    [orders]
  );

  return (
    <div className="min-h-screen bg-[#050403] text-crema flex flex-col select-none">
      {/* High-Contrast Minimal KDS Header */}
      <header className="bg-obsidian border-b-2 border-gold/25 px-3.5 sm:px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <AmorinoLogo size={40} className="border border-gold/40 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm sm:text-xl font-bold tracking-wider uppercase text-crema truncate">
                  AMORINO KDS
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sage-bg border border-sage text-sage-light text-[10px] sm:text-xs font-mono font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage animate-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] font-mono text-champagne truncate">
                {new Date(nowTick).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Right Quick Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {pendingFloorCount > 0 && (
              <Link
                href="/staff"
                className="hidden md:flex px-3 py-2 rounded-xl bg-saffron-bg border border-saffron text-saffron-light text-xs font-mono font-bold items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{pendingFloorCount} Waiting Staff</span>
              </Link>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-umber hover:bg-roast border border-gold/25 text-xs font-mono text-gold-light flex items-center gap-1.5"
              title="Toggle Fullscreen TV Mode"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
              <span className="hidden md:inline">TV Mode</span>
            </button>

            <Link
              href="/staff"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-umber hover:bg-roast border border-gold/20 text-xs font-mono text-champagne hover:text-crema flex items-center gap-1.5"
              title="Staff Console"
            >
              <ClipboardList className="w-4 h-4 text-gold" />
              <span className="hidden sm:inline">Staff</span>
            </Link>

            <Link
              href="/admin"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-umber hover:bg-roast border border-gold/20 text-xs font-mono text-champagne hover:text-crema flex items-center gap-1.5"
              title="Admin Suite"
            >
              <LayoutDashboard className="w-4 h-4 text-gold" />
              <span className="hidden sm:inline">Admin</span>
            </Link>

            <Link
              href="/order?table=T12"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-umber hover:bg-roast border border-gold/20 text-xs font-mono text-champagne hover:text-crema flex items-center gap-1.5"
              title="Customer Menu"
            >
              <Utensils className="w-4 h-4 text-gold" />
              <span className="hidden sm:inline">Menu</span>
            </Link>

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-umber hover:bg-terracotta-bg border border-gold/15 text-champagne hover:text-terracotta-light"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Column Switcher Tabs (< lg screens) */}
        <div className="lg:hidden grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-gold/15">
          {[
            { id: "ALL", label: "ALL", count: newOrders.length + preparingOrders.length + readyOrders.length },
            { id: "NEW", label: "NEW", count: newOrders.length },
            { id: "PREPARING", label: "PREP", count: preparingOrders.length },
            { id: "READY", label: "READY", count: readyOrders.length },
          ].map((col) => {
            const active = mobileColumn === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setMobileColumn(col.id as any)}
                className={`py-2 px-2 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 border ${
                  active
                    ? "bg-gold text-obsidian border-gold"
                    : "bg-umber text-champagne border-gold/20"
                }`}
              >
                <span>{col.label}</span>
                <span className="px-1.5 py-0.2 rounded bg-black/25 text-[11px]">
                  {col.count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* THREE HIGH-CONTRAST COLUMNS: NEW | PREPARING | READY */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 p-3.5 sm:p-5 overflow-x-hidden">
        {/* COLUMN 1: NEW (ACCEPTED) */}
        <section
          className={`${
            mobileColumn === "ALL" || mobileColumn === "NEW"
              ? "flex"
              : "hidden lg:flex"
          } flex-col bg-obsidian/90 rounded-2xl border-2 border-gold/30 overflow-hidden`}
        >
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-umber border-b-2 border-gold/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-gold" />
              <h2 className="font-mono text-lg sm:text-xl font-bold tracking-widest uppercase text-crema">
                NEW
              </h2>
            </div>
            <span className="px-3 py-1 rounded-lg bg-gold text-obsidian font-mono text-sm sm:text-base font-extrabold">
              {newOrders.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 space-y-4 flex-1 overflow-y-auto">
            {newOrders.length === 0 ? (
              <div className="py-12 sm:py-16 text-center text-taupe font-mono text-sm">
                No new accepted tickets in queue.
              </div>
            ) : (
              newOrders.map((order) => (
                <KdsOrderCard
                  key={order.id}
                  order={order}
                  nowTick={nowTick}
                  busy={updatingId === order.id}
                  primaryActionLabel="START PREPARING"
                  onPrimaryAction={() =>
                    handleUpdateStatus(order.id, "PREPARING")
                  }
                  accent="gold"
                />
              ))
            )}
          </div>
        </section>

        {/* COLUMN 2: PREPARING */}
        <section
          className={`${
            mobileColumn === "ALL" || mobileColumn === "PREPARING"
              ? "flex"
              : "hidden lg:flex"
          } flex-col bg-obsidian/90 rounded-2xl border-2 border-saffron/45 overflow-hidden`}
        >
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-saffron-bg border-b-2 border-saffron/45 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-saffron-light" />
              <h2 className="font-mono text-lg sm:text-xl font-bold tracking-widest uppercase text-crema">
                PREPARING
              </h2>
            </div>
            <span className="px-3 py-1 rounded-lg bg-saffron text-obsidian font-mono text-sm sm:text-base font-extrabold">
              {preparingOrders.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 space-y-4 flex-1 overflow-y-auto">
            {preparingOrders.length === 0 ? (
              <div className="py-12 sm:py-16 text-center text-taupe font-mono text-sm">
                No orders currently on the line.
              </div>
            ) : (
              preparingOrders.map((order) => (
                <KdsOrderCard
                  key={order.id}
                  order={order}
                  nowTick={nowTick}
                  busy={updatingId === order.id}
                  primaryActionLabel="MARK READY"
                  onPrimaryAction={() => handleUpdateStatus(order.id, "READY")}
                  accent="saffron"
                />
              ))
            )}
          </div>
        </section>

        {/* COLUMN 3: READY */}
        <section
          className={`${
            mobileColumn === "ALL" || mobileColumn === "READY"
              ? "flex"
              : "hidden lg:flex"
          } flex-col bg-obsidian/90 rounded-2xl border-2 border-sage/50 overflow-hidden`}
        >
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-sage-bg border-b-2 border-sage/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-sage-light" />
              <h2 className="font-mono text-lg sm:text-xl font-bold tracking-widest uppercase text-crema">
                READY
              </h2>
            </div>
            <span className="px-3 py-1 rounded-lg bg-sage text-obsidian font-mono text-sm sm:text-base font-extrabold">
              {readyOrders.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 space-y-4 flex-1 overflow-y-auto">
            {readyOrders.length === 0 ? (
              <div className="py-12 sm:py-16 text-center text-taupe font-mono text-sm">
                No orders waiting at pass.
              </div>
            ) : (
              readyOrders.map((order) => (
                <KdsOrderCard
                  key={order.id}
                  order={order}
                  nowTick={nowTick}
                  busy={updatingId === order.id}
                  primaryActionLabel="COMPLETE / BUMP"
                  onPrimaryAction={() =>
                    handleUpdateStatus(order.id, "COMPLETED")
                  }
                  accent="sage"
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function KdsOrderCard({
  order,
  nowTick,
  busy,
  primaryActionLabel,
  onPrimaryAction,
  accent,
}: {
  order: any;
  nowTick: number;
  busy: boolean;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  accent: "gold" | "saffron" | "sage";
}) {
  const startTimeMs = new Date(
    order.preparing_at || order.accepted_at || order.created_at
  ).getTime();
  const elapsedSeconds = Math.max(
    0,
    Math.floor((nowTick - startTimeMs) / 1000)
  );
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const formattedTimer = `${String(mins).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;

  const targetMins = Number(order.estimated_prep_minutes || 15);
  const isOverdue = order.status !== "READY" && mins >= targetMins;

  return (
    <article
      className={`rounded-2xl bg-umber border-2 p-4 sm:p-5 space-y-4 shadow-luxury ${
        isOverdue
          ? "border-terracotta"
          : accent === "saffron"
          ? "border-saffron/60"
          : accent === "sage"
          ? "border-sage/60"
          : "border-gold/45"
      }`}
    >
      {/* Top Row: #1024 | TABLE 12 | Live Timer */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-gold/15 pb-3.5">
        <div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-crema leading-none">
            #{order.order_number}
          </div>
          <div className="mt-1.5 inline-block px-3 py-1 rounded-lg bg-gold text-obsidian font-mono text-sm sm:text-base font-extrabold tracking-wider">
            TABLE {order.table_code.replace(/^T0?/, "")}
          </div>
        </div>

        {/* Live Preparation Timer + Order Time */}
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold border ${
              isOverdue
                ? "bg-terracotta-bg border-terracotta text-terracotta-light animate-pulse"
                : "bg-obsidian border-gold/30 text-gold-light"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formattedTimer}</span>
          </div>
          <div className="text-xs font-mono text-champagne mt-1.5">
            {new Date(order.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* Large Readable Items & Customizations */}
      <div className="space-y-3.5">
        {(order.items || []).map((item: any) => (
          <div
            key={item.id}
            className="pb-3 border-b border-gold/10 last:border-none last:pb-0"
          >
            <div className="text-base sm:text-xl font-bold text-crema leading-snug">
              <span className="font-mono text-gold mr-2">
                {item.quantity} ×
              </span>
              {item.item_name}
            </div>

            {item.customizations?.length > 0 && (
              <div className="mt-1.5 pl-6 space-y-1">
                {item.customizations.map((c: any) => {
                  const isNegative = c.option_name
                    .toLowerCase()
                    .startsWith("no ");
                  return (
                    <div
                      key={c.id}
                      className={`font-mono text-sm sm:text-base font-semibold ${
                        isNegative ? "text-terracotta-light" : "text-gold-light"
                      }`}
                    >
                      {isNegative ? `- ${c.option_name}` : `+ ${c.option_name}`}
                    </div>
                  );
                })}
              </div>
            )}

            {item.special_note && (
              <div className="mt-2 ml-6 p-2.5 rounded-lg bg-saffron-bg border border-saffron/60 text-saffron-light font-mono text-xs sm:text-sm font-bold">
                Special note: {item.special_note}
              </div>
            )}
          </div>
        ))}

        {order.customer_note && (
          <div className="p-3 rounded-xl bg-saffron-bg border-2 border-saffron/70 text-saffron-light font-mono text-xs sm:text-sm font-bold">
            <span className="block uppercase text-[10px] opacity-80">
              Special note:
            </span>
            {order.customer_note}
          </div>
        )}
      </div>

      {/* Large Fast Action Button */}
      <button
        disabled={busy}
        onClick={onPrimaryAction}
        className={`w-full min-h-[48px] py-3.5 sm:py-4 px-5 rounded-xl font-mono text-sm sm:text-base font-extrabold uppercase tracking-wider transition active:scale-[0.99] flex items-center justify-center gap-2 ${
          accent === "gold"
            ? "bg-gold hover:bg-gold-light text-obsidian"
            : accent === "saffron"
            ? "bg-saffron hover:bg-saffron-light text-obsidian"
            : "bg-sage hover:bg-sage-light text-obsidian"
        }`}
      >
        <Check className="w-5 h-5 stroke-[3]" />
        <span>{busy ? "UPDATING…" : primaryActionLabel}</span>
      </button>
    </article>
  );
}
