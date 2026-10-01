import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, requireRoles } from "@/lib/auth";
import { realtimeBus } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["ADMIN", "STAFF"]);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getDb();
  const settings = db
    .prepare("SELECT * FROM restaurant_settings WHERE id = 1")
    .get() as any;

  const users = db
    .prepare(
      "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id ASC"
    )
    .all() as any[];

  return NextResponse.json({
    settings: {
      ...settings,
      is_open: Boolean(settings.is_open),
    },
    users: users.map((u) => ({ ...u, is_active: Boolean(u.is_active) })),
  });
}

export async function PUT(req: NextRequest) {
  const auth = requireRoles(req, ["ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = getDb();
    const body = await req.json();

    if (body.action === "TOGGLE_OPEN_MODE") {
      db.prepare(
        "UPDATE restaurant_settings SET is_open = ?, updated_at = datetime('now') WHERE id = 1"
      ).run(body.is_open ? 1 : 0);
      realtimeBus.emitEvent({ type: "SETTINGS_UPDATED" });
      return NextResponse.json({ success: true, is_open: Boolean(body.is_open) });
    }

    if (body.action === "CREATE_USER") {
      const name = String(body.name || "").trim();
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const password = String(body.password || "").trim();
      const role = String(body.role || "STAFF").toUpperCase();

      if (!name || !email || !password || !["ADMIN", "STAFF", "KITCHEN"].includes(role)) {
        return NextResponse.json(
          { error: "Valid name, email, password, and role are required." },
          { status: 400 }
        );
      }

      db.prepare(
        "INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)"
      ).run(name, email, hashPassword(password), role);

      return NextResponse.json({ success: true });
    }

    // Full settings update
    db.prepare(
      `UPDATE restaurant_settings SET
        name = ?,
        country = ?,
        currency = ?,
        is_open = ?,
        opening_hours = ?,
        address_placeholder = ?,
        phone_placeholder = ?,
        instagram_placeholder = ?,
        tax_percent = ?,
        service_charge_percent = ?,
        hero_statement_en = ?,
        hero_statement_so = ?,
        hero_statement_sw = ?,
        seasonal_badge_en = ?,
        seasonal_badge_so = ?,
        seasonal_badge_sw = ?,
        updated_at = datetime('now')
       WHERE id = 1`
    ).run(
      String(body.name || "Amorino Cafe & Restaurant").trim(),
      String(body.country || "Kenya").trim(),
      String(body.currency || "KES").trim(),
      body.is_open ? 1 : 0,
      String(body.opening_hours || "[Opening Hours]").trim(),
      String(body.address_placeholder || "[Restaurant Address]").trim(),
      String(body.phone_placeholder || "[Phone Number]").trim(),
      String(body.instagram_placeholder || "[Instagram]").trim(),
      Number(body.tax_percent || 0),
      Number(body.service_charge_percent || 0),
      String(body.hero_statement_en || "").trim(),
      String(body.hero_statement_so || "").trim(),
      String(body.hero_statement_sw || "").trim(),
      String(body.seasonal_badge_en || "").trim(),
      String(body.seasonal_badge_so || "").trim(),
      String(body.seasonal_badge_sw || "").trim()
    );

    realtimeBus.emitEvent({ type: "SETTINGS_UPDATED" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/admin/settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
