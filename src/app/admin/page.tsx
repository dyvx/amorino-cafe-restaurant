"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { StaffAuthGate } from "@/components/StaffAuthGate";
import { AmorinoLogo } from "@/components/AmorinoLogo";
import Link from "next/link";
import {
  LayoutDashboard,
  Utensils,
  ClipboardList,
  QrCode,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Download,
  Printer,
  RefreshCw,
  ExternalLink,
  Power,
  ChefHat,
  LogOut,
  Search,
  Sparkles,
  Shield,
  Users,
} from "lucide-react";

type AdminTab =
  | "OVERVIEW"
  | "MENU"
  | "ORDERS"
  | "TABLES"
  | "ANALYTICS"
  | "SETTINGS";

export default function AdminDashboardPage() {
  return (
    <StaffAuthGate
      allowedRoles={["ADMIN"]}
      portalTitle="Amorino Executive Admin Suite"
      portalSubtitle="Complete hospitality management: Menu CMS, Table QR Studio, Orders, Analytics & Settings."
      defaultQuickRole="ADMIN"
    >
      {(user, logout) => <AdminSuiteContent user={user} logout={logout} />}
    </StaffAuthGate>
  );
}

function AdminSuiteContent({
  user,
  logout,
}: {
  user: any;
  logout: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("OVERVIEW");
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);

  // Data stores
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [menuData, setMenuData] = useState<{
    categories: any[];
    menuItems: any[];
    customizationGroups: any[];
  }>({ categories: [], menuItems: [], customizationGroups: [] });
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Print QR Target
  const [printTableCard, setPrintTableCard] = useState<any | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((prev) => (prev === msg ? null : prev)), 3200);
  };

  const fetchAllAdminData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://amorino.co.ke";
      const [anRes, menuRes, ordRes, tblRes, setRes] = await Promise.all([
        fetch("/api/admin/analytics", { cache: "no-store" }),
        fetch("/api/admin/menu", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" }),
        fetch(`/api/admin/tables?origin=${encodeURIComponent(origin)}`, {
          cache: "no-store",
        }),
        fetch("/api/admin/settings", { cache: "no-store" }),
      ]);

      if (anRes.ok) setAnalyticsData(await anRes.json());
      if (menuRes.ok) setMenuData(await menuRes.json());
      if (ordRes.ok) {
        const oJson = await ordRes.json();
        setOrders(oJson.orders || []);
      }
      if (tblRes.ok) {
        const tJson = await tblRes.json();
        setTables(tJson.tables || []);
      }
      if (setRes.ok) {
        const sJson = await setRes.json();
        setSettingsData(sJson.settings);
        setUsersList(sJson.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAdminData(false);
  }, [fetchAllAdminData]);

  // Realtime SSE listener
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events");
      es.onmessage = () => {
        fetchAllAdminData(true);
      };
    } catch {}
    return () => {
      if (es) es.close();
    };
  }, [fetchAllAdminData]);

  // Toggle Restaurant OPEN / CLOSED Mode (Section 21)
  const handleToggleRestaurantOpen = async () => {
    if (!settingsData) return;
    const nextOpen = !settingsData.is_open;
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "TOGGLE_OPEN_MODE",
        is_open: nextOpen,
      }),
    });
    if (res.ok) {
      setSettingsData({ ...settingsData, is_open: nextOpen });
      notify(
        nextOpen
          ? "Restaurant marked OPEN — Table ordering enabled."
          : "Restaurant marked CLOSED — Menu remains viewable, ordering disabled."
      );
    }
  };

  const navItems: { id: AdminTab; label: string; icon: any; badge?: number }[] =
    [
      { id: "OVERVIEW", label: "Overview", icon: LayoutDashboard },
      {
        id: "MENU",
        label: "Menu CMS",
        icon: Utensils,
        badge: menuData.menuItems.length,
      },
      {
        id: "ORDERS",
        label: "Orders",
        icon: ClipboardList,
        badge: orders.filter((o) => o.status === "PENDING").length || undefined,
      },
      {
        id: "TABLES",
        label: "Tables & QR",
        icon: QrCode,
        badge: tables.length,
      },
      { id: "ANALYTICS", label: "Analytics", icon: BarChart3 },
      { id: "SETTINGS", label: "Settings & Roles", icon: Settings },
    ];

  return (
    <div className="min-h-screen bg-obsidian text-crema flex flex-col lg:flex-row">
      {/* PRINTABLE LUXURY QR MODAL OVERLAY */}
      {printTableCard && (
        <div className="fixed inset-0 z-50 bg-obsidian flex flex-col items-center justify-center p-6">
          <div className="no-print mb-6 flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-full bg-gold text-obsidian font-semibold text-xs uppercase tracking-widest flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Table Card</span>
            </button>
            <button
              onClick={() => setPrintTableCard(null)}
              className="px-5 py-2.5 rounded-full bg-umber border border-gold/30 text-xs text-crema"
            >
              Close Preview
            </button>
          </div>

          {/* Luxury Printable Card Design (Section 20) */}
          <div className="w-[380px] p-8 rounded-3xl bg-[#070504] border-2 border-gold shadow-luxury text-center space-y-5">
            <AmorinoLogo
              size={92}
              className="mx-auto border border-gold/40"
            />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold">
                KENYA • TABLE ORDERING
              </p>
              <h2 className="font-serif text-3xl text-crema mt-1">
                Amorino Cafe &amp; Restaurant
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D0906] border border-gold/35 inline-block mx-auto">
              <img
                src={printTableCard.qrDataUrl}
                alt={`QR Code for ${printTableCard.code}`}
                className="w-52 h-52 mx-auto"
              />
            </div>

            <div className="space-y-1">
              <div className="inline-block px-5 py-1.5 rounded-full bg-gold text-obsidian font-mono text-base font-extrabold tracking-[0.2em]">
                TABLE {printTableCard.code.replace(/^T0?/, "")}
              </div>
              <p className="text-xs text-champagne pt-2">
                Scan with your phone camera to explore our digital menu and
                place your order directly to your table.
              </p>
              <p className="text-[10px] font-mono text-taupe pt-1">
                {printTableCard.orderUrl}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR NAVIGATION (Desktop) / TOP NAV (Mobile) */}
      <aside className="no-print w-full lg:w-64 bg-espresso border-b lg:border-b-0 lg:border-r border-gold/20 shrink-0 flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-gold/15 flex items-center justify-between lg:justify-start gap-3.5">
            <div className="flex items-center gap-3">
              <AmorinoLogo size={44} className="border border-gold/35" />
              <div>
                <h1 className="font-serif text-lg text-crema leading-tight font-medium">
                  Amorino Admin
                </h1>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gold block">
                  {user.role} SUITE
                </span>
              </div>
            </div>

            {/* Mobile Open/Closed Quick Toggle */}
            <button
              onClick={handleToggleRestaurantOpen}
              className={`lg:hidden px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                settingsData?.is_open
                  ? "bg-sage-bg border-sage text-sage-light"
                  : "bg-terracotta-bg border-terracotta text-terracotta-light"
              }`}
            >
              {settingsData?.is_open ? "OPEN" : "CLOSED"}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition flex items-center justify-between gap-2 shrink-0 ${
                    active
                      ? "bg-gold text-obsidian font-semibold shadow-gold-glow"
                      : "text-champagne hover:text-crema hover:bg-umber"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        active
                          ? "bg-obsidian text-gold"
                          : "bg-roast text-gold-light"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Portal Switcher Links */}
        <div className="hidden lg:flex flex-col p-4 border-t border-gold/15 space-y-2">
          <button
            onClick={handleToggleRestaurantOpen}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-mono font-bold uppercase flex items-center justify-between transition ${
              settingsData?.is_open
                ? "bg-sage-bg border-sage/50 text-sage-light"
                : "bg-terracotta-bg border-terracotta/50 text-terracotta-light"
            }`}
          >
            <span className="flex items-center gap-2">
              <Power className="w-3.5 h-3.5" />
              {settingsData?.is_open ? "Status: OPEN" : "Status: CLOSED"}
            </span>
            <span className="text-[10px] underline">Toggle</span>
          </button>

          <Link
            href="/order?table=T12"
            className="px-3 py-2 rounded-xl bg-umber hover:bg-roast border border-gold/15 text-xs text-champagne hover:text-gold flex items-center justify-between transition"
          >
            <span>Customer Menu (T12)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/staff"
            className="px-3 py-2 rounded-xl bg-umber hover:bg-roast border border-gold/15 text-xs text-champagne hover:text-gold flex items-center justify-between transition"
          >
            <span>Staff Floor Console</span>
            <ClipboardList className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/kitchen"
            className="px-3 py-2 rounded-xl bg-umber hover:bg-roast border border-gold/15 text-xs text-champagne hover:text-gold flex items-center justify-between transition"
          >
            <span>Kitchen Display (KDS)</span>
            <ChefHat className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={logout}
            className="w-full mt-2 py-2 px-3 rounded-xl bg-obsidian hover:bg-terracotta-bg border border-gold/15 text-xs text-taupe hover:text-terracotta-light flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="no-print flex-1 flex flex-col min-w-0">
        {toast && (
          <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-full bg-umber border border-gold text-crema text-xs shadow-luxury flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span>{toast}</span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-32 rounded-2xl bg-umber border border-gold/10 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {activeTab === "OVERVIEW" && (
                <AdminOverviewTab
                  analyticsData={analyticsData}
                  orders={orders}
                  settings={settingsData}
                  onToggleOpen={handleToggleRestaurantOpen}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === "MENU" && (
                <AdminMenuCmsTab
                  menuData={menuData}
                  onRefresh={() => fetchAllAdminData(true)}
                  notify={notify}
                />
              )}

              {activeTab === "ORDERS" && (
                <AdminOrdersTab
                  orders={orders}
                  onRefresh={() => fetchAllAdminData(true)}
                  notify={notify}
                />
              )}

              {activeTab === "TABLES" && (
                <AdminTablesQrTab
                  tables={tables}
                  onRefresh={() => fetchAllAdminData(true)}
                  onPrintCard={(tbl) => setPrintTableCard(tbl)}
                  notify={notify}
                />
              )}

              {activeTab === "ANALYTICS" && (
                <AdminAnalyticsTab analyticsData={analyticsData} />
              )}

              {activeTab === "SETTINGS" && (
                <AdminSettingsTab
                  settings={settingsData}
                  users={usersList}
                  onRefresh={() => fetchAllAdminData(true)}
                  notify={notify}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ============================================================================
 * TAB 1: ADMIN OVERVIEW (Section 18)
 * ==========================================================================*/
function AdminOverviewTab({
  analyticsData,
  orders,
  settings,
  onToggleOpen,
  onNavigate,
}: {
  analyticsData: any;
  orders: any[];
  settings: any;
  onToggleOpen: () => void;
  onNavigate: (tab: AdminTab) => void;
}) {
  const ov = analyticsData?.overview || {};
  const popular = analyticsData?.popularItems || [];

  const kpis = [
    {
      label: "Today's Orders",
      value: ov.totalOrders ?? 0,
      sub: `${ov.completedOrders ?? 0} completed`,
    },
    {
      label: "Revenue",
      value: `KES ${(ov.totalRevenue ?? 0).toLocaleString()}`,
      sub: "Physical table settlement",
    },
    {
      label: "Average Order Value",
      value: `KES ${(ov.avgOrderValue ?? 0).toLocaleString()}`,
      sub: "Per confirmed table order",
    },
    {
      label: "Active Tables",
      value: `${ov.activeTables ?? 0} / ${ov.totalActiveTables ?? 12}`,
      sub: "Tables with active orders",
    },
    {
      label: "Pending Orders",
      value: ov.pendingOrders ?? 0,
      sub: "Awaiting staff acceptance",
      highlight: (ov.pendingOrders ?? 0) > 0,
    },
    {
      label: "Preparing Orders",
      value: (ov.preparingOrders ?? 0) + (ov.acceptedOrders ?? 0),
      sub: "In kitchen / accepted",
    },
    {
      label: "Ready to Serve",
      value: ov.readyOrders ?? 0,
      sub: "At kitchen pass",
    },
    {
      label: "Completed Orders",
      value: ov.completedOrders ?? 0,
      sub: "Served to guests",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold/15 pb-5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold block">
            EXECUTIVE HOSPITALITY OVERVIEW
          </span>
          <h2 className="font-serif text-3xl text-crema">
            {settings?.name || "Amorino Cafe & Restaurant"}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onToggleOpen}
            className={`px-4 py-2 rounded-full border text-xs font-mono font-bold uppercase flex items-center gap-2 transition ${
              settings?.is_open
                ? "bg-sage-bg border-sage text-sage-light"
                : "bg-terracotta-bg border-terracotta text-terracotta-light"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>
              Restaurant is {settings?.is_open ? "OPEN" : "CLOSED"}
            </span>
          </button>
          <button
            onClick={() => onNavigate("MENU")}
            className="px-4 py-2 rounded-full bg-gold text-obsidian font-semibold text-xs uppercase tracking-wider"
          >
            Manage Menu
          </button>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-umber border transition ${
              kpi.highlight
                ? "border-saffron shadow-[0_0_25px_rgba(220,158,40,0.15)]"
                : "border-gold/15"
            }`}
          >
            <span className="text-[11px] uppercase tracking-wider text-champagne block">
              {kpi.label}
            </span>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-crema mt-2">
              {kpi.value}
            </div>
            <span className="text-[11px] text-taupe block mt-1">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* Two Column Section: Recent Live Orders & Popular Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-2xl bg-umber border border-gold/15 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl text-crema">
              Live Table Orders
            </h3>
            <button
              onClick={() => onNavigate("ORDERS")}
              className="text-xs text-gold hover:underline font-mono uppercase"
            >
              View All ({orders.length}) →
            </button>
          </div>

          <div className="divide-y divide-gold/10">
            {orders.slice(0, 6).map((ord) => (
              <div
                key={ord.id}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-crema">
                      #{ord.order_number}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-roast border border-gold/25 font-mono text-xs text-gold">
                      {ord.table_code}
                    </span>
                    <span className="text-xs text-taupe font-mono">
                      {ord.status}
                    </span>
                  </div>
                  <p className="text-xs text-champagne mt-1">
                    {(ord.items || [])
                      .map((i: any) => `${i.quantity}× ${i.item_name}`)
                      .join(", ")}
                  </p>
                </div>
                <div className="text-right font-mono text-sm font-semibold text-gold-light shrink-0">
                  KES {Number(ord.total).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Items Leaderboard */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-umber border border-gold/15 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl text-crema">Popular Dishes</h3>
            <button
              onClick={() => onNavigate("ANALYTICS")}
              className="text-xs text-gold hover:underline font-mono uppercase"
            >
              Analytics →
            </button>
          </div>

          <div className="space-y-3">
            {popular.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-obsidian border border-gold/10 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-gold/15 text-gold font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-crema truncate">
                      {item.item_name}
                    </div>
                    <div className="text-[11px] text-taupe font-mono">
                      {item.total_qty} sold
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-gold-light shrink-0">
                  KES {Number(item.total_sales).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * TAB 2: ADMIN MENU CMS (Section 18 & 38)
 * ==========================================================================*/
function AdminMenuCmsTab({
  menuData,
  onRefresh,
  notify,
}: {
  menuData: {
    categories: any[];
    menuItems: any[];
    customizationGroups: any[];
  };
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}) {
  const [subTab, setSubTab] = useState<"ITEMS" | "CATEGORIES" | "ADDONS">(
    "ITEMS"
  );
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [newOptionName, setNewOptionName] = useState<Record<number, string>>(
    {}
  );
  const [newOptionPrice, setNewOptionPrice] = useState<Record<number, string>>(
    {}
  );

  const handleToggleItemField = async (
    id: number,
    field: "is_available" | "is_featured" | "is_popular",
    value: boolean
  ) => {
    const res = await fetch("/api/admin/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "TOGGLE_ITEM_FIELD",
        id,
        field,
        value,
      }),
    });
    if (res.ok) {
      await onRefresh();
      notify("Menu item updated.");
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const isEdit = Boolean(editingItem.id);

    const payload = {
      entityType: "MENU_ITEM",
      ...editingItem,
      price: Number(editingItem.price || 0),
      prep_time_minutes: Number(editingItem.prep_time_minutes || 15),
      ingredients:
        typeof editingItem.ingredientsText === "string"
          ? editingItem.ingredientsText
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : editingItem.ingredients || [],
      allergens:
        typeof editingItem.allergensText === "string"
          ? editingItem.allergensText
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : editingItem.allergens || [],
    };

    const res = await fetch("/api/admin/menu", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setEditingItem(null);
      await onRefresh();
      notify(isEdit ? "Dish updated in catalogue." : "New dish added to menu.");
    }
  };

  const handleDeleteEntity = async (entityType: string, id: number) => {
    const res = await fetch(
      `/api/admin/menu?entityType=${entityType}&id=${id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      await onRefresh();
      notify("Deleted from menu.");
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const isEdit = Boolean(editingCategory.id);
    const res = await fetch("/api/admin/menu", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "CATEGORY",
        ...editingCategory,
      }),
    });
    if (res.ok) {
      setEditingCategory(null);
      await onRefresh();
      notify(isEdit ? "Category updated." : "Category created.");
    }
  };

  const handleAddOptionToGroup = async (groupId: number) => {
    const name = (newOptionName[groupId] || "").trim();
    const price = Number(newOptionPrice[groupId] || 0);
    if (!name) return;

    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "CUSTOMIZATION_OPTION",
        group_id: groupId,
        name,
        name_so: name,
        name_sw: name,
        price_adjustment: price,
      }),
    });
    if (res.ok) {
      setNewOptionName({ ...newOptionName, [groupId]: "" });
      setNewOptionPrice({ ...newOptionPrice, [groupId]: "" });
      await onRefresh();
      notify("Customization option added.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold/15 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold block">
            DYNAMIC CATALOGUE CMS
          </span>
          <h2 className="font-serif text-3xl text-crema">
            Menu, Translations &amp; Customizations
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: "ITEMS", label: `Food Items (${menuData.menuItems.length})` },
            {
              id: "CATEGORIES",
              label: `Categories (${menuData.categories.length})`,
            },
            {
              id: "ADDONS",
              label: `Add-ons & Groups (${menuData.customizationGroups.length})`,
            },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition ${
                subTab === t.id
                  ? "bg-gold text-obsidian font-bold"
                  : "bg-umber border border-gold/20 text-champagne hover:text-crema"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUBTAB 1: FOOD ITEMS */}
      {subTab === "ITEMS" && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              onClick={() =>
                setEditingItem({
                  category_id: menuData.categories[0]?.id || 1,
                  name: "",
                  name_so: "",
                  name_sw: "",
                  description: "",
                  description_so: "",
                  description_sw: "",
                  price: 850,
                  image_url:
                    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1100&q=85",
                  is_available: true,
                  is_featured: false,
                  is_popular: true,
                  prep_time_minutes: 15,
                  prep_estimate_label: "15–20 mins",
                  ingredientsText: "Fresh herbs, Signature sauce",
                  allergensText: "",
                  groupIds: menuData.customizationGroups.map((g) => g.id),
                })
              }
              className="px-5 py-2.5 rounded-full bg-gold hover:bg-gold-light text-obsidian font-semibold text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Food Item</span>
            </button>
          </div>

          {/* Item Editor Modal */}
          {editingItem && (
            <div className="p-6 rounded-2xl bg-umber border border-gold/40 shadow-luxury space-y-5">
              <div className="flex items-center justify-between border-b border-gold/15 pb-3">
                <h3 className="font-serif text-2xl text-crema">
                  {editingItem.id ? "Edit Food Item" : "Create New Food Item"}
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-champagne hover:text-crema"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMenuItem} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase text-gold mb-1">
                      Name (🇬🇧 English) *
                    </label>
                    <input
                      required
                      type="text"
                      value={editingItem.name}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-gold mb-1">
                      Name (🇸🇴 Somali)
                    </label>
                    <input
                      type="text"
                      value={editingItem.name_so}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          name_so: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-gold mb-1">
                      Name (🇰🇪 Swahili)
                    </label>
                    <input
                      type="text"
                      value={editingItem.name_sw}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          name_sw: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase text-champagne mb-1">
                      Description (🇬🇧 English)
                    </label>
                    <textarea
                      rows={2}
                      value={editingItem.description}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          description: e.target.value,
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-champagne mb-1">
                      Description (🇸🇴 Somali)
                    </label>
                    <textarea
                      rows={2}
                      value={editingItem.description_so}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          description_so: e.target.value,
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-champagne mb-1">
                      Description (🇰🇪 Swahili)
                    </label>
                    <textarea
                      rows={2}
                      value={editingItem.description_sw}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          description_sw: e.target.value,
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase text-champagne mb-1">
                      Category
                    </label>
                    <select
                      value={editingItem.category_id}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          category_id: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    >
                      {menuData.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-champagne mb-1">
                      Price (KES)
                    </label>
                    <input
                      required
                      type="number"
                      value={editingItem.price}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          price: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs font-mono text-crema"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-champagne mb-1">
                      Prep Time Estimate
                    </label>
                    <input
                      type="text"
                      value={editingItem.prep_estimate_label}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          prep_estimate_label: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-champagne mb-1">
                      Image URL (Replaceable)
                    </label>
                    <input
                      type="text"
                      value={editingItem.image_url}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          image_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase text-champagne mb-1">
                      Ingredients (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={
                        editingItem.ingredientsText ??
                        (editingItem.ingredients || []).join(", ")
                      }
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          ingredientsText: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase text-champagne mb-1">
                      Allergens (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={
                        editingItem.allergensText ??
                        (editingItem.allergens || []).join(", ")
                      }
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          allergensText: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                    />
                  </div>
                </div>

                {/* Link Customization Groups */}
                <div>
                  <label className="block text-[11px] uppercase text-gold mb-2">
                    Allowed Customization Groups
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {menuData.customizationGroups.map((grp) => {
                      const active = (editingItem.groupIds || []).includes(
                        grp.id
                      );
                      return (
                        <button
                          key={grp.id}
                          type="button"
                          onClick={() => {
                            const current = editingItem.groupIds || [];
                            setEditingItem({
                              ...editingItem,
                              groupIds: active
                                ? current.filter((id: number) => id !== grp.id)
                                : [...current, grp.id],
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs transition ${
                            active
                              ? "bg-gold text-obsidian border-gold font-semibold"
                              : "bg-obsidian text-champagne border-gold/20"
                          }`}
                        >
                          {grp.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-champagne"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gold text-obsidian font-bold text-xs uppercase tracking-wider"
                  >
                    Save Food Item
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Food Items List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuData.menuItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-umber border border-gold/15 flex gap-4 items-center justify-between"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 bg-roast"
                  />
                  <div className="min-w-0">
                    <h4 className="font-serif text-lg text-crema truncate">
                      {item.name}
                    </h4>
                    <div className="text-[11px] text-taupe truncate">
                      🇸🇴 {item.name_so} • 🇰🇪 {item.name_sw}
                    </div>
                    <div className="font-mono text-xs text-gold-light font-semibold mt-1">
                      KES {Number(item.price).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      handleToggleItemField(
                        item.id,
                        "is_available",
                        !item.is_available
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-bold border ${
                      item.is_available
                        ? "bg-sage-bg border-sage text-sage-light"
                        : "bg-terracotta-bg border-terracotta text-terracotta-light"
                    }`}
                  >
                    {item.is_available ? "Available" : "Sold Out"}
                  </button>

                  <button
                    onClick={() =>
                      handleToggleItemField(
                        item.id,
                        "is_featured",
                        !item.is_featured
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase border ${
                      item.is_featured
                        ? "bg-gold/20 border-gold text-gold"
                        : "bg-obsidian border-gold/15 text-taupe"
                    }`}
                  >
                    Featured
                  </button>

                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 rounded-lg bg-obsidian border border-gold/20 text-champagne hover:text-gold"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteEntity("MENU_ITEM", item.id)}
                    className="p-2 rounded-lg bg-obsidian border border-gold/20 text-taupe hover:text-terracotta-light"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: CATEGORIES */}
      {subTab === "CATEGORIES" && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              onClick={() =>
                setEditingCategory({
                  name: "",
                  name_so: "",
                  name_sw: "",
                  description: "",
                  description_so: "",
                  description_sw: "",
                  image_url:
                    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=85",
                  sort_order: menuData.categories.length + 1,
                  is_active: true,
                })
              }
              className="px-5 py-2.5 rounded-full bg-gold text-obsidian font-semibold text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          {editingCategory && (
            <form
              onSubmit={handleSaveCategory}
              className="p-6 rounded-2xl bg-umber border border-gold/40 space-y-4"
            >
              <h3 className="font-serif text-2xl text-crema">
                {editingCategory.id ? "Edit Category" : "Create Category"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  required
                  placeholder="Category Name (EN)"
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                />
                <input
                  placeholder="Somali Name (SO)"
                  value={editingCategory.name_so}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name_so: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                />
                <input
                  placeholder="Swahili Name (SW)"
                  value={editingCategory.name_sw}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name_sw: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                />
              </div>
              <input
                placeholder="Description (EN)"
                value={editingCategory.description}
                onChange={(e) =>
                  setEditingCategory({
                    ...editingCategory,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl bg-obsidian text-xs text-champagne"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gold text-obsidian font-bold text-xs uppercase"
                >
                  Save Category
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuData.categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-umber border border-gold/15 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-serif text-xl text-crema">{cat.name}</h4>
                  <p className="text-[11px] text-taupe">
                    🇸🇴 {cat.name_so} • 🇰🇪 {cat.name_sw}
                  </p>
                  <p className="text-xs text-champagne mt-1">
                    {cat.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingCategory(cat)}
                    className="p-2 rounded-lg bg-obsidian border border-gold/20 text-champagne hover:text-gold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntity("CATEGORY", cat.id)}
                    className="p-2 rounded-lg bg-obsidian border border-gold/20 text-taupe hover:text-terracotta-light"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CUSTOMIZATION GROUPS & ADD-ONS */}
      {subTab === "ADDONS" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {menuData.customizationGroups.map((group) => (
            <div
              key={group.id}
              className="p-6 rounded-2xl bg-umber border border-gold/15 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gold/15 pb-3">
                <div>
                  <h4 className="font-serif text-xl text-crema">
                    {group.name}
                  </h4>
                  <p className="text-[11px] text-taupe">
                    🇸🇴 {group.name_so} • 🇰🇪 {group.name_sw} (Max{" "}
                    {group.max_selections})
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {group.options.map((opt: any) => (
                  <div
                    key={opt.id}
                    className="p-2.5 rounded-xl bg-obsidian border border-gold/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="text-crema font-medium">{opt.name}</span>
                      <span className="text-taupe text-[11px] ml-2">
                        ({opt.name_so} / {opt.name_sw})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-gold">
                        + KES {opt.price_adjustment}
                      </span>
                      <button
                        onClick={() =>
                          handleDeleteEntity("CUSTOMIZATION_OPTION", opt.id)
                        }
                        className="text-taupe hover:text-terracotta-light"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new option inline */}
              <div className="pt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="New option (e.g. Extra bacon)"
                  value={newOptionName[group.id] || ""}
                  onChange={(e) =>
                    setNewOptionName({
                      ...newOptionName,
                      [group.id]: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
                />
                <input
                  type="number"
                  placeholder="+KES"
                  value={newOptionPrice[group.id] || ""}
                  onChange={(e) =>
                    setNewOptionPrice({
                      ...newOptionPrice,
                      [group.id]: e.target.value,
                    })
                  }
                  className="w-24 px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs font-mono text-crema"
                />
                <button
                  type="button"
                  onClick={() => handleAddOptionToGroup(group.id)}
                  className="px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-xs"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * TAB 3: ADMIN ORDERS (Section 18)
 * ==========================================================================*/
function AdminOrdersTab({
  orders,
  onRefresh,
  notify,
}: {
  orders: any[];
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const updateOrderStatus = async (orderId: number, status: string) => {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await onRefresh();
      notify(`Order updated to ${status}`);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          String(o.order_number).includes(q) ||
          o.table_code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold/15 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold block">
            ORDER ARCHIVE &amp; LIVE CONTROL
          </span>
          <h2 className="font-serif text-3xl text-crema">All Table Orders</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-taupe absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search #order or table…"
              className="pl-8 pr-3 py-2 rounded-xl bg-umber border border-gold/20 text-xs text-crema"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-umber border border-gold/20 text-xs text-crema font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="PREPARING">PREPARING</option>
            <option value="READY">READY</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((ord) => (
          <div
            key={ord.id}
            className="p-5 rounded-2xl bg-umber border border-gold/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-lg font-bold text-crema">
                  #{ord.order_number}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-gold text-obsidian font-mono text-xs font-bold">
                  {ord.table_code}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-obsidian border border-gold/30 font-mono text-[11px] text-gold-light">
                  {ord.status}
                </span>
                <span className="text-xs font-mono text-taupe">
                  {new Date(ord.created_at).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-champagne pt-1">
                {(ord.items || [])
                  .map(
                    (i: any) =>
                      `${i.quantity}× ${i.item_name}${
                        i.customizations?.length
                          ? ` (${i.customizations
                              .map((c: any) => c.option_name)
                              .join(", ")})`
                          : ""
                      }`
                  )
                  .join(" • ")}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-base font-bold text-gold-light mr-2">
                KES {Number(ord.total).toLocaleString()}
              </span>

              {[
                "ACCEPTED",
                "PREPARING",
                "READY",
                "COMPLETED",
                "CANCELLED",
              ].map((st) => (
                <button
                  key={st}
                  onClick={() => updateOrderStatus(ord.id, st)}
                  disabled={ord.status === st}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase transition ${
                    ord.status === st
                      ? "bg-gold text-obsidian font-bold"
                      : "bg-obsidian hover:bg-roast border border-gold/20 text-champagne"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
 * TAB 4: TABLES & LUXURY QR MANAGEMENT (Section 20)
 * ==========================================================================*/
function AdminTablesQrTab({
  tables,
  onRefresh,
  onPrintCard,
  notify,
}: {
  tables: any[];
  onRefresh: () => Promise<void>;
  onPrintCard: (tbl: any) => void;
  notify: (msg: string) => void;
}) {
  const [newCode, setNewCode] = useState("");
  const [newZone, setNewZone] = useState("Main Dining Salon");
  const [newCapacity, setNewCapacity] = useState(4);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    const res = await fetch("/api/admin/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode,
        name: `Table ${newCode.replace(/^T0?/i, "")}`,
        zone: newZone,
        capacity: newCapacity,
      }),
    });
    if (res.ok) {
      setNewCode("");
      await onRefresh();
      notify(`Table ${newCode.toUpperCase()} created with unique QR code.`);
    }
  };

  const handleTableAction = async (
    id: number,
    action: string,
    extra: Record<string, any> = {}
  ) => {
    const res = await fetch("/api/admin/tables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...extra }),
    });
    if (res.ok) {
      await onRefresh();
      notify("Table updated.");
    }
  };

  const handleDownloadQr = (tbl: any) => {
    const a = document.createElement("a");
    a.href = tbl.qrDataUrl;
    a.download = `Amorino-${tbl.code}-QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gold/15 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold block">
            TABLE SESSIONS &amp; BESPOKE QR STUDIO
          </span>
          <h2 className="font-serif text-3xl text-crema">
            Restaurant Tables &amp; QR Cards
          </h2>
        </div>

        {/* Create New Table Form */}
        <form
          onSubmit={handleCreateTable}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Code (e.g. T13)"
            className="w-32 px-3 py-2 rounded-xl bg-umber border border-gold/20 text-xs font-mono text-crema"
          />
          <input
            type="text"
            value={newZone}
            onChange={(e) => setNewZone(e.target.value)}
            placeholder="Zone"
            className="w-40 px-3 py-2 rounded-xl bg-umber border border-gold/20 text-xs text-crema"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gold text-obsidian font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Table</span>
          </button>
        </form>
      </div>

      {/* Tables QR Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((tbl) => (
          <div
            key={tbl.id}
            className={`p-6 rounded-2xl bg-umber border flex flex-col justify-between space-y-5 ${
              tbl.is_active
                ? "border-gold/25 shadow-luxury"
                : "border-terracotta/40 opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-gold text-obsidian font-mono font-extrabold text-sm">
                    {tbl.code}
                  </span>
                  <span className="font-serif text-xl text-crema">
                    {tbl.name}
                  </span>
                </div>
                <p className="text-xs text-champagne mt-1">
                  {tbl.zone} • {tbl.capacity} Guests
                </p>
              </div>

              <button
                onClick={() =>
                  handleTableAction(tbl.id, "TOGGLE_ACTIVE", {
                    is_active: !tbl.is_active,
                  })
                }
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  tbl.is_active
                    ? "bg-sage-bg border-sage text-sage-light"
                    : "bg-terracotta-bg border-terracotta text-terracotta-light"
                }`}
              >
                {tbl.is_active ? "Active" : "Disabled"}
              </button>
            </div>

            {/* Luxury QR Preview Card */}
            <div className="p-4 rounded-2xl bg-obsidian border border-gold/20 flex items-center gap-4">
              <img
                src={tbl.qrDataUrl}
                alt={`QR ${tbl.code}`}
                className="w-24 h-24 rounded-xl border border-gold/30 shrink-0"
              />
              <div className="min-w-0 space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-gold">
                  QR Destination
                </div>
                <Link
                  href={`/order?table=${tbl.code}`}
                  className="text-xs font-mono text-crema hover:text-gold truncate block underline"
                >
                  /order?table={tbl.code}
                </Link>
                <div className="text-[11px] text-taupe font-mono">
                  {tbl.activeOrdersCount > 0 ? (
                    <span className="text-gold-light">
                      {tbl.activeOrdersCount} active orders (KES{" "}
                      {Number(tbl.activeTotalKes).toLocaleString()})
                    </span>
                  ) : (
                    "No active orders"
                  )}
                </div>
              </div>
            </div>

            {/* QR Actions: Download, Print, Regenerate, Reset Session */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleDownloadQr(tbl)}
                className="py-2 px-3 rounded-xl bg-obsidian hover:bg-roast border border-gold/20 text-xs text-champagne hover:text-crema flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-gold" />
                <span>Download QR</span>
              </button>

              <button
                onClick={() => onPrintCard(tbl)}
                className="py-2 px-3 rounded-xl bg-obsidian hover:bg-roast border border-gold/20 text-xs text-champagne hover:text-crema flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-gold" />
                <span>Print Card</span>
              </button>

              <button
                onClick={() => handleTableAction(tbl.id, "REGENERATE_QR")}
                className="py-2 px-3 rounded-xl bg-obsidian hover:bg-roast border border-gold/20 text-xs text-champagne hover:text-crema flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gold" />
                <span>Regenerate QR</span>
              </button>

              <Link
                href={`/order?table=${tbl.code}`}
                className="py-2 px-3 rounded-xl bg-gold/15 hover:bg-gold text-gold hover:text-obsidian border border-gold/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Menu</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
 * TAB 5: ADMIN ANALYTICS (Section 48)
 * ==========================================================================*/
function AdminAnalyticsTab({ analyticsData }: { analyticsData: any }) {
  if (!analyticsData) return null;
  const {
    overview,
    popularItems = [],
    categoryPerformance = [],
    tableActivity = [],
    peakPeriods = [],
  } = analyticsData;

  const maxCatRev = Math.max(
    1,
    ...categoryPerformance.map((c: any) => Number(c.revenue || 0))
  );
  const maxPeakOrders = Math.max(
    1,
    ...peakPeriods.map((p: any) => Number(p.orders || 0))
  );

  return (
    <div className="space-y-8">
      <div className="border-b border-gold/15 pb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold block">
          FACTUAL HOSPITALITY INTELLIGENCE
        </span>
        <h2 className="font-serif text-3xl text-crema">
          Revenue, Category Performance &amp; Table Activity
        </h2>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-umber border border-gold/20">
          <span className="text-xs uppercase tracking-wider text-champagne">
            Total Confirmed Sales
          </span>
          <div className="font-mono text-3xl font-bold text-gold-light mt-2">
            KES {(overview?.totalRevenue || 0).toLocaleString()}
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-umber border border-gold/20">
          <span className="text-xs uppercase tracking-wider text-champagne">
            Total Orders Processed
          </span>
          <div className="font-mono text-3xl font-bold text-crema mt-2">
            {overview?.totalOrders || 0}
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-umber border border-gold/20">
          <span className="text-xs uppercase tracking-wider text-champagne">
            Average Table Order Value
          </span>
          <div className="font-mono text-3xl font-bold text-crema mt-2">
            KES {(overview?.avgOrderValue || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance Visual Bars */}
        <div className="p-6 rounded-2xl bg-umber border border-gold/15 space-y-4">
          <h3 className="font-serif text-2xl text-crema">
            Category Performance
          </h3>
          <div className="space-y-3.5">
            {categoryPerformance.map((cat: any) => {
              const pct = Math.round(
                (Number(cat.revenue || 0) / maxCatRev) * 100
              );
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-crema font-medium">
                      {cat.category_name}
                    </span>
                    <span className="font-mono text-gold-light">
                      KES {Number(cat.revenue || 0).toLocaleString()} (
                      {cat.items_sold} items)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-obsidian overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold-bronze to-gold rounded-full"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak Service Periods & Table Activity */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-umber border border-gold/15 space-y-4">
            <h3 className="font-serif text-2xl text-crema">
              Peak Ordering Periods
            </h3>
            <div className="space-y-3">
              {peakPeriods.map((p: any, idx: number) => {
                const pct = Math.round((p.orders / maxPeakOrders) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-champagne">{p.label}</span>
                      <span className="font-mono text-crema">
                        {p.orders} orders • KES {p.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-obsidian overflow-hidden">
                      <div
                        className="h-full bg-gold rounded-full"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-umber border border-gold/15 space-y-4">
            <h3 className="font-serif text-2xl text-crema">Table Activity</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {tableActivity.slice(0, 9).map((t: any) => (
                <div
                  key={t.table_code}
                  className="p-3 rounded-xl bg-obsidian border border-gold/15"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-gold">
                      {t.table_code}
                    </span>
                    <span className="text-[11px] font-mono text-taupe">
                      {t.order_count} orders
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-crema mt-1">
                    KES {Number(t.revenue).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * TAB 6: SETTINGS, CLOSED MODE & ROLES (Section 18, 19, 21, 55)
 * ==========================================================================*/
function AdminSettingsTab({
  settings,
  users,
  onRefresh,
  notify,
}: {
  settings: any;
  users: any[];
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}) {
  const [form, setForm] = useState<any>(settings || {});
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("STAFF");

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      await onRefresh();
      notify("Restaurant settings & placeholders saved.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_USER",
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      }),
    });
    if (res.ok) {
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      await onRefresh();
      notify(`Created ${newUserRole} account.`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-gold/15 pb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold block">
          RESTAURANT CONFIGURATION &amp; RBAC ROLES
        </span>
        <h2 className="font-serif text-3xl text-crema">
          Settings, Closed Mode &amp; Staff Accounts
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Restaurant Settings & Placeholders Form */}
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-7 p-6 rounded-2xl bg-umber border border-gold/20 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-gold/15 pb-4">
            <div className="flex items-center gap-3">
              <AmorinoLogo size={48} className="border border-gold/30" />
              <div>
                <h3 className="font-serif text-2xl text-crema">
                  Restaurant Identity &amp; Service Hours
                </h3>
                <p className="text-xs text-champagne">
                  Editable placeholders as required by Section 39 &amp; 55
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.is_open)}
                onChange={(e) =>
                  setForm({ ...form, is_open: e.target.checked })
                }
                className="accent-gold w-4 h-4"
              />
              <span className="text-xs font-mono uppercase font-bold text-gold">
                {form.is_open ? "OPEN FOR ORDERS" : "CLOSED MODE"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase text-champagne mb-1">
                Restaurant Name
              </label>
              <input
                type="text"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase text-champagne mb-1">
                Opening Hours
              </label>
              <input
                type="text"
                value={form.opening_hours || ""}
                onChange={(e) =>
                  setForm({ ...form, opening_hours: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase text-champagne mb-1">
                Address Placeholder
              </label>
              <input
                type="text"
                value={form.address_placeholder || ""}
                onChange={(e) =>
                  setForm({ ...form, address_placeholder: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase text-champagne mb-1">
                Phone Number Placeholder
              </label>
              <input
                type="text"
                value={form.phone_placeholder || ""}
                onChange={(e) =>
                  setForm({ ...form, phone_placeholder: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase text-champagne mb-1">
                Instagram Placeholder
              </label>
              <input
                type="text"
                value={form.instagram_placeholder || ""}
                onChange={(e) =>
                  setForm({ ...form, instagram_placeholder: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] uppercase text-champagne mb-1">
                  Tax (%)
                </label>
                <input
                  type="number"
                  value={form.tax_percent ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, tax_percent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs font-mono text-crema"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase text-champagne mb-1">
                  Service Charge (%)
                </label>
                <input
                  type="number"
                  value={form.service_charge_percent ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      service_charge_percent: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs font-mono text-crema"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-gold/15">
            <label className="block text-[11px] uppercase text-gold">
              Editorial Hero Statement (EN / SO / SW)
            </label>
            <input
              type="text"
              value={form.hero_statement_en || ""}
              onChange={(e) =>
                setForm({ ...form, hero_statement_en: e.target.value })
              }
              placeholder="English statement"
              className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
            />
            <input
              type="text"
              value={form.hero_statement_so || ""}
              onChange={(e) =>
                setForm({ ...form, hero_statement_so: e.target.value })
              }
              placeholder="Somali statement"
              className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
            />
            <input
              type="text"
              value={form.hero_statement_sw || ""}
              onChange={(e) =>
                setForm({ ...form, hero_statement_sw: e.target.value })
              }
              placeholder="Swahili statement"
              className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-full bg-gold hover:bg-gold-light text-obsidian font-bold text-xs uppercase tracking-widest"
          >
            Save Settings
          </button>
        </form>

        {/* RBAC Staff / Admin Accounts (Section 19) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-umber border border-gold/20 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-gold/15 pb-3">
            <Users className="w-5 h-5 text-gold" />
            <div>
              <h3 className="font-serif text-2xl text-crema">
                Authorized Roles &amp; Staff
              </h3>
              <p className="text-xs text-champagne">
                ADMIN, STAFF, and KITCHEN role-based access accounts
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-xl bg-obsidian border border-gold/15 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-crema">
                    {u.name}
                  </div>
                  <div className="text-[11px] font-mono text-taupe">
                    {u.email}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-roast border border-gold/30 font-mono text-[10px] font-bold text-gold">
                  {u.role}
                </span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleCreateUser}
            className="pt-4 border-t border-gold/15 space-y-3"
          >
            <h4 className="text-xs uppercase tracking-wider text-gold">
              Add Staff / Kitchen Account
            </h4>
            <input
              required
              type="text"
              placeholder="Full Name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
            />
            <input
              required
              type="email"
              placeholder="Email Address"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                type="password"
                placeholder="Password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs font-mono text-crema"
              >
                <option value="STAFF">STAFF</option>
                <option value="KITCHEN">KITCHEN</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-roast hover:bg-gold hover:text-obsidian border border-gold/30 text-gold-light font-bold text-xs uppercase tracking-wider transition"
            >
              Create Authorized Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
