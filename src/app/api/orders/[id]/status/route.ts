import { NextRequest, NextResponse } from "next/server";
import { getDb, hydrateOrders } from "@/lib/db";
import { realtimeBus } from "@/lib/events";
import { requireRoles } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify staff/kitchen/admin role on server
    const authResult = requireRoles(req, ["ADMIN", "STAFF", "KITCHEN"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const db = getDb();
    const orderId = Number(params.id);
    const body = await req.json();
    const nextStatus = String(body.status || "")
      .trim()
      .toUpperCase();
    const rejectionReason = String(body.rejectionReason || "").trim();

    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      return NextResponse.json(
        { error: "Invalid order status." },
        { status: 400 }
      );
    }

    const existing = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(orderId) as any;

    if (!existing) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Role check: KITCHEN is focused on ACCEPTED -> PREPARING -> READY -> COMPLETED
    if (
      authResult.user.role === "KITCHEN" &&
      existing.status === "PENDING" &&
      nextStatus === "PREPARING"
    ) {
      return NextResponse.json(
        {
          error:
            "Orders must first be accepted by Floor Staff before kitchen preparation begins.",
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    let timestampUpdateSql = "";

    if (nextStatus === "ACCEPTED") {
      timestampUpdateSql = ", accepted_at = COALESCE(accepted_at, ?)";
    } else if (nextStatus === "PREPARING") {
      timestampUpdateSql =
        ", accepted_at = COALESCE(accepted_at, ?), preparing_at = COALESCE(preparing_at, ?)";
    } else if (nextStatus === "READY") {
      timestampUpdateSql = ", ready_at = COALESCE(ready_at, ?)";
    } else if (nextStatus === "COMPLETED") {
      timestampUpdateSql = ", completed_at = COALESCE(completed_at, ?)";
    } else if (nextStatus === "CANCELLED") {
      timestampUpdateSql = ", cancelled_at = COALESCE(cancelled_at, ?)";
    }

    if (nextStatus === "PREPARING") {
      db.prepare(
        `UPDATE orders SET status = ?, rejection_reason = ? ${timestampUpdateSql} WHERE id = ?`
      ).run(nextStatus, rejectionReason, nowIso, nowIso, orderId);
    } else if (timestampUpdateSql) {
      db.prepare(
        `UPDATE orders SET status = ?, rejection_reason = ? ${timestampUpdateSql} WHERE id = ?`
      ).run(nextStatus, rejectionReason, nowIso, orderId);
    } else {
      db.prepare(
        `UPDATE orders SET status = ?, rejection_reason = ? WHERE id = ?`
      ).run(nextStatus, rejectionReason, orderId);
    }

    const updatedRaw = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .all(orderId) as any[];
    const [updatedOrder] = hydrateOrders(db, updatedRaw);

    realtimeBus.emitEvent({
      type: "ORDER_UPDATED",
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.order_number,
      tableCode: updatedOrder.table_code,
      status: updatedOrder.status,
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("PATCH /api/orders/[id]/status error:", error);
    return NextResponse.json(
      { error: "Failed to update order status." },
      { status: 500 }
    );
  }
}
