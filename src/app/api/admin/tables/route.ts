import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { realtimeBus } from "@/lib/events";
import QRCode from "qrcode";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["ADMIN", "STAFF"]);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const origin =
      searchParams.get("origin") ||
      req.headers.get("origin") ||
      "https://amorino.co.ke";

    const tables = db
      .prepare("SELECT * FROM tables ORDER BY code ASC")
      .all() as any[];

    const activeSessions = db
      .prepare("SELECT * FROM table_sessions WHERE status = 'ACTIVE'")
      .all() as any[];

    const activeOrdersCountByTable = db
      .prepare(
        `SELECT table_code, COUNT(*) as count, SUM(total) as active_total
         FROM orders
         WHERE status IN ('PENDING', 'ACCEPTED', 'PREPARING', 'READY')
         GROUP BY table_code`
      )
      .all() as { table_code: string; count: number; active_total: number }[];

    const hydratedTables = await Promise.all(
      tables.map(async (t) => {
        const orderUrl = `${origin.replace(/\/$/, "")}/order?table=${encodeURIComponent(
          t.code
        )}`;
        const qrDataUrl = await QRCode.toDataURL(orderUrl, {
          width: 420,
          margin: 2,
          color: {
            dark: "#D4A853",
            light: "#070504",
          },
          errorCorrectionLevel: "H",
        });

        const activeSession = activeSessions.find((s) => s.table_id === t.id);
        const orderStat = activeOrdersCountByTable.find(
          (o) => o.table_code === t.code
        );

        return {
          ...t,
          is_active: Boolean(t.is_active),
          orderUrl,
          qrDataUrl,
          activeSession: activeSession || null,
          activeOrdersCount: orderStat?.count || 0,
          activeTotalKes: orderStat?.active_total || 0,
        };
      })
    );

    return NextResponse.json({ tables: hydratedTables });
  } catch (error) {
    console.error("GET /api/admin/tables error:", error);
    return NextResponse.json(
      { error: "Unable to load tables." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = getDb();
    const body = await req.json();
    const code = String(body.code || "")
      .trim()
      .toUpperCase();
    const name = String(body.name || `Table ${code}`).trim();
    const zone = String(body.zone || "Main Dining Salon").trim();
    const capacity = Number(body.capacity || 4);

    if (!code) {
      return NextResponse.json(
        { error: "Table code (e.g. T13) is required." },
        { status: 400 }
      );
    }

    const existing = db
      .prepare("SELECT id FROM tables WHERE UPPER(code) = ?")
      .get(code);
    if (existing) {
      return NextResponse.json(
        { error: `Table ${code} already exists.` },
        { status: 400 }
      );
    }

    const qrToken = `amr-${code.toLowerCase()}-${crypto
      .randomBytes(3)
      .toString("hex")}`;
    const res = db
      .prepare(
        "INSERT INTO tables (code, name, zone, capacity, qr_token, is_active) VALUES (?, ?, ?, ?, ?, 1)"
      )
      .run(code, name, zone, capacity, qrToken);

    realtimeBus.emitEvent({ type: "TABLE_UPDATED", tableCode: code });
    return NextResponse.json({ id: res.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/tables error:", error);
    return NextResponse.json(
      { error: "Failed to create table." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireRoles(req, ["ADMIN", "STAFF"]);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = getDb();
    const body = await req.json();
    const action = body.action;
    const id = Number(body.id);

    if (action === "TOGGLE_ACTIVE") {
      db.prepare("UPDATE tables SET is_active = ? WHERE id = ?").run(
        body.is_active ? 1 : 0,
        id
      );
      realtimeBus.emitEvent({ type: "TABLE_UPDATED" });
      return NextResponse.json({ success: true });
    }

    if (action === "REGENERATE_QR") {
      const table = db
        .prepare("SELECT * FROM tables WHERE id = ?")
        .get(id) as any;
      if (!table) {
        return NextResponse.json({ error: "Table not found." }, { status: 404 });
      }
      const newToken = `amr-${table.code.toLowerCase()}-${crypto
        .randomBytes(4)
        .toString("hex")}`;
      db.prepare("UPDATE tables SET qr_token = ? WHERE id = ?").run(
        newToken,
        id
      );
      realtimeBus.emitEvent({ type: "TABLE_UPDATED", tableCode: table.code });
      return NextResponse.json({ success: true, qr_token: newToken });
    }

    if (action === "NEW_SESSION") {
      const table = db
        .prepare("SELECT * FROM tables WHERE id = ?")
        .get(id) as any;
      if (!table) {
        return NextResponse.json({ error: "Table not found." }, { status: 404 });
      }
      db.prepare(
        "UPDATE table_sessions SET status = 'CLOSED', updated_at = datetime('now') WHERE table_id = ? AND status = 'ACTIVE'"
      ).run(id);
      const token = `sess-${table.code.toLowerCase()}-${crypto
        .randomBytes(4)
        .toString("hex")}`;
      db.prepare(
        "INSERT INTO table_sessions (table_id, table_code, session_token, status) VALUES (?, ?, ?, 'ACTIVE')"
      ).run(table.id, table.code, token);
      realtimeBus.emitEvent({ type: "TABLE_UPDATED", tableCode: table.code });
      return NextResponse.json({ success: true });
    }

    // Update table details
    db.prepare(
      "UPDATE tables SET name = ?, zone = ?, capacity = ?, is_active = ? WHERE id = ?"
    ).run(
      String(body.name || "").trim(),
      String(body.zone || "Main Salon").trim(),
      Number(body.capacity || 4),
      body.is_active ? 1 : 0,
      id
    );
    realtimeBus.emitEvent({ type: "TABLE_UPDATED" });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/admin/tables error:", error);
    return NextResponse.json(
      { error: "Failed to update table." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireRoles(req, ["ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    db.prepare("DELETE FROM tables WHERE id = ?").run(id);
    realtimeBus.emitEvent({ type: "TABLE_UPDATED" });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/tables error:", error);
    return NextResponse.json(
      { error: "Cannot delete table that has historical orders; disable it instead." },
      { status: 400 }
    );
  }
}
