"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { AmorinoLogo } from "./AmorinoLogo";
import { CinematicIntro } from "./CinematicIntro";
import {
  LanguageCode,
  SUPPORTED_LANGUAGES,
  UI_TRANSLATIONS,
  localizeField,
} from "@/i18n/translations";
import {
  ShoppingBag,
  Clock,
  Check,
  Flame,
  Sparkles,
  Search,
  Plus,
  Minus,
  X,
  ChevronRight,
  AlertCircle,
  Utensils,
  WifiOff,
  RefreshCw,
  Film,
  Layers,
  ShieldCheck,
  ChefHat,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

interface CartItem {
  cartItemId: string;
  menuItem: any;
  quantity: number;
  selectedOptions: any[];
  specialNote: string;
  unitPrice: number;
}

export function CustomerExperience({
  initialTableParam,
}: {
  initialTableParam?: string;
}) {
  const [lang, setLang] = useState<LanguageCode>("en");
  const t = UI_TRANSLATIONS[lang];

  const [tableCode, setTableCode] = useState<string>(
    (initialTableParam || "T12").toUpperCase()
  );
  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [introChecked, setIntroChecked] = useState<boolean>(false);

  // Server data state
  const [loading, setLoading] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [settings, setSettings] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeTables, setActiveTables] = useState<any[]>([]);
  const [tableValidation, setTableValidation] = useState<any>(null);
  const [sessionOrders, setSessionOrders] = useState<any[]>([]);

  // Filtering & Navigation
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "ALL">(
    "ALL"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals / Drawers
  const [activeFoodItem, setActiveFoodItem] = useState<any | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemSpecialNote, setItemSpecialNote] = useState<string>("");
  const [customizationError, setCustomizationError] = useState<string | null>(
    null
  );

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isConfirmStep, setIsConfirmStep] = useState<boolean>(false);
  const [orderCustomerNote, setOrderCustomerNote] = useState<string>("");
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [orderSubmitError, setOrderSubmitError] = useState<string | null>(null);

  // Active Orders & Tracking Drawer
  const [isOrdersDrawerOpen, setIsOrdersDrawerOpen] = useState<boolean>(false);
  const [justSubmittedOrder, setJustSubmittedOrder] = useState<any | null>(
    null
  );

  // Table Switcher Modal
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [customTableInput, setCustomTableInput] = useState<string>("");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Check session intro state + persisted cart/lang + URL query param sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlTable = urlParams.get("table")?.trim().toUpperCase();
    if (urlTable && urlTable !== tableCode) {
      setTableCode(urlTable);
      return;
    }

    const savedLang = localStorage.getItem("amorino_lang") as LanguageCode;
    if (savedLang && ["en", "so", "sw"].includes(savedLang)) {
      setLang(savedLang);
    }
    const savedCart = localStorage.getItem(`amorino_cart_${tableCode}`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {}
    }

    const introSeen = sessionStorage.getItem("amorino_intro_seen");
    if (!introSeen) {
      setShowIntro(true);
    }
    setIntroChecked(true);
  }, [tableCode]);

  const handleCompleteIntro = useCallback(() => {
    setShowIntro(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("amorino_intro_seen", "1");
    }
  }, []);

  const handleLanguageChange = (newLang: LanguageCode) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("amorino_lang", newLang);
    }
  };

  // Persist cart per table
  useEffect(() => {
    if (typeof window !== "undefined" && introChecked) {
      localStorage.setItem(`amorino_cart_${tableCode}`, JSON.stringify(cart));
    }
  }, [cart, tableCode, introChecked]);

  // Online / Offline listeners
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateOnline = () => setIsOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  // Fetch bootstrap data (settings, menu, categories, table session & orders)
  const fetchBootstrap = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setNetworkError(null);
      try {
        const res = await fetch(
          `/api/public/bootstrap?table=${encodeURIComponent(tableCode)}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error("Failed to load restaurant data");
        }
        const data = await res.json();
        setSettings(data.settings);
        setCategories(data.categories || []);
        setMenuItems(data.menuItems || []);
        setActiveTables(data.activeTables || []);
        setTableValidation(data.tableValidation);
        setSessionOrders(data.tableValidation?.sessionOrders || []);

        // Keep justSubmittedOrder synced with latest status if open
        setJustSubmittedOrder((prev: any) => {
          if (!prev) return null;
          const updated = (data.tableValidation?.sessionOrders || []).find(
            (o: any) => o.id === prev.id
          );
          return updated || prev;
        });
      } catch (err: any) {
        if (!silent) {
          setNetworkError(err?.message || "Connection error");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [tableCode]
  );

  useEffect(() => {
    fetchBootstrap(false);
  }, [fetchBootstrap]);

  // Realtime SSE subscription + resilient fallback polling
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/events");
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            payload.type === "ORDER_UPDATED" ||
            payload.type === "ORDER_CREATED" ||
            payload.type === "MENU_UPDATED" ||
            payload.type === "SETTINGS_UPDATED" ||
            payload.type === "TABLE_UPDATED"
          ) {
            fetchBootstrap(true);
          }
        } catch {}
      };
    } catch {}

    // Fallback poll every 8 seconds in case proxy buffers SSE
    const fallbackInterval = setInterval(() => {
      fetchBootstrap(true);
    }, 8000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(fallbackInterval);
    };
  }, [fetchBootstrap]);

  // Switch table handler
  const handleSwitchTable = (newCode: string) => {
    const formatted = newCode.trim().toUpperCase();
    if (!formatted) return;
    setTableCode(formatted);
    setIsTableModalOpen(false);
    setCustomTableInput("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("table", formatted);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Open food item detail modal
  const openFoodDetail = (item: any) => {
    setActiveFoodItem(item);
    setSelectedOptionIds([]);
    setItemQuantity(1);
    setItemSpecialNote("");
    setCustomizationError(null);
  };

  const toggleCustomizationOption = (group: any, option: any) => {
    setCustomizationError(null);
    setSelectedOptionIds((prev) => {
      const exists = prev.includes(option.id);
      if (exists) {
        return prev.filter((id) => id !== option.id);
      }
      // Check max selections for this group
      const groupOptionIds = new Set(group.options.map((o: any) => o.id));
      const currentInGroup = prev.filter((id) => groupOptionIds.has(id));
      const maxAllowed = Number(group.max_selections || 5);
      if (maxAllowed === 1) {
        // Radio behavior
        return [
          ...prev.filter((id) => !groupOptionIds.has(id)),
          option.id,
        ];
      }
      if (currentInGroup.length >= maxAllowed) {
        setCustomizationError(
          `${t.selectUpTo} ${maxAllowed} (${localizeField(group, "name", lang)})`
        );
        return prev;
      }
      return [...prev, option.id];
    });
  };

  // Compute current modal item unit price & total
  const activeModalUnitPrice = useMemo(() => {
    if (!activeFoodItem) return 0;
    let base = Number(activeFoodItem.price || 0);
    for (const grp of activeFoodItem.customizationGroups || []) {
      for (const opt of grp.options || []) {
        if (selectedOptionIds.includes(opt.id)) {
          base += Number(opt.price_adjustment || 0);
        }
      }
    }
    return base;
  }, [activeFoodItem, selectedOptionIds]);

  const handleAddToCart = () => {
    if (!activeFoodItem) return;
    if (!activeFoodItem.is_available || !settings?.is_open) return;

    // Validate required groups
    for (const grp of activeFoodItem.customizationGroups || []) {
      const groupOptionIds = new Set(grp.options.map((o: any) => o.id));
      const count = selectedOptionIds.filter((id) =>
        groupOptionIds.has(id)
      ).length;
      const minReq = grp.is_required
        ? Math.max(1, Number(grp.min_selections || 1))
        : Number(grp.min_selections || 0);
      if (count < minReq) {
        setCustomizationError(
          `${t.selectAtLeast} ${minReq}: ${localizeField(grp, "name", lang)}`
        );
        return;
      }
    }

    const chosenOptions: any[] = [];
    for (const grp of activeFoodItem.customizationGroups || []) {
      for (const opt of grp.options || []) {
        if (selectedOptionIds.includes(opt.id)) {
          chosenOptions.push({
            ...opt,
            groupName: grp.name,
          });
        }
      }
    }

    const signature = `${activeFoodItem.id}-${[...selectedOptionIds]
      .sort()
      .join(",")}-${itemSpecialNote.trim()}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.cartItemId === signature);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + itemQuantity,
        };
        return updated;
      }
      return [
        ...prev,
        {
          cartItemId: signature,
          menuItem: activeFoodItem,
          quantity: itemQuantity,
          selectedOptions: chosenOptions,
          specialNote: itemSpecialNote.trim(),
          unitPrice: activeModalUnitPrice,
        },
      ];
    });

    setActiveFoodItem(null);
    triggerToast(
      `${itemQuantity} × ${localizeField(activeFoodItem, "name", lang)} — ${
        t.addedToOrderToast
      }`
    );
  };

  const updateCartItemQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Cart totals
  const cartTotalItems = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );
  const cartSubtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [cart]
  );
  const cartServiceCharge = useMemo(
    () =>
      Math.round(
        cartSubtotal * (Number(settings?.service_charge_percent || 0) / 100)
      ),
    [cartSubtotal, settings]
  );
  const cartTax = useMemo(
    () =>
      Math.round(cartSubtotal * (Number(settings?.tax_percent || 0) / 100)),
    [cartSubtotal, settings]
  );
  const cartGrandTotal = cartSubtotal + cartServiceCharge + cartTax;
  const cartEstimatedPrep = useMemo(() => {
    if (!cart.length) return 0;
    return Math.max(
      ...cart.map((c) => Number(c.menuItem.prep_time_minutes || 15))
    );
  }, [cart]);

  // Submit Order to Backend
  const handlePlaceOrder = async () => {
    if (!cart.length || submittingOrder) return;
    setSubmittingOrder(true);
    setOrderSubmitError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableCode,
          customerNote: orderCustomerNote,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
            selectedOptionIds: c.selectedOptions.map((o) => o.id),
            specialNote: c.specialNote,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOrderSubmitError(
          data.error || "Unable to place order. Please try again."
        );
        setSubmittingOrder(false);
        return;
      }

      // Clear cart and transition into live Order Confirmation & Tracking
      setCart([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem(`amorino_cart_${tableCode}`);
      }
      setOrderCustomerNote("");
      setIsConfirmStep(false);
      setIsCartOpen(false);
      setJustSubmittedOrder(data.order);
      setIsOrdersDrawerOpen(true);
      await fetchBootstrap(true);
    } catch (err: any) {
      setOrderSubmitError(
        "Network connection interrupted while sending your order. Please try again."
      );
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (
        selectedCategoryId !== "ALL" &&
        item.category_id !== selectedCategoryId
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = localizeField(item, "name", lang)
          .toLowerCase()
          .includes(q);
        const descMatch = localizeField(item, "description", lang)
          .toLowerCase()
          .includes(q);
        const ingMatch = (item.ingredients || []).some((i: string) =>
          i.toLowerCase().includes(q)
        );
        return nameMatch || descMatch || ingMatch;
      }
      return true;
    });
  }, [menuItems, selectedCategoryId, searchQuery, lang]);

  // Featured dish for Hero
  const featuredDish = useMemo(() => {
    return (
      menuItems.find((i) => i.is_featured && i.is_available) || menuItems[0]
    );
  }, [menuItems]);

  // Active non-completed orders in current table session
  const activeSessionOrders = useMemo(
    () =>
      sessionOrders.filter((o) =>
        ["PENDING", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
      ),
    [sessionOrders]
  );

  const currency = settings?.currency || "KES";
  const isRestaurantOpen = settings ? Boolean(settings.is_open) : true;

  return (
    <div className="min-h-screen bg-obsidian text-crema flex flex-col relative pb-28">
      {/* 1. CINEMATIC INTRO FILM */}
      {showIntro && (
        <CinematicIntro
          tableCode={tableCode}
          skipLabel={t.skipIntro}
          tableLabel={t.tableLabel}
          onComplete={handleCompleteIntro}
        />
      )}

      {/* OFFLINE CONNECTION BANNER (Section 30) */}
      {isOffline && (
        <div className="bg-saffron-bg border-b border-saffron/40 px-4 py-2.5 text-center text-xs text-saffron-light flex items-center justify-center gap-2 z-40">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>{t.offlineBanner}</span>
        </div>
      )}

      {/* 2. TOP LUXURY HEADER */}
      <header className="sticky top-0 z-30 bg-obsidian/90 backdrop-blur-md border-b border-gold/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
          {/* Brand Logo + Restaurant Name + Discreet Table Number */}
          <div className="flex items-center gap-3.5 min-w-0">
            <AmorinoLogo
              size={48}
              className="border border-gold/30 shadow-[0_0_20px_rgba(212,168,83,0.18)]"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="font-serif text-lg sm:text-xl tracking-[0.04em] text-crema truncate font-medium">
                  {settings?.name || "Amorino Cafe & Restaurant"}
                </span>
              </div>
              {/* Discreet Table Number Pill (Section 3) */}
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  onClick={() => setIsTableModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.22em] text-gold hover:text-gold-light transition"
                  title={t.changeTable}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span>
                    {t.tableLabel} {tableCode.replace(/^T0?/, "")}
                  </span>
                </button>
                <span className="text-taupe text-[10px]">•</span>
                <button
                  onClick={() => setShowIntro(true)}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-taupe hover:text-champagne transition"
                >
                  <Film className="w-3 h-3" />
                  <span className="hidden sm:inline">{t.replayIntro}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Controls: Language Selector, Active Orders Button, Cart Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Trilingual Selector: English, Somali, Swahili (Section 6) */}
            <div
              className="flex items-center bg-umber border border-gold/20 rounded-full p-0.5"
              role="group"
              aria-label="Language Selector"
            >
              {SUPPORTED_LANGUAGES.map((l) => {
                const active = lang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => handleLanguageChange(l.code)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                      active
                        ? "bg-gold text-obsidian shadow-sm"
                        : "text-champagne hover:text-crema"
                    }`}
                    title={l.label}
                  >
                    <span>{l.flag}</span>
                    <span className="uppercase tracking-wider text-[10px] font-semibold">
                      {l.code}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Table Session Orders Tracking Button (Section 14 & 15) */}
            <button
              onClick={() => {
                setJustSubmittedOrder(null);
                setIsOrdersDrawerOpen(true);
              }}
              className={`relative px-3.5 py-2 rounded-full border text-xs font-medium transition-all flex items-center gap-2 ${
                activeSessionOrders.length > 0
                  ? "bg-roast border-gold/40 text-gold-light hover:border-gold"
                  : "bg-umber border-gold/15 text-champagne hover:text-crema"
              }`}
              aria-label={t.tableOrdersTitle}
            >
              <Clock className="w-3.5 h-3.5 text-gold" />
              <span className="hidden md:inline">{t.viewActiveOrders}</span>
              {sessionOrders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-gold/20 text-gold font-mono text-[11px] font-semibold">
                  {sessionOrders.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={() => {
                setIsConfirmStep(false);
                setIsCartOpen(true);
              }}
              className="relative px-4 py-2 rounded-full bg-gold hover:bg-gold-light text-obsidian font-semibold text-xs tracking-wide transition-all flex items-center gap-2 shadow-gold-glow"
              aria-label={t.yourOrderCart}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="font-mono">{cartTotalItems}</span>
              {cartSubtotal > 0 && (
                <span className="hidden sm:inline font-mono border-l border-obsidian/25 pl-2">
                  {currency} {cartSubtotal.toLocaleString()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 3. RESTAURANT CLOSED MODE BANNER (Section 21) */}
      {!loading && !isRestaurantOpen && (
        <div className="bg-gradient-to-r from-roast via-umber to-roast border-b border-gold/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-gold" />
              </div>
              <div>
                <h2 className="font-serif text-lg text-crema font-medium">
                  {t.currentlyClosedTitle}
                </h2>
                <p className="text-xs text-champagne">
                  {t.currentlyClosedSubtitle}
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-obsidian/80 border border-gold/25 text-xs font-mono text-gold">
              {t.openingHoursLabel}: {settings?.opening_hours}
            </div>
          </div>
        </div>
      )}

      {/* 4. ERROR STATE: NETWORK ERROR (Section 22 & 56) */}
      {networkError && (
        <div className="max-w-xl mx-auto my-16 px-6 text-center">
          <div className="p-8 rounded-2xl bg-umber border border-gold/20 shadow-luxury">
            <AlertCircle className="w-10 h-10 text-gold mx-auto mb-4" />
            <h2 className="font-serif text-2xl text-crema mb-2">
              {t.networkErrorTitle}
            </h2>
            <p className="text-sm text-champagne mb-6">
              {t.networkErrorSubtitle}
            </p>
            <button
              onClick={() => fetchBootstrap(false)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold text-obsidian text-xs font-semibold uppercase tracking-widest hover:bg-gold-light transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t.retryAction}
            </button>
          </div>
        </div>
      )}

      {/* 5. ERROR STATE: INVALID OR DISABLED TABLE QR (Section 22) */}
      {!loading &&
        !networkError &&
        tableValidation &&
        !tableValidation.valid && (
          <div className="max-w-2xl mx-auto my-12 px-4 sm:px-6">
            <div className="p-8 sm:p-10 rounded-2xl bg-umber border border-gold/30 shadow-luxury text-center">
              <AmorinoLogo size={72} className="mx-auto mb-5 border border-gold/30" />
              <span className="inline-block px-3 py-1 rounded-full bg-terracotta-bg border border-terracotta/40 text-terracotta-light text-[11px] font-mono uppercase tracking-widest mb-3">
                QR CODE: {tableCode}
              </span>
              <h2 className="font-serif text-3xl text-crema mb-3">
                {t.invalidTableTitle}
              </h2>
              <p className="text-sm text-champagne max-w-md mx-auto mb-8 leading-relaxed">
                {t.invalidTableSubtitle}
              </p>
              <div className="text-left">
                <p className="text-xs uppercase tracking-[0.2em] text-gold mb-3 text-center">
                  {t.selectActiveTable}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {activeTables.map((tbl) => (
                    <button
                      key={tbl.code}
                      onClick={() => handleSwitchTable(tbl.code)}
                      className="p-3 rounded-xl bg-obsidian hover:bg-roast border border-gold/20 hover:border-gold transition text-center group"
                    >
                      <div className="font-mono text-sm font-semibold text-crema group-hover:text-gold">
                        {tbl.code}
                      </div>
                      <div className="text-[10px] text-taupe truncate">
                        {tbl.zone}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* 6. SKELETON LOADING STATE (Section 44) */}
      {loading && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          <div className="h-72 sm:h-80 rounded-2xl bg-umber border border-gold/10 animate-pulse p-8 flex flex-col justify-end">
            <div className="w-36 h-3 bg-roast rounded mb-4" />
            <div className="w-2/3 h-8 bg-roast rounded mb-3" />
            <div className="w-1/2 h-4 bg-roast rounded" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-10 w-32 rounded-full bg-umber border border-gold/10 animate-pulse shrink-0"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-96 rounded-2xl bg-umber border border-gold/10 animate-pulse overflow-hidden flex flex-col"
              >
                <div className="h-52 bg-roast" />
                <div className="p-5 space-y-3 flex-1">
                  <div className="h-5 w-3/4 bg-roast rounded" />
                  <div className="h-3 w-full bg-roast rounded" />
                  <div className="h-3 w-2/3 bg-roast rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. MAIN LUXURY DIGITAL FOOD CATALOGUE */}
      {!loading &&
        !networkError &&
        (!tableValidation || tableValidation.valid) && (
          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-10 flex-1">
            {/* ACTIVE TABLE ORDERS LIVE STATUS STRIP (Section 14 & 15) */}
            {activeSessionOrders.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-umber via-roast to-umber border border-gold/30 p-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-luxury">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-gold/15 border border-gold/35 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-gold">
                        {t.tableLabel} {tableCode.replace(/^T0?/, "")} •{" "}
                        {activeSessionOrders.length} {t.activeOrdersCount}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      {activeSessionOrders.slice(0, 3).map((ord) => (
                        <button
                          key={ord.id}
                          onClick={() => {
                            setJustSubmittedOrder(ord);
                            setIsOrdersDrawerOpen(true);
                          }}
                          className="text-xs text-crema hover:text-gold transition flex items-center gap-1.5"
                        >
                          <span className="font-mono font-semibold text-gold-light">
                            #{ord.order_number}
                          </span>
                          <span className="text-taupe">—</span>
                          <span>{ renderOrderStatusShort(ord.status, t) }</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setJustSubmittedOrder(null);
                    setIsOrdersDrawerOpen(true);
                  }}
                  className="px-4 py-2 rounded-full bg-obsidian hover:bg-umber border border-gold/30 text-xs uppercase tracking-[0.16em] text-gold-light flex items-center gap-1.5 shrink-0 self-end sm:self-auto transition"
                >
                  <span>{t.viewActiveOrders}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* EDITORIAL HERO SECTION (Section 5) */}
            {featuredDish && (
              <section className="relative rounded-2xl overflow-hidden border border-gold/20 bg-umber shadow-luxury">
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[340px] lg:min-h-[400px]">
                  {/* Left Editorial Typography Column */}
                  <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative z-10 bg-gradient-to-t lg:bg-gradient-to-r from-obsidian via-obsidian/95 to-obsidian/60">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/25 text-[10px] uppercase tracking-[0.28em] text-gold">
                        <span>
                          {localizeField(settings, "seasonal_badge", lang) ||
                            t.editorialTagline}
                        </span>
                      </div>
                      <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-crema leading-[1.12] font-normal">
                        {localizeField(settings, "hero_statement", lang) ||
                          settings?.hero_statement_en}
                      </h1>
                    </div>

                    {/* Featured Dish Highlight Box */}
                    <div className="mt-8 pt-6 border-t border-gold/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.24em] text-gold block mb-1">
                          {t.seasonalHighlight}
                        </span>
                        <h2 className="font-serif text-2xl text-crema">
                          {localizeField(featuredDish, "name", lang)}
                        </h2>
                        <p className="text-xs text-champagne line-clamp-1 mt-0.5 max-w-md">
                          {localizeField(featuredDish, "description", lang)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-widest text-taupe block">
                            {currency}
                          </span>
                          <span className="font-mono text-lg font-semibold text-gold-light">
                            {Number(featuredDish.price).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => openFoodDetail(featuredDish)}
                          className="px-5 py-3 rounded-full bg-gold hover:bg-gold-light text-obsidian font-semibold text-xs uppercase tracking-[0.14em] transition flex items-center gap-2"
                        >
                          <span>{t.exploreSignature}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Culinary Photography Column */}
                  <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full overflow-hidden order-first lg:order-last">
                    <img
                      src={featuredDish.image_url}
                      alt={localizeField(featuredDish, "name", lang)}
                      className="w-full h-full object-cover object-center transform hover:scale-105 transition duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-obsidian via-obsidian/30 to-transparent" />
                  </div>
                </div>
              </section>
            )}

            {/* STICKY CATEGORY NAVIGATION & SEARCH BAR (Section 7) */}
            <section className="sticky top-20 z-20 py-3 bg-obsidian/95 backdrop-blur-md border-b border-gold/15 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Horizontal Category Pills */}
                <div
                  className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0"
                  role="tablist"
                  aria-label="Menu Categories"
                >
                  <button
                    role="tab"
                    aria-selected={selectedCategoryId === "ALL"}
                    onClick={() => setSelectedCategoryId("ALL")}
                    className={`px-4 py-2 rounded-full text-xs tracking-wider uppercase font-medium shrink-0 transition-all ${
                      selectedCategoryId === "ALL"
                        ? "bg-gold text-obsidian font-semibold shadow-gold-glow"
                        : "bg-umber text-champagne hover:text-crema border border-gold/15"
                    }`}
                  >
                    {t.allCategories}
                  </button>
                  {categories.map((cat) => {
                    const active = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`px-4 py-2 rounded-full text-xs tracking-wider uppercase font-medium shrink-0 transition-all ${
                          active
                            ? "bg-gold text-obsidian font-semibold shadow-gold-glow"
                            : "bg-umber text-champagne hover:text-crema border border-gold/15"
                        }`}
                      >
                        {localizeField(cat, "name", lang)}
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-64 shrink-0">
                  <Search className="w-3.5 h-3.5 text-taupe absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-9 pr-8 py-2 rounded-full bg-umber border border-gold/20 focus:border-gold text-xs text-crema placeholder:text-taupe focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe hover:text-crema"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* EMPTY MENU STATE (Section 43) */}
            {filteredMenuItems.length === 0 && (
              <div className="py-20 text-center">
                <Utensils className="w-10 h-10 text-gold/50 mx-auto mb-4" />
                <h3 className="font-serif text-2xl text-crema mb-1">
                  {t.emptyMenuTitle}
                </h3>
                <p className="text-xs text-champagne">{t.emptyMenuSubtitle}</p>
              </div>
            )}

            {/* MENU SECTIONS BY CATEGORY */}
            <div className="space-y-14">
              {categories
                .filter(
                  (c) =>
                    selectedCategoryId === "ALL" || c.id === selectedCategoryId
                )
                .map((category) => {
                  const itemsInCat = filteredMenuItems.filter(
                    (i) => i.category_id === category.id
                  );
                  if (itemsInCat.length === 0) return null;

                  return (
                    <section
                      key={category.id}
                      id={`cat-${category.slug}`}
                      className="space-y-6"
                    >
                      {/* Editorial Category Header */}
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-gold/15 pb-4">
                        <div>
                          <h2 className="font-serif text-2xl sm:text-3xl text-crema tracking-wide">
                            {localizeField(category, "name", lang)}
                          </h2>
                          <p className="text-xs sm:text-sm text-champagne mt-1 max-w-2xl">
                            {localizeField(category, "description", lang)}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-taupe">
                          {itemsInCat.length}{" "}
                          {itemsInCat.length === 1 ? "Selection" : "Selections"}
                        </span>
                      </div>

                      {/* Luxury Dish Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {itemsInCat.map((item) => (
                          <article
                            key={item.id}
                            onClick={() => openFoodDetail(item)}
                            className={`group rounded-2xl bg-umber border border-gold/15 hover:border-gold/45 overflow-hidden shadow-luxury hover:shadow-luxury-hover transition-all duration-300 flex flex-col cursor-pointer ${
                              !item.is_available ? "opacity-65" : ""
                            }`}
                          >
                            {/* Dish Image */}
                            <div className="relative h-56 overflow-hidden bg-roast">
                              <img
                                src={item.image_url}
                                alt={localizeField(item, "name", lang)}
                                loading="lazy"
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-umber via-transparent to-black/30" />

                              {/* Top Left Badges */}
                              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                {item.is_featured && (
                                  <span className="px-2.5 py-1 rounded-full bg-obsidian/90 backdrop-blur-md border border-gold/40 text-[10px] uppercase tracking-[0.18em] text-gold font-medium">
                                    {t.featuredBadge}
                                  </span>
                                )}
                                {item.is_popular && (
                                  <span className="px-2.5 py-1 rounded-full bg-roast/90 backdrop-blur-md border border-gold/25 text-[10px] uppercase tracking-[0.18em] text-crema">
                                    {t.popularBadge}
                                  </span>
                                )}
                              </div>

                              {/* Prep Time Pill */}
                              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-obsidian/85 backdrop-blur-md border border-gold/20 text-[10px] font-mono text-champagne flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gold" />
                                <span>{item.prep_estimate_label}</span>
                              </div>

                              {/* Unavailable Overlay */}
                              {!item.is_available && (
                                <div className="absolute inset-0 bg-obsidian/75 backdrop-blur-[2px] flex items-center justify-center">
                                  <span className="px-4 py-1.5 rounded-full bg-terracotta-bg border border-terracotta/50 text-terracotta-light text-xs uppercase tracking-widest font-medium">
                                    {t.unavailableBadge}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Card Content */}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-3">
                                  <h3 className="font-serif text-xl text-crema group-hover:text-gold-light transition leading-snug">
                                    {localizeField(item, "name", lang)}
                                  </h3>
                                </div>
                                <p className="text-xs text-champagne mt-2 line-clamp-2 leading-relaxed">
                                  {localizeField(item, "description", lang)}
                                </p>
                              </div>

                              {/* Price & Action Footer */}
                              <div className="mt-5 pt-4 border-t border-gold/10 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] uppercase tracking-widest text-taupe block">
                                    {item.currency || currency}
                                  </span>
                                  <span className="font-mono text-base font-semibold text-crema">
                                    {Number(item.price).toLocaleString()}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFoodDetail(item);
                                  }}
                                  disabled={!item.is_available}
                                  className={`px-4 py-2 rounded-full text-xs font-medium tracking-wider uppercase transition flex items-center gap-1.5 ${
                                    item.is_available && isRestaurantOpen
                                      ? "bg-roast group-hover:bg-gold text-gold-light group-hover:text-obsidian border border-gold/30"
                                      : "bg-roast/50 text-taupe border border-gold/10"
                                  }`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>{t.addToOrder}</span>
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
            </div>
          </main>
        )}

      {/* 8. EDITORIAL FOOTER WITH PLACEHOLDERS (Section 39 & 55) & ROLE PORTAL LINKS */}
      <footer className="mt-20 border-t border-gold/15 bg-espresso py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <AmorinoLogo size={56} className="border border-gold/30" />
            <div>
              <h3 className="font-serif text-xl text-crema">
                {settings?.name || "Amorino Cafe & Restaurant"}
              </h3>
              <p className="text-xs text-champagne mt-0.5">
                {settings?.address_placeholder || "[Restaurant Address] • Kenya"}
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] text-taupe mt-1 font-mono">
                <span>{settings?.opening_hours || "[Opening Hours]"}</span>
                <span>•</span>
                <span>{settings?.phone_placeholder || "[Phone Number]"}</span>
                <span>•</span>
                <span>{settings?.instagram_placeholder || "[Instagram]"}</span>
              </div>
            </div>
          </div>

          {/* Operational Consoles Links (Staff / Kitchen / Admin) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/staff"
              className="px-3.5 py-2 rounded-full bg-umber hover:bg-roast border border-gold/20 text-xs text-champagne hover:text-gold transition flex items-center gap-1.5"
            >
              <ClipboardList className="w-3.5 h-3.5 text-gold" />
              <span>{t.staffPortal}</span>
            </Link>
            <Link
              href="/kitchen"
              className="px-3.5 py-2 rounded-full bg-umber hover:bg-roast border border-gold/20 text-xs text-champagne hover:text-gold transition flex items-center gap-1.5"
            >
              <ChefHat className="w-3.5 h-3.5 text-gold" />
              <span>{t.kitchenDisplay}</span>
            </Link>
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-full bg-umber hover:bg-roast border border-gold/20 text-xs text-champagne hover:text-gold transition flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-gold" />
              <span>{t.adminConsole}</span>
            </Link>
          </div>
        </div>
      </footer>

      {/* 9. STICKY MOBILE/FLOATING CART BAR (Section 28 & 45) */}
      {cartTotalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-5 inset-x-0 z-30 px-4 max-w-lg mx-auto">
          <button
            onClick={() => {
              setIsConfirmStep(false);
              setIsCartOpen(true);
            }}
            className="w-full py-3.5 px-5 rounded-full bg-gold hover:bg-gold-light text-obsidian shadow-[0_15px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(212,168,83,0.4)] flex items-center justify-between transition-all transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-obsidian text-gold font-mono text-xs font-bold flex items-center justify-center">
                {cartTotalItems}
              </span>
              <div className="text-left">
                <span className="text-xs font-bold uppercase tracking-wider block">
                  {t.yourOrderCart}
                </span>
                <span className="text-[10px] font-mono opacity-80 block">
                  {t.tableLabel} {tableCode.replace(/^T0?/, "")} • ~
                  {cartEstimatedPrep} {t.minutesShort}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-sm">
              <span>
                {currency} {cartGrandTotal.toLocaleString()}
              </span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-umber/95 border border-gold text-crema text-xs shadow-luxury flex items-center gap-2 animate-bounce">
          <Check className="w-3.5 h-3.5 text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 10. FOOD ITEM DETAIL & CUSTOMIZATION MODAL (Section 9 & 10) */}
      {activeFoodItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActiveFoodItem(null)}
        >
          <div
            className="bg-umber border-t sm:border border-gold/30 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-luxury flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Large Food Image Header */}
            <div className="relative h-64 sm:h-72 w-full shrink-0 bg-roast">
              <img
                src={activeFoodItem.image_url}
                alt={localizeField(activeFoodItem, "name", lang)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-umber via-transparent to-black/40" />
              <button
                onClick={() => setActiveFoodItem(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-obsidian/80 hover:bg-obsidian border border-gold/30 flex items-center justify-center text-crema"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-obsidian/85 border border-gold/30 text-[10px] font-mono text-gold mb-2">
                    <Clock className="w-3 h-3" />
                    {activeFoodItem.prep_estimate_label}
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl text-crema">
                    {localizeField(activeFoodItem, "name", lang)}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono uppercase text-champagne block">
                    {currency}
                  </span>
                  <span className="font-mono text-xl font-bold text-gold-light">
                    {Number(activeFoodItem.price).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Dish Details Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <p className="text-sm text-champagne leading-relaxed">
                {localizeField(activeFoodItem, "description", lang)}
              </p>

              {/* Ingredients & Allergens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gold/10">
                {activeFoodItem.ingredients?.length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-gold mb-2">
                      {t.ingredientsLabel}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeFoodItem.ingredients.map((ing: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-full bg-obsidian border border-gold/15 text-[11px] text-champagne"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeFoodItem.allergens?.length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-taupe mb-2">
                      {t.allergensLabel}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeFoodItem.allergens.map((alg: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-full bg-roast border border-gold/20 text-[11px] text-gold-light"
                        >
                          {alg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CUSTOMIZATION GROUPS (Section 9) */}
              {activeFoodItem.customizationGroups?.length > 0 && (
                <div className="space-y-5 pt-2 border-t border-gold/15">
                  {activeFoodItem.customizationGroups.map((group: any) => (
                    <div key={group.id} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-serif text-lg text-crema">
                            {localizeField(group, "name", lang)}
                          </h4>
                          <p className="text-[11px] text-taupe">
                            {t.selectUpTo} {group.max_selections}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest ${
                            group.is_required
                              ? "bg-gold/20 text-gold border border-gold/40"
                              : "bg-obsidian text-taupe border border-gold/10"
                          }`}
                        >
                          {group.is_required ? t.requiredBadge : t.optionalBadge}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.options.map((opt: any) => {
                          const checked = selectedOptionIds.includes(opt.id);
                          const priceAdj = Number(opt.price_adjustment || 0);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                toggleCustomizationOption(group, opt)
                              }
                              className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                                checked
                                  ? "bg-roast border-gold text-crema"
                                  : "bg-obsidian/70 border-gold/15 text-champagne hover:border-gold/35"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                    checked
                                      ? "bg-gold border-gold text-obsidian"
                                      : "border-gold/30"
                                  }`}
                                >
                                  {checked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="text-xs font-medium truncate">
                                  {localizeField(opt, "name", lang)}
                                </span>
                              </div>
                              {priceAdj > 0 && (
                                <span className="text-[11px] font-mono text-gold shrink-0">
                                  + {currency} {priceAdj}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Special Instructions for Kitchen */}
              <div className="pt-2 border-t border-gold/15">
                <label className="block text-xs uppercase tracking-[0.18em] text-champagne mb-2">
                  {t.specialInstructions}
                </label>
                <input
                  type="text"
                  value={itemSpecialNote}
                  onChange={(e) => setItemSpecialNote(e.target.value)}
                  placeholder={t.specialInstructionsPlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-obsidian border border-gold/20 focus:border-gold text-xs text-crema placeholder:text-taupe focus:outline-none"
                />
              </div>

              {customizationError && (
                <div className="p-3 rounded-xl bg-terracotta-bg border border-terracotta/50 text-terracotta-light text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{customizationError}</span>
                </div>
              )}
            </div>

            {/* Modal Sticky Footer CTA */}
            <div className="p-4 sm:p-6 bg-obsidian border-t border-gold/20 flex items-center justify-between gap-4">
              {/* Quantity Control */}
              <div className="flex items-center bg-umber border border-gold/25 rounded-full p-1">
                <button
                  type="button"
                  onClick={() =>
                    setItemQuantity((q) => Math.max(1, q - 1))
                  }
                  className="w-8 h-8 rounded-full flex items-center justify-center text-champagne hover:text-crema hover:bg-roast transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-mono text-sm font-semibold text-crema">
                  {itemQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => Math.min(25, q + 1))}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-champagne hover:text-crema hover:bg-roast transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Primary CTA: Add to Order */}
              {activeFoodItem.is_available && isRestaurantOpen ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 px-6 rounded-full bg-gold hover:bg-gold-light text-obsidian font-semibold text-xs uppercase tracking-[0.16em] transition flex items-center justify-between shadow-gold-glow"
                >
                  <span>{t.addToOrder}</span>
                  <span className="font-mono font-bold text-sm">
                    {currency}{" "}
                    {(activeModalUnitPrice * itemQuantity).toLocaleString()}
                  </span>
                </button>
              ) : (
                <div className="flex-1 py-3 px-4 rounded-full bg-roast border border-gold/15 text-center text-xs text-taupe">
                  {!isRestaurantOpen
                    ? t.currentlyClosedTitle
                    : t.itemUnavailableNote}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 11. CART & ORDER CONFIRMATION DRAWER (Section 11 & 12) */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="w-full max-w-md bg-umber border-l border-gold/25 h-full flex flex-col shadow-luxury"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-gold/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold block">
                  {t.tableLabel} {tableCode.replace(/^T0?/, "")}
                </span>
                <h2 className="font-serif text-2xl text-crema">
                  {isConfirmStep ? t.confirmYourOrder : t.yourOrderCart}
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-9 h-9 rounded-full bg-obsidian border border-gold/20 flex items-center justify-center text-champagne hover:text-crema"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <ShoppingBag className="w-10 h-10 text-gold/40 mx-auto" />
                  <h3 className="font-serif text-2xl text-crema">
                    {t.emptyCartTitle}
                  </h3>
                  <p className="text-xs text-champagne max-w-xs mx-auto leading-relaxed">
                    {t.emptyCartSubtitle}
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 px-6 py-2.5 rounded-full bg-gold text-obsidian text-xs font-semibold uppercase tracking-widest"
                  >
                    {t.browseMenu}
                  </button>
                </div>
              ) : isConfirmStep ? (
                /* Clean Confirmation Step Before Submitting (Section 11) */
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-obsidian border border-gold/30 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gold font-mono uppercase tracking-widest">
                      <span>
                        {t.tableLabel} {tableCode.replace(/^T0?/, "")}
                      </span>
                      <span>
                        ~{cartEstimatedPrep} {t.minutesShort}
                      </span>
                    </div>
                    <p className="text-xs text-champagne leading-relaxed">
                      {t.confirmOrderSubtitle}
                    </p>
                  </div>

                  <div className="space-y-3 divide-y divide-gold/10">
                    {cart.map((c) => (
                      <div key={c.cartItemId} className="pt-3 first:pt-0">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-crema">
                            <span className="font-mono text-gold mr-1.5">
                              {c.quantity} ×
                            </span>
                            {localizeField(c.menuItem, "name", lang)}
                          </span>
                          <span className="font-mono text-crema">
                            {currency}{" "}
                            {(c.unitPrice * c.quantity).toLocaleString()}
                          </span>
                        </div>
                        {c.selectedOptions.length > 0 && (
                          <div className="text-[11px] text-champagne mt-1 pl-6 space-y-0.5">
                            {c.selectedOptions.map((o) => (
                              <div key={o.id}>
                                + {localizeField(o, "name", lang)}
                                {o.price_adjustment > 0
                                  ? ` (+${currency} ${o.price_adjustment})`
                                  : ""}
                              </div>
                            ))}
                          </div>
                        )}
                        {c.specialNote && (
                          <div className="text-[11px] text-gold-light italic mt-1 pl-6">
                            “{c.specialNote}”
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-champagne mb-1.5">
                      {t.orderNoteLabel}
                    </label>
                    <textarea
                      rows={2}
                      value={orderCustomerNote}
                      onChange={(e) => setOrderCustomerNote(e.target.value)}
                      placeholder={t.orderNotePlaceholder}
                      className="w-full p-3 rounded-xl bg-obsidian border border-gold/20 text-xs text-crema placeholder:text-taupe focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-roast/60 border border-gold/20 text-[11px] text-champagne flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-gold shrink-0" />
                    <span>{t.paymentNotice}</span>
                  </div>

                  {orderSubmitError && (
                    <div className="p-3.5 rounded-xl bg-terracotta-bg border border-terracotta/50 text-terracotta-light text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{orderSubmitError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Cart Items List */
                <div className="space-y-4">
                  {cart.map((c) => (
                    <div
                      key={c.cartItemId}
                      className="p-4 rounded-2xl bg-obsidian border border-gold/15 flex gap-3.5"
                    >
                      <img
                        src={c.menuItem.image_url}
                        alt={localizeField(c.menuItem, "name", lang)}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 bg-roast"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif text-base text-crema truncate">
                            {localizeField(c.menuItem, "name", lang)}
                          </h4>
                          <span className="font-mono text-xs font-semibold text-gold-light shrink-0">
                            {currency}{" "}
                            {(c.unitPrice * c.quantity).toLocaleString()}
                          </span>
                        </div>

                        {c.selectedOptions.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {c.selectedOptions.map((o) => (
                              <div
                                key={o.id}
                                className="text-[11px] text-champagne"
                              >
                                + {localizeField(o, "name", lang)}
                              </div>
                            ))}
                          </div>
                        )}

                        {c.specialNote && (
                          <div className="text-[11px] text-gold/90 italic mt-1">
                            “{c.specialNote}”
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-taupe">
                            {currency} {c.unitPrice.toLocaleString()} each
                          </span>
                          <div className="flex items-center gap-2 bg-umber border border-gold/20 rounded-full px-2 py-0.5">
                            <button
                              onClick={() => updateCartItemQty(c.cartItemId, -1)}
                              className="text-champagne hover:text-crema p-1"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs text-crema w-4 text-center">
                              {c.quantity}
                            </span>
                            <button
                              onClick={() => updateCartItemQty(c.cartItemId, 1)}
                              className="text-champagne hover:text-crema p-1"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer Totals & CTA */}
            {cart.length > 0 && (
              <div className="p-6 bg-obsidian border-t border-gold/20 space-y-4">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-champagne">
                    <span>{t.subtotal}</span>
                    <span className="font-mono">
                      {currency} {cartSubtotal.toLocaleString()}
                    </span>
                  </div>
                  {cartServiceCharge > 0 && (
                    <div className="flex justify-between text-champagne">
                      <span>{t.serviceCharge}</span>
                      <span className="font-mono">
                        {currency} {cartServiceCharge.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {cartTax > 0 && (
                    <div className="flex justify-between text-champagne">
                      <span>{t.tax}</span>
                      <span className="font-mono">
                        {currency} {cartTax.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-champagne">
                    <span>{t.estimatedPrepTime}</span>
                    <span className="font-mono text-gold">
                      ~{cartEstimatedPrep} {t.minutesShort}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gold/15 flex justify-between text-sm font-semibold text-crema">
                    <span>{t.total}</span>
                    <span className="font-mono text-base text-gold-light">
                      {currency} {cartGrandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {!isRestaurantOpen ? (
                  <div className="p-3 rounded-full bg-roast border border-gold/20 text-center text-xs text-gold">
                    {t.currentlyClosedTitle}
                  </div>
                ) : isConfirmStep ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handlePlaceOrder}
                      disabled={submittingOrder}
                      className="w-full py-3.5 px-6 rounded-full bg-gold hover:bg-gold-light text-obsidian font-semibold text-xs uppercase tracking-[0.18em] transition shadow-gold-glow"
                    >
                      {submittingOrder ? t.submittingOrder : t.confirmAndSend}
                    </button>
                    <button
                      onClick={() => setIsConfirmStep(false)}
                      disabled={submittingOrder}
                      className="w-full py-2.5 rounded-full bg-umber text-champagne hover:text-crema text-xs uppercase tracking-widest"
                    >
                      {t.backToCart}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setOrderSubmitError(null);
                      setIsConfirmStep(true);
                    }}
                    className="w-full py-3.5 px-6 rounded-full bg-gold hover:bg-gold-light text-obsidian font-semibold text-xs uppercase tracking-[0.18em] transition shadow-gold-glow"
                  >
                    {t.placeOrder}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 12. REALTIME ORDER CONFIRMATION & MULTI-ORDER SESSION TRACKER (Section 12, 13, 14, 15, 46) */}
      {isOrdersDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end"
          onClick={() => setIsOrdersDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-umber border-l border-gold/30 h-full flex flex-col shadow-luxury"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gold/15 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AmorinoLogo size={40} className="border border-gold/30" />
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold block">
                    {t.tableLabel} {tableCode.replace(/^T0?/, "")}
                  </span>
                  <h2 className="font-serif text-2xl text-crema">
                    {justSubmittedOrder
                      ? t.orderReceivedTitle
                      : t.tableOrdersTitle}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsOrdersDrawerOpen(false)}
                className="w-9 h-9 rounded-full bg-obsidian border border-gold/20 flex items-center justify-center text-champagne hover:text-crema"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Highlight Banner when an order was just submitted (Section 46) */}
              {justSubmittedOrder && (
                <div className="p-6 rounded-2xl bg-gradient-to-b from-roast to-obsidian border border-gold/40 text-center space-y-3 shadow-luxury">
                  <span className="inline-block px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-[11px] font-mono text-gold uppercase tracking-widest">
                    {t.tableLabel} {justSubmittedOrder.table_code.replace(/^T0?/, "")}
                  </span>
                  <div className="font-mono text-3xl font-bold text-crema">
                    #{justSubmittedOrder.order_number}
                  </div>
                  <p className="font-serif text-xl text-gold-light">
                    {t.orderSentSubtitle}
                  </p>
                  {justSubmittedOrder.status === "PENDING" && (
                    <p className="text-xs text-champagne animate-pulse">
                      {t.waitingForStaff}
                    </p>
                  )}
                </div>
              )}

              {/* All Orders in Current Table Session (Multiple Orders Per Table — Section 15) */}
              {sessionOrders.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-10 h-10 text-gold/40 mx-auto mb-3" />
                  <p className="text-sm text-champagne">
                    {t.noTableOrdersYet}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.2em] text-champagne">
                      {t.tableLabel} {tableCode.replace(/^T0?/, "")} —{" "}
                      {sessionOrders.length} Orders in Session
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-gold">
                      <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
                      LIVE
                    </span>
                  </div>

                  {sessionOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-5 rounded-2xl bg-obsidian border border-gold/20 space-y-4"
                    >
                      {/* Order Card Header */}
                      <div className="flex items-center justify-between border-b border-gold/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-lg font-bold text-crema">
                              Order #{ord.order_number}
                            </span>
                            <span className="text-xs font-mono text-taupe">
                              •{" "}
                              {new Date(ord.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-sm font-semibold text-gold-light">
                          {ord.currency || "KES"}{" "}
                          {Number(ord.total).toLocaleString()}
                        </span>
                      </div>

                      {/* Realtime Status Badge & Progress Bar (Section 14) */}
                      <OrderStatusTimeline order={ord} t={t} />

                      {/* Order Items Summary */}
                      <div className="space-y-2 pt-2 border-t border-gold/10">
                        {(ord.items || []).map((item: any) => (
                          <div key={item.id} className="text-xs">
                            <div className="flex justify-between text-crema">
                              <span>
                                <strong className="font-mono text-gold mr-1.5">
                                  {item.quantity} ×
                                </strong>
                                {localizeField(item, "item_name", lang)}
                              </span>
                              <span className="font-mono text-champagne">
                                {ord.currency || "KES"}{" "}
                                {Number(item.line_total).toLocaleString()}
                              </span>
                            </div>
                            {item.customizations?.length > 0 && (
                              <div className="pl-5 text-[11px] text-taupe">
                                {item.customizations
                                  .map((c: any) =>
                                    localizeField(c, "option_name", lang)
                                  )
                                  .join(", ")}
                              </div>
                            )}
                            {item.special_note && (
                              <div className="pl-5 text-[11px] text-gold/80 italic">
                                Note: {item.special_note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 bg-obsidian border-t border-gold/20">
              <button
                onClick={() => {
                  setJustSubmittedOrder(null);
                  setIsOrdersDrawerOpen(false);
                }}
                className="w-full py-3 rounded-full bg-gold hover:bg-gold-light text-obsidian font-semibold text-xs uppercase tracking-[0.18em] transition"
              >
                {t.orderMoreItems}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. TABLE SWITCHER MODAL (Allows testing any table T01..T12 or invalid table code) */}
      {isTableModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsTableModalOpen(false)}
        >
          <div
            className="bg-umber border border-gold/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-luxury"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-crema">
                {t.selectActiveTable}
              </h3>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="text-champagne hover:text-crema"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {activeTables.map((tbl) => {
                const isCurrent = tbl.code === tableCode;
                return (
                  <button
                    key={tbl.code}
                    onClick={() => handleSwitchTable(tbl.code)}
                    className={`p-3 rounded-xl border text-center transition ${
                      isCurrent
                        ? "bg-gold text-obsidian border-gold font-bold"
                        : "bg-obsidian hover:bg-roast border-gold/20 text-crema"
                    }`}
                  >
                    <div className="font-mono text-sm">{tbl.code}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isCurrent ? "text-obsidian/80" : "text-taupe"
                      }`}
                    >
                      {tbl.zone}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-gold/15">
              <label className="block text-[10px] uppercase tracking-widest text-taupe mb-2">
                Test Custom / Invalid QR Table Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTableInput}
                  onChange={(e) => setCustomTableInput(e.target.value)}
                  placeholder="E.g. T12 or INVALID99"
                  className="flex-1 px-3 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs font-mono text-crema"
                />
                <button
                  onClick={() => handleSwitchTable(customTableInput)}
                  className="px-4 py-2 rounded-xl bg-roast border border-gold/30 text-xs text-gold hover:bg-gold hover:text-obsidian transition font-medium"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderOrderStatusShort(status: string, t: any) {
  switch (status) {
    case "PENDING":
      return `🕐 ${t.statusPending}`;
    case "ACCEPTED":
      return `✓ ${t.statusAccepted}`;
    case "PREPARING":
      return `🔥 ${t.statusPreparing}`;
    case "READY":
      return `✓ ${t.statusReady}`;
    case "COMPLETED":
      return `✓ ${t.statusCompleted}`;
    case "CANCELLED":
      return `✕ ${t.statusCancelled}`;
    default:
      return status;
  }
}

function OrderStatusTimeline({ order, t }: { order: any; t: any }) {
  const steps = [
    { key: "PENDING", label: `🕐 ${t.statusPending}`, desc: t.statusDescPending },
    { key: "ACCEPTED", label: `✓ ${t.statusAccepted}`, desc: t.statusDescAccepted },
    { key: "PREPARING", label: `🔥 ${t.statusPreparing}`, desc: t.statusDescPreparing },
    { key: "READY", label: `✓ ${t.statusReady}`, desc: t.statusDescReady },
    { key: "COMPLETED", label: `✓ ${t.statusCompleted}`, desc: t.statusDescCompleted },
  ];

  if (order.status === "CANCELLED") {
    return (
      <div className="p-3.5 rounded-xl bg-terracotta-bg border border-terracotta/40 text-terracotta-light">
        <div className="text-xs font-semibold uppercase tracking-wider">
          ✕ {t.statusCancelled}
        </div>
        <p className="text-[11px] opacity-90 mt-0.5">
          {order.rejection_reason || t.statusDescCancelled}
        </p>
      </div>
    );
  }

  const currentIdx = Math.max(
    0,
    steps.findIndex((s) => s.key === order.status)
  );
  const currentStep = steps[currentIdx];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold tracking-wide px-3 py-1 rounded-full border ${
            order.status === "READY" || order.status === "COMPLETED"
              ? "bg-sage-bg border-sage/50 text-sage-light"
              : order.status === "PREPARING"
              ? "bg-saffron-bg border-saffron/50 text-saffron-light"
              : "bg-roast border-gold/35 text-gold-light"
          }`}
        >
          {currentStep.label}
        </span>
        <span className="text-[11px] font-mono text-taupe">
          Est. ~{order.estimated_prep_minutes || 15} mins
        </span>
      </div>

      <p className="text-xs text-champagne">{currentStep.desc}</p>

      {/* Elegant 5-stage progress bar */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {steps.map((s, idx) => {
          const completed = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div
              key={s.key}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                completed
                  ? isCurrent
                    ? "bg-gold animate-pulse"
                    : "bg-gold/80"
                  : "bg-roast"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
