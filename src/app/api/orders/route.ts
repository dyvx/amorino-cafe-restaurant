import { NextRequest, NextResponse } from "next/server";
import { getDb, hydrateOrders } from "@/lib/db";
import { realtimeBus } from "@/lib/events";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const tableCode = searchParams.get("table")?.trim().toUpperCase();
    const sessionId = searchParams.get("sessionId");
    const statusFilter = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    let query = "SELECT * FROM orders WHERE 1=1";
    const params: any[] = [];

    if (sessionId) {
      query += " AND table_session_id = ?";
      params.push(Number(sessionId));
    } else if (tableCode) {
      query += " AND UPPER(table_code) = ?";
      params.push(tableCode);
    }

    if (statusFilter && statusFilter !== "ALL") {
      query += " AND status = ?";
      params.push(statusFilter);
    }

    if (search) {
      query += " AND (CAST(order_number AS TEXT) LIKE ? OR UPPER(table_code) LIKE ? OR customer_note LIKE ?)";
      params.push(`%${search}%`, `%${search.toUpperCase()}%`, `%${search}%`);
    }

    query += " ORDER BY created_at DESC, id DESC LIMIT 150";

    const rawOrders = db.prepare(query).all(...params) as any[];
    const orders = hydrateOrders(db, rawOrders);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: "Unable to load orders." },
      { status: 500 }
    );
  }
}

interface OrderSubmissionItem {
  menuItemId: number;
  quantity: number;
  selectedOptionIds?: number[];
  specialNote?: string;
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const tableCode = String(body.tableCode || "")
      .trim()
      .toUpperCase();
    const customerNote = String(body.customerNote || "")
      .trim()
      .slice(0, 500);
    const clientItems: OrderSubmissionItem[] = Array.isArray(body.items)
      ? body.items
      : [];

    // 1. Verify restaurant is open
    const settings = db
      .prepare("SELECT * FROM restaurant_settings WHERE id = 1")
      .get() as any;
    if (!settings || !settings.is_open) {
      return NextResponse.json(
        {
          error:
            "We’re currently closed. Table ordering will resume during our service hours.",
          code: "RESTAURANT_CLOSED",
        },
        { status: 403 }
      );
    }

    // 2. Verify table exists and is active
    if (!tableCode) {
      return NextResponse.json(
        { error: "A valid table code is required to place an order.", code: "INVALID_TABLE" },
        { status: 400 }
      );
    }

    const tableRow = db
      .prepare("SELECT * FROM tables WHERE UPPER(code) = ?")
      .get(tableCode) as any;

    if (!tableRow || !tableRow.is_active) {
      return NextResponse.json(
        {
          error: "This table is currently inactive or unrecognized. Please check your table QR code.",
          code: "INVALID_TABLE",
        },
        { status: 400 }
      );
    }

    if (clientItems.length === 0) {
      return NextResponse.json(
        { error: "Your order selection cannot be empty.", code: "EMPTY_ORDER" },
        { status: 400 }
      );
    }

    // 3. Validate each item, its availability, and its customizations strictly on the server
    let computedSubtotal = 0;
    let maxPrepMinutes = 10;

    const validatedItemsToInsert: Array<{
      menuItem: any;
      quantity: number;
      unitPriceWithCustomizations: number;
      lineTotal: number;
      specialNote: string;
      validatedOptions: Array<{
        option: any;
        group: any;
      }>;
    }> = [];

    for (const rawItem of clientItems) {
      const qty = Number(rawItem.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
        return NextResponse.json(
          { error: "Invalid item quantity.", code: "INVALID_QUANTITY" },
          { status: 400 }
        );
      }

      const menuItem = db
        .prepare("SELECT * FROM menu_items WHERE id = ?")
        .get(Number(rawItem.menuItemId)) as any;

      if (!menuItem) {
        return NextResponse.json(
          { error: "One of the selected dishes no longer exists.", code: "ITEM_NOT_FOUND" },
          { status: 400 }
        );
      }

      if (!menuItem.is_available) {
        return NextResponse.json(
          {
            error: `"${menuItem.name}" is currently unavailable. Please remove it from your selection.`,
            code: "ITEM_UNAVAILABLE",
          },
          { status: 400 }
        );
      }

      // Fetch allowed customization groups for this menu item
      const allowedGroups = db
        .prepare(
          `SELECT cg.* FROM customization_groups cg
           INNER JOIN menu_item_customization_groups micg ON micg.group_id = cg.id
           WHERE micg.menu_item_id = ? AND cg.is_active = 1`
        )
        .all(menuItem.id) as any[];

      const allowedGroupIds = new Set(allowedGroups.map((g) => g.id));
      const requestedOptionIds = Array.isArray(rawItem.selectedOptionIds)
        ? Array.from(new Set(rawItem.selectedOptionIds.map(Number)))
        : [];

      const validatedOptions: Array<{ option: any; group: any }> = [];
      const countByGroup = new Map<number, number>();

      for (const optId of requestedOptionIds) {
        const optionRow = db
          .prepare(
            "SELECT * FROM customization_options WHERE id = ? AND is_active = 1"
          )
          .get(optId) as any;

        if (!optionRow || !allowedGroupIds.has(optionRow.group_id)) {
          return NextResponse.json(
            {
              error: `Invalid customization option selected for "${menuItem.name}".`,
              code: "INVALID_CUSTOMIZATION",
            },
            { status: 400 }
          );
        }

        const groupRow = allowedGroups.find((g) => g.id === optionRow.group_id);
        validatedOptions.push({ option: optionRow, group: groupRow });
        countByGroup.set(
          groupRow.id,
          (countByGroup.get(groupRow.id) || 0) + 1
        );
      }

      // Verify min/max/required constraints per group
      for (const grp of allowedGroups) {
        const selectedCount = countByGroup.get(grp.id) || 0;
        const minReq = grp.is_required
          ? Math.max(1, Number(grp.min_selections || 1))
          : Number(grp.min_selections || 0);
        const maxAllowed = Number(grp.max_selections || 10);

        if (selectedCount < minReq) {
          return NextResponse.json(
            {
              error: `Please select at least ${minReq} option(s) for "${grp.name}" on "${menuItem.name}".`,
              code: "CUSTOMIZATION_MIN_ERROR",
            },
            { status: 400 }
          );
        }
        if (selectedCount > maxAllowed) {
          return NextResponse.json(
            {
              error: `Maximum ${maxAllowed} option(s) allowed for "${grp.name}" on "${menuItem.name}".`,
              code: "CUSTOMIZATION_MAX_ERROR",
            },
            { status: 400 }
          );
        }
      }

      const customizationSum = validatedOptions.reduce(
        (acc, curr) => acc + Number(curr.option.price_adjustment || 0),
        0
      );
      const unitPriceWithCustomizations =
        Number(menuItem.price) + customizationSum;
      const lineTotal = unitPriceWithCustomizations * qty;

      computedSubtotal += lineTotal;
      maxPrepMinutes = Math.max(
        maxPrepMinutes,
        Number(menuItem.prep_time_minutes || 15)
      );

      validatedItemsToInsert.push({
        menuItem,
        quantity: qty,
        unitPriceWithCustomizations,
        lineTotal,
        specialNote: String(rawItem.specialNote || "")
          .trim()
          .slice(0, 250),
        validatedOptions,
      });
    }

    const taxAmount = Math.round(
      computedSubtotal * (Number(settings.tax_percent || 0) / 100)
    );
    const serviceCharge = Math.round(
      computedSubtotal * (Number(settings.service_charge_percent || 0) / 100)
    );
    const computedTotal = computedSubtotal + taxAmount + serviceCharge;

    // 4. Find or create active table session
    let session = db
      .prepare(
        "SELECT * FROM table_sessions WHERE table_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1"
      )
      .get(tableRow.id) as any;

    if (!session) {
      const token = `sess-${tableRow.code.toLowerCase()}-${crypto
        .randomBytes(4)
        .toString("hex")}`;
      const sRes = db
        .prepare(
          "INSERT INTO table_sessions (table_id, table_code, session_token, status) VALUES (?, ?, ?, 'ACTIVE')"
        )
        .run(tableRow.id, tableRow.code, token);
      session = db
        .prepare("SELECT * FROM table_sessions WHERE id = ?")
        .get(sRes.lastInsertRowid);
    }

    // 5. Generate next sequential order number (#1025, #1026...)
    const maxOrderRow = db
      .prepare("SELECT MAX(order_number) as maxNum FROM orders")
      .get() as { maxNum: number | null };
    const nextOrderNumber = (maxOrderRow?.maxNum || 1020) + 1;

    // 6. Execute transactional insert
    const createdOrderId = db.transaction(() => {
      const nowIso = new Date().toISOString();
      const orderRes = db
        .prepare(
          `INSERT INTO orders (
            order_number, table_id, table_code, table_session_id, status,
            subtotal, tax_amount, service_charge, total, currency,
            customer_note, estimated_prep_minutes, created_at
          ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          nextOrderNumber,
          tableRow.id,
          tableRow.code,
          session.id,
          computedSubtotal,
          taxAmount,
          serviceCharge,
          computedTotal,
          settings.currency || "KES",
          customerNote,
          maxPrepMinutes,
          nowIso
        );

      const orderId = Number(orderRes.lastInsertRowid);

      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (
          order_id, menu_item_id, item_name, item_name_so, item_name_sw,
          unit_price, quantity, line_total, special_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertOrderCust = db.prepare(`
        INSERT INTO order_item_customizations (
          order_item_id, option_id, group_name, option_name, option_name_so, option_name_sw, price_adjustment
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const vItem of validatedItemsToInsert) {
        const oiRes = insertOrderItem.run(
          orderId,
          vItem.menuItem.id,
          vItem.menuItem.name,
          vItem.menuItem.name_so,
          vItem.menuItem.name_sw,
          vItem.unitPriceWithCustomizations,
          vItem.quantity,
          vItem.lineTotal,
          vItem.specialNote
        );
        const orderItemId = Number(oiRes.lastInsertRowid);

        for (const vo of vItem.validatedOptions) {
          insertOrderCust.run(
            orderItemId,
            vo.option.id,
            vo.group.name,
            vo.option.name,
            vo.option.name_so,
            vo.option.name_sw,
            vo.option.price_adjustment
          );
        }
      }

      return orderId;
    })();

    const rawCreated = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .all(createdOrderId) as any[];
    const [createdOrder] = hydrateOrders(db, rawCreated);

    // Emit realtime broadcast
    realtimeBus.emitEvent({
      type: "ORDER_CREATED",
      orderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
      tableCode: createdOrder.table_code,
      status: createdOrder.status,
    });

    return NextResponse.json({ order: createdOrder }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { error: "Unable to submit your order right now. Please try again." },
      { status: 500 }
    );
  }
}
