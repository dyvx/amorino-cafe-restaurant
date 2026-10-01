import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { realtimeBus } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["ADMIN", "STAFF", "KITCHEN"]);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getDb();
  const categories = db
    .prepare("SELECT * FROM categories ORDER BY sort_order ASC, id ASC")
    .all() as any[];

  const rawItems = db
    .prepare("SELECT * FROM menu_items ORDER BY sort_order ASC, id ASC")
    .all() as any[];

  const groups = db
    .prepare("SELECT * FROM customization_groups ORDER BY id ASC")
    .all() as any[];

  const options = db
    .prepare(
      "SELECT * FROM customization_options ORDER BY group_id ASC, sort_order ASC, id ASC"
    )
    .all() as any[];

  const links = db
    .prepare("SELECT * FROM menu_item_customization_groups")
    .all() as { menu_item_id: number; group_id: number }[];

  const hydratedGroups = groups.map((g) => ({
    ...g,
    is_required: Boolean(g.is_required),
    is_active: Boolean(g.is_active),
    options: options
      .filter((o) => o.group_id === g.id)
      .map((o) => ({ ...o, is_active: Boolean(o.is_active) })),
  }));

  const hydratedItems = rawItems.map((item) => ({
    ...item,
    is_available: Boolean(item.is_available),
    is_featured: Boolean(item.is_featured),
    is_popular: Boolean(item.is_popular),
    ingredients: safeParse(item.ingredients, []),
    allergens: safeParse(item.allergens, []),
    tags: safeParse(item.tags, []),
    groupIds: links
      .filter((l) => l.menu_item_id === item.id)
      .map((l) => l.group_id),
  }));

  return NextResponse.json({
    categories: categories.map((c) => ({ ...c, is_active: Boolean(c.is_active) })),
    menuItems: hydratedItems,
    customizationGroups: hydratedGroups,
  });
}

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["ADMIN"]);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = getDb();
    const body = await req.json();
    const entityType = body.entityType;

    if (entityType === "CATEGORY") {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json(
          { error: "Category name is required." },
          { status: 400 }
        );
      }
      const slug =
        String(body.slug || "")
          .trim()
          .toLowerCase() ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
          "-" +
          Date.now().toString().slice(-4);

      const res = db
        .prepare(
          `INSERT INTO categories (
            slug, name, name_so, name_sw,
            description, description_so, description_sw,
            image_url, sort_order, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          slug,
          name,
          String(body.name_so || name).trim(),
          String(body.name_sw || name).trim(),
          String(body.description || "").trim(),
          String(body.description_so || body.description || "").trim(),
          String(body.description_sw || body.description || "").trim(),
          String(
            body.image_url ||
              "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=85"
          ).trim(),
          Number(body.sort_order || 10),
          body.is_active === false ? 0 : 1
        );

      realtimeBus.emitEvent({ type: "MENU_UPDATED" });
      return NextResponse.json({ id: res.lastInsertRowid }, { status: 201 });
    }

    if (entityType === "MENU_ITEM") {
      const name = String(body.name || "").trim();
      const categoryId = Number(body.category_id);
      const price = Number(body.price);

      if (!name || !categoryId || isNaN(price) || price < 0) {
        return NextResponse.json(
          { error: "Valid name, category, and price are required." },
          { status: 400 }
        );
      }

      const res = db
        .prepare(
          `INSERT INTO menu_items (
            category_id, name, name_so, name_sw,
            description, description_so, description_sw,
            price, currency, image_url,
            is_available, is_featured, is_popular,
            prep_time_minutes, prep_estimate_label,
            ingredients, allergens, tags, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'KES', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          categoryId,
          name,
          String(body.name_so || name).trim(),
          String(body.name_sw || name).trim(),
          String(body.description || "").trim(),
          String(body.description_so || body.description || "").trim(),
          String(body.description_sw || body.description || "").trim(),
          price,
          String(
            body.image_url ||
              "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1100&q=85"
          ).trim(),
          body.is_available === false ? 0 : 1,
          body.is_featured ? 1 : 0,
          body.is_popular ? 1 : 0,
          Number(body.prep_time_minutes || 15),
          String(body.prep_estimate_label || "15–20 mins").trim(),
          JSON.stringify(
            Array.isArray(body.ingredients) ? body.ingredients : []
          ),
          JSON.stringify(Array.isArray(body.allergens) ? body.allergens : []),
          JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
          Number(body.sort_order || 1)
        );

      const newItemId = Number(res.lastInsertRowid);
      if (Array.isArray(body.groupIds)) {
        const linkStmt = db.prepare(
          "INSERT OR IGNORE INTO menu_item_customization_groups (menu_item_id, group_id) VALUES (?, ?)"
        );
        for (const gid of body.groupIds) {
          linkStmt.run(newItemId, Number(gid));
        }
      }

      realtimeBus.emitEvent({ type: "MENU_UPDATED" });
      return NextResponse.json({ id: newItemId }, { status: 201 });
    }

    if (entityType === "CUSTOMIZATION_GROUP") {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json(
          { error: "Group name is required." },
          { status: 400 }
        );
      }
      const res = db
        .prepare(
          `INSERT INTO customization_groups (name, name_so, name_sw, is_required, min_selections, max_selections, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`
        )
        .run(
          name,
          String(body.name_so || name).trim(),
          String(body.name_sw || name).trim(),
          body.is_required ? 1 : 0,
          Number(body.min_selections || 0),
          Number(body.max_selections || 4)
        );

      const groupId = Number(res.lastInsertRowid);
      if (Array.isArray(body.options)) {
        const optStmt = db.prepare(
          `INSERT INTO customization_options (group_id, name, name_so, name_sw, price_adjustment, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, 1, ?)`
        );
        body.options.forEach((opt: any, idx: number) => {
          if (opt.name) {
            optStmt.run(
              groupId,
              String(opt.name).trim(),
              String(opt.name_so || opt.name).trim(),
              String(opt.name_sw || opt.name).trim(),
              Number(opt.price_adjustment || 0),
              idx + 1
            );
          }
        });
      }

      realtimeBus.emitEvent({ type: "MENU_UPDATED" });
      return NextResponse.json({ id: groupId }, { status: 201 });
    }

    if (entityType === "CUSTOMIZATION_OPTION") {
      const groupId = Number(body.group_id);
      const name = String(body.name || "").trim();
      if (!groupId || !name) {
        return NextResponse.json(
          { error: "Group ID and option name are required." },
          { status: 400 }
        );
      }
      const res = db
        .prepare(
          `INSERT INTO customization_options (group_id, name, name_so, name_sw, price_adjustment, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, 1, ?)`
        )
        .run(
          groupId,
          name,
          String(body.name_so || name).trim(),
          String(body.name_sw || name).trim(),
          Number(body.price_adjustment || 0),
          Number(body.sort_order || 1)
        );

      realtimeBus.emitEvent({ type: "MENU_UPDATED" });
      return NextResponse.json({ id: res.lastInsertRowid }, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown entityType." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin/menu error:", error);
    return NextResponse.json({ error: "Failed to create item." }, { status: 500 });
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
    const entityType = body.entityType;

    // Quick toggle availability/featured/popular
    if (entityType === "TOGGLE_ITEM_FIELD") {
      const itemId = Number(body.id);
      const field = body.field as "is_available" | "is_featured" | "is_popular";
      if (!["is_available", "is_featured", "is_popular"].includes(field)) {
        return NextResponse.json({ error: "Invalid field." }, { status: 400 });
      }
      db.prepare(`UPDATE menu_items SET ${field} = ? WHERE id = ?`).run(
        body.value ? 1 : 0,
        itemId
      );
      realtimeBus.emitEvent({ type: "MENU_UPDATED" });
      return NextResponse.json({ success: true });
    }

    if (auth.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin permissions required for full menu editing." },
        { status: 403 }
      );
    }

    if (entityType === "CATEGORY") {
      db.prepare(
        `UPDATE categories SET
          name = ?, name_so = ?, name_sw = ?,
          description = ?, description_so = ?, description_sw = ?,
          image_url = ?, sort_order = ?, is_active = ?
         WHERE id = ?`
      ).run(
        String(body.name).trim(),
        String(body.name_so || body.name).trim(),
        String(body.name_sw || body.name).trim(),
        String(body.description || "").trim(),
        String(body.description_so || body.description || "").trim(),
        String(body.description_sw || body.description || "").trim(),
        String(body.image_url || "").trim(),
        Number(body.sort_order || 1),
        body.is_active ? 1 : 0,
        Number(body.id)
      );
      realtimeBus.emitEvent({ type: "MENU_UPDATED" });
      return NextResponse.json({ success: true });
    }

    if (entityType === "MENU_ITEM") {
      const itemId = Number(body.id);
      db.prepare(
        `UPDATE menu_items SET
          category_id = ?, name = ?, name_so = ?, name_sw = ?,
          description = ?, description_so = ?, description_sw = ?,
          price = ?, image_url = ?,
          is_available = ?, is_featured = ?, is_popular = ?,
          prep_time_minutes = ?, prep_estimate_label = ?,
          ingredients = ?, allergens = ?, tags = ?, sort_order = ?
         WHERE id = ?`
      ).run(
        Number(body.category_id),
        String(body.name).trim(),
        String(body.name_so || body.name).trim(),
        String(body.name_sw || body.name).trim(),
        String(body.description || "").trim(),
        String(body.description_so || body.description || "").trim(),
        String(body.description_sw || body.description || "").trim(),
        Number(body.price),
        String(body.image_url || "").trim(),
        body.is_available ? 1 : 0,
        body.is_featured ? 1 : 0,
        body.is_popular ? 1 : 0,
        Number(body.prep_time_minutes || 15),
        String(body.prep_estimate_label || "15–20 mins").trim(),
        JSON.stringify(Array.isArray(body.ingredients) ? body.ingredients : []),
        JSON.stringify(Array.isArray(body.allergens) ? body.allergens : []),
        JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
        Number(body.sort_order || 1),
        itemId
      );

      if (Array.isArray(body.groupIds)) {
        db.prepare(
          "DELETE FROM menu_item_customization_groups WHERE menu_item_id = ?"
        ).run(itemId);
        const linkStmt = db.prepare(
          "INSERT OR IGNORE INTO menu_item_customization_groups (menu_item_id, group_id) VALUES (?, ?)"
        );
        for (const gid of body.groupIds) {
          linkStmt.run(itemId, Number(gid));
        }
      }

      realtimeBus.emitEvent({ type: "MENU_UPDATED" });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported PUT operation." }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/admin/menu error:", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
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
    const entityType = searchParams.get("entityType");
    const id = Number(searchParams.get("id"));

    if (entityType === "CATEGORY") {
      db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    } else if (entityType === "MENU_ITEM") {
      db.prepare("DELETE FROM menu_items WHERE id = ?").run(id);
    } else if (entityType === "CUSTOMIZATION_GROUP") {
      db.prepare("DELETE FROM customization_groups WHERE id = ?").run(id);
    } else if (entityType === "CUSTOMIZATION_OPTION") {
      db.prepare("DELETE FROM customization_options WHERE id = ?").run(id);
    } else {
      return NextResponse.json({ error: "Invalid delete target." }, { status: 400 });
    }

    realtimeBus.emitEvent({ type: "MENU_UPDATED" });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/menu error:", error);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}

function safeParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
