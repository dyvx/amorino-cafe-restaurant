"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { StaffAuthGate } from "@/components/StaffAuthGate";
import { AmorinoLogo } from "@/components/AmorinoLogo";
import Link from "next/link";
import {
  Check,
  X,
  Flame,
  Clock,
  CheckCircle2,
  ChefHat,
  LayoutDashboard,
  Utensils,
  Search,
  RefreshCw,
  LogOut,
  Bell,
} from "lucide-react";

export default function StaffDashboardPage() {
  return (
    <StaffAuthGate
      allowedRoles={["ADMIN", "STAFF"]}
      portalTitle="Staff Floor Console"
      portalSubtitle="Order acceptance, table service coordination, and realtime status control."
      defaultQuickRole="STAFF"
    >
      {(user, logout) => <StaffDashboardContent user={user} logout={logout} />}
    </StaffAuthGate>
  );
}

function StaffDashboardContent({
  user,
  logout,
}: {
  user: any;
  logout: () => Promise<void>;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [tableFilter, setTableFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // ignore transient network error
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

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
            fetchOrders(true);
          }
        } catch {}
      };
    } catch {}

    const interval = setInterval(() => fetchOrders(true), 6000);
    return () => {
      if (es) es.close();
      clearInterval(interval);
    };
  }, [fetchOrders]);

  const handleUpdateStatus = async (
    orderId: number,
    nextStatus: string,
    rejectionReason = ""
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, rejectionReason }),
      });
      if (res.ok) {
        await fetchOrders(true);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "PENDING"),
    [orders]
  );
  const acceptedOrders = useMemo(
    () => orders.filter((o) => o.status === "ACCEPTED"),
    [orders]
  );
  const preparingOrders = useMemo(
    () => orders.filter((o) => o.status === "PREPARING"),
    [orders]
  );
  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === "READY"),
    [orders]
  );

  const distinctTables = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => set.add(o.table_code));
    return Array.from(set).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter === "ACTIVE") {
        if (
          !["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
        ) {
          return false;
        }
      } else if (statusFilter !== "ALL" && o.status !== statusFilter) {
        return false;
      }

      if (tableFilter !== "ALL" && o.table_code !== tableFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = String(o.order_number).includes(q);
        const tblMatch = o.table_code.toLowerCase().includes(q);
        const itemMatch = (o.items || []).some((i: any) =>
          i.item_name.toLowerCase().includes(q)
        );
        return numMatch || tblMatch || itemMatch;
      }

      return true;
    });
  }, [orders, statusFilter, tableFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-obsidian text-crema flex flex-col">
      {/* Top Operational Bar */}
      <header className="sticky top-0 z-30 bg-espresso border-b border-gold/20 px-3.5 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <AmorinoLogo size={38} className="sm:w-10 sm:h-10 border border-gold/30 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-base sm:text-xl text-crema font-medium truncate">
                  Staff Floor Console
                </h1>
                <span className="px-2 py-0.5 rounded bg-gold/15 border border-gold/30 text-[10px] font-mono text-gold uppercase shrink-0">
                  {user.role}
                </span>
              </div>
              <p className="hidden sm:block text-xs text-champagne">
                Realtime Incoming Orders &amp; Table Service Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {pendingOrders.length > 0 && (
              <button
                onClick={() => setStatusFilter("PENDING")}
                className="hidden md:flex px-3.5 py-1.5 rounded-full bg-saffron-bg border border-saffron text-saffron-light text-xs font-mono font-bold items-center gap-2 animate-pulse"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{pendingOrders.length} Incoming Waiting</span>
              </button>
            )}

            <Link
              href="/order?table=T12"
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-umber hover:bg-roast border border-gold/20 text-xs text-champagne hover:text-crema flex items-center gap-1.5 transition"
              title="Customer Menu"
            >
              <Utensils className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-gold" />
              <span className="hidden sm:inline">Menu</span>
            </Link>

            <Link
              href="/kitchen"
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-umber hover:bg-roast border border-gold/20 text-xs text-champagne hover:text-crema flex items-center gap-1.5 transition"
              title="Kitchen Display"
            >
              <ChefHat className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-gold" />
              <span className="hidden sm:inline">Kitchen</span>
            </Link>

            <Link
              href="/admin"
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-umber hover:bg-roast border border-gold/20 text-xs text-champagne hover:text-crema flex items-center gap-1.5 transition"
              title="Admin Suite"
            >
              <LayoutDashboard className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-gold" />
              <span className="hidden sm:inline">Admin</span>
            </Link>

            <button
              onClick={logout}
              className="p-2 rounded-lg bg-umber hover:bg-terracotta-bg border border-gold/15 text-champagne hover:text-terracotta-light transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Incoming Alert Banner */}
        {pendingOrders.length > 0 && (
          <button
            onClick={() => setStatusFilter("PENDING")}
            className="md:hidden mt-2.5 w-full py-2 px-3 rounded-xl bg-saffron-bg border border-saffron text-saffron-light text-xs font-mono font-bold flex items-center justify-center gap-2"
          >
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>
              {pendingOrders.length} Incoming Order(s) Waiting Acceptance
            </span>
          </button>
        )}
      </header>

      {/* Quick KPI Strip & Filter Controls */}
      <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-5 flex-1 pb-16">
        {/* Status Summary Tabs (Horizontally scrollable on mobile, Grid on sm+) */}
        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            {
              id: "ACTIVE",
              label: "All Active",
              count:
                pendingOrders.length +
                acceptedOrders.length +
                preparingOrders.length +
                readyOrders.length,
              highlight: false,
            },
            {
              id: "PENDING",
              label: "Incoming",
              count: pendingOrders.length,
              highlight: pendingOrders.length > 0,
            },
            {
              id: "ACCEPTED",
              label: "Accepted",
              count: acceptedOrders.length,
              highlight: false,
            },
            {
              id: "PREPARING",
              label: "Preparing",
              count: preparingOrders.length,
              highlight: false,
            },
            {
              id: "READY",
              label: "Ready",
              count: readyOrders.length,
              highlight: readyOrders.length > 0,
            },
            {
              id: "COMPLETED",
              label: "Completed",
              count: orders.filter((o) => o.status === "COMPLETED").length,
              highlight: false,
            },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`min-w-[132px] sm:min-w-0 shrink-0 p-3 sm:p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                  active
                    ? "bg-roast border-gold text-crema shadow-luxury"
                    : tab.highlight
                    ? "bg-saffron-bg/50 border-saffron/50 text-crema"
                    : "bg-umber border-gold/15 text-champagne hover:border-gold/35"
                }`}
              >
                <span className="text-xs font-medium truncate">{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold shrink-0 ${
                    active
                      ? "bg-gold text-obsidian"
                      : "bg-obsidian text-gold-light"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Table Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-umber p-3 sm:p-3.5 rounded-xl border border-gold/15">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-mono uppercase tracking-wider text-taupe mr-1 shrink-0">
              Table:
            </span>
            <button
              onClick={() => setTableFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 transition ${
                tableFilter === "ALL"
                  ? "bg-gold text-obsidian font-bold"
                  : "bg-obsidian text-champagne hover:text-crema"
              }`}
            >
              ALL
            </button>
            {distinctTables.map((tbl) => (
              <button
                key={tbl}
                onClick={() => setTableFilter(tbl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 transition ${
                  tableFilter === tbl
                    ? "bg-gold text-obsidian font-bold"
                    : "bg-obsidian text-champagne hover:text-crema"
                }`}
              >
                {tbl}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-taupe absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search #order, table, dish…"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-obsidian border border-gold/20 text-xs text-crema focus:outline-none focus:border-gold"
              />
            </div>
            <button
              onClick={() => fetchOrders(false)}
              className="p-2.5 rounded-lg bg-obsidian border border-gold/20 text-gold hover:bg-roast shrink-0"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-xl bg-umber border border-gold/10 animate-pulse"
              />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center bg-umber rounded-2xl border border-gold/15">
            <Clock className="w-10 h-10 text-gold/40 mx-auto mb-3" />
            <h3 className="font-serif text-2xl text-crema">No orders yet.</h3>
            <p className="text-xs text-champagne mt-1 px-4">
              Incoming table orders will appear here automatically in realtime.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredOrders.map((order) => {
              const isBusy = updatingOrderId === order.id;
              return (
                <div
                  key={order.id}
                  className={`rounded-2xl bg-umber border flex flex-col justify-between overflow-hidden transition ${
                    order.status === "PENDING"
                      ? "border-saffron shadow-[0_0_25px_rgba(220,158,40,0.18)]"
                      : order.status === "READY"
                      ? "border-sage shadow-[0_0_25px_rgba(78,159,114,0.18)]"
                      : "border-gold/20"
                  }`}
                >
                  {/* Card Top Header */}
                  <div className="p-3.5 sm:p-4 bg-obsidian/70 border-b border-gold/15 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-lg bg-gold text-obsidian font-mono font-bold text-sm">
                        {order.table_code}
                      </span>
                      <div>
                        <div className="font-mono text-base font-bold text-crema">
                          #{order.order_number}
                        </div>
                        <div className="text-[11px] font-mono text-taupe">
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>

                    <StaffStatusBadge status={order.status} />
                  </div>

                  {/* Items List */}
                  <div className="p-3.5 sm:p-4 space-y-3 flex-1">
                    {(order.items || []).map((item: any) => (
                      <div
                        key={item.id}
                        className="pb-2.5 border-b border-gold/10 last:border-none last:pb-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-crema">
                            <span className="font-mono text-gold mr-1.5">
                              {item.quantity} ×
                            </span>
                            {item.item_name}
                          </span>
                          <span className="font-mono text-xs text-champagne shrink-0">
                            KES {Number(item.line_total).toLocaleString()}
                          </span>
                        </div>
                        {item.customizations?.length > 0 && (
                          <div className="mt-1 pl-5 space-y-0.5">
                            {item.customizations.map((c: any) => (
                              <div
                                key={c.id}
                                className="text-xs text-gold-light font-mono"
                              >
                                + {c.option_name}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.special_note && (
                          <div className="mt-1 pl-5 text-xs text-saffron-light font-medium">
                            Note: {item.special_note}
                          </div>
                        )}
                      </div>
                    ))}

                    {order.customer_note && (
                      <div className="p-2.5 rounded-lg bg-roast border border-gold/25 text-xs text-gold-light">
                        <strong className="uppercase text-[10px] tracking-wider block text-gold">
                          Table Note:
                        </strong>
                        {order.customer_note}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Total + Fast Operational Actions */}
                  <div className="p-3.5 sm:p-4 bg-obsidian border-t border-gold/15 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-taupe uppercase tracking-wider">
                        Order Total (Pay at Table)
                      </span>
                      <span className="font-mono text-base font-bold text-crema">
                        {order.currency || "KES"}{" "}
                        {Number(order.total).toLocaleString()}
                      </span>
                    </div>

                    {order.status === "PENDING" && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          disabled={isBusy}
                          onClick={() =>
                            handleUpdateStatus(order.id, "ACCEPTED")
                          }
                          className="min-h-[42px] py-2.5 px-4 rounded-xl bg-sage hover:bg-sage-light active:scale-95 text-obsidian font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Accept</span>
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() =>
                            handleUpdateStatus(
                              order.id,
                              "CANCELLED",
                              "Declined by floor staff"
                            )
                          }
                          className="min-h-[42px] py-2.5 px-4 rounded-xl bg-terracotta-bg hover:bg-terracotta active:scale-95 text-terracotta-light hover:text-obsidian border border-terracotta/50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}

                    {order.status === "ACCEPTED" && (
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateStatus(order.id, "PREPARING")
                        }
                        className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-saffron hover:bg-saffron-light active:scale-95 text-obsidian font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                      >
                        <Flame className="w-4 h-4" />
                        <span>Start Preparing</span>
                      </button>
                    )}

                    {order.status === "PREPARING" && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(order.id, "READY")}
                        className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-gold hover:bg-gold-light active:scale-95 text-obsidian font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Ready</span>
                      </button>
                    )}

                    {order.status === "READY" && (
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateStatus(order.id, "COMPLETED")
                        }
                        className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-sage hover:bg-sage-light active:scale-95 text-obsidian font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Complete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StaffStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PENDING":
      return (
        <span className="px-2.5 py-1 rounded-full bg-saffron-bg border border-saffron text-saffron-light text-[11px] font-mono font-bold uppercase">
          PENDING
        </span>
      );
    case "ACCEPTED":
      return (
        <span className="px-2.5 py-1 rounded-full bg-roast border border-gold text-gold-light text-[11px] font-mono font-bold uppercase">
          ACCEPTED
        </span>
      );
    case "PREPARING":
      return (
        <span className="px-2.5 py-1 rounded-full bg-saffron-bg border border-saffron/60 text-saffron-light text-[11px] font-mono font-bold uppercase">
          PREPARING
        </span>
      );
    case "READY":
      return (
        <span className="px-2.5 py-1 rounded-full bg-sage-bg border border-sage text-sage-light text-[11px] font-mono font-bold uppercase">
          READY
        </span>
      );
    case "COMPLETED":
      return (
        <span className="px-2.5 py-1 rounded-full bg-obsidian border border-gold/20 text-champagne text-[11px] font-mono uppercase">
          COMPLETED
        </span>
      );
    case "CANCELLED":
      return (
        <span className="px-2.5 py-1 rounded-full bg-terracotta-bg border border-terracotta/50 text-terracotta-light text-[11px] font-mono uppercase">
          CANCELLED
        </span>
      );
    default:
      return null;
  }
}
