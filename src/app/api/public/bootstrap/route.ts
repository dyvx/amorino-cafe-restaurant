import { NextRequest, NextResponse } from "next/server";
import { getDb, hydrateOrders } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const requestedTableCode = searchParams.get("table")?.trim().toUpperCase();

    const settings = db
      .prepare("SELECT * FROM restaurant_settings WHERE id = 1")
      .get() as any;

    const categories = db
      .prepare(
        "SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
      )
      .all() as any[];

    const rawMenuItems = db
      .prepare("SELECT * FROM menu_items ORDER BY sort_order ASC, id ASC")
      .all() as any[];

    const allGroups = db
      .prepare("SELECT * FROM customization_groups WHERE is_active = 1")
      .all() as any[];

    const allOptions = db
      .prepare(
        "SELECT * FROM customization_options WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
      )
      .all() as any[];

    const itemGroupLinks = db
      .prepare("SELECT * FROM menu_item_customization_groups")
      .all() as { menu_item_id: number; group_id: number }[];

    const groupsById = new Map<number, any>();
    for (const g of allGroups) {
      groupsById.set(g.id, {
        ...g,
        is_required: Boolean(g.is_required),
        is_active: Boolean(g.is_active),
        options: allOptions.filter((o) => o.group_id === g.id),
      });
    }

    const menuItems = rawMenuItems.map((item) => {
      const linkedGroupIds = itemGroupLinks
        .filter((link) => link.menu_item_id === item.id)
        .map((link) => link.group_id);
      const customizationGroups = linkedGroupIds
        .map((gid) => groupsById.get(gid))
        .filter(Boolean);

      return {
        ...item,
        is_available: Boolean(item.is_available),
        is_featured: Boolean(item.is_featured),
        is_popular: Boolean(item.is_popular),
        ingredients: safeParseJson(item.ingredients, []),
        allergens: safeParseJson(item.allergens, []),
        tags: safeParseJson(item.tags, []),
        customizationGroups,
      };
    });

    const activeTables = db
      .prepare(
        "SELECT id, code, name, zone, capacity, is_active FROM tables WHERE is_active = 1 ORDER BY code ASC"
      )
      .all() as any[];

    let tableValidation: {
      valid: boolean;
      table: any | null;
      session: any | null;
      sessionOrders: any[];
      errorReason?: string;
    } = {
      valid: false,
      table: null,
      session: null,
      sessionOrders: [],
    };

    if (requestedTableCode) {
      const tableRow = db
        .prepare("SELECT * FROM tables WHERE UPPER(code) = ?")
        .get(requestedTableCode) as any;

      if (!tableRow) {
        tableValidation = {
          valid: false,
          table: null,
          session: null,
          sessionOrders: [],
          errorReason: "NOT_FOUND",
        };
      } else if (!tableRow.is_active) {
        tableValidation = {
          valid: false,
          table: tableRow,
          session: null,
          sessionOrders: [],
          errorReason: "DISABLED",
        };
      } else {
        // Find or create active TableSession for this table
        let session = db
          .prepare(
            "SELECT * FROM table_sessions WHERE table_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1"
          )
          .get(tableRow.id) as any;

        if (!session) {
          const token = `sess-${tableRow.code.toLowerCase()}-${crypto
            .randomBytes(4)
            .toString("hex")}`;
          const res = db
            .prepare(
              "INSERT INTO table_sessions (table_id, table_code, session_token, status) VALUES (?, ?, ?, 'ACTIVE')"
            )
            .run(tableRow.id, tableRow.code, token);
          session = db
            .prepare("SELECT * FROM table_sessions WHERE id = ?")
            .get(res.lastInsertRowid);
        }

        const rawSessionOrders = db
          .prepare(
            "SELECT * FROM orders WHERE table_session_id = ? ORDER BY created_at DESC, id DESC"
          )
          .all(session.id) as any[];

        tableValidation = {
          valid: true,
          table: tableRow,
          session,
          sessionOrders: hydrateOrders(db, rawSessionOrders),
        };
      }
    }

    return NextResponse.json({
      settings: {
        ...settings,
        is_open: Boolean(settings.is_open),
      },
      categories,
      menuItems,
      activeTables,
      tableValidation,
    });
  } catch (error: any) {
    console.error("Bootstrap API Error:", error);
    return NextResponse.json(
      { error: "Unable to load restaurant catalogue. Please try again." },
      { status: 500 }
    );
  }
}

function safeParseJson<T>(val: string, fallback: T): T {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}
