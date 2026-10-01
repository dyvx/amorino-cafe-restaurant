import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRoles } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["ADMIN", "STAFF"]);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = getDb();

    // 1. Overview KPIs
    const totalsRow = db
      .prepare(
        `SELECT
          COUNT(*) as total_orders,
          COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total ELSE 0 END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN status != 'CANCELLED' THEN total ELSE NULL END), 0) as avg_order_value,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_orders,
          SUM(CASE WHEN status = 'PREPARING' THEN 1 ELSE 0 END) as preparing_orders,
          SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as ready_orders,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_orders
         FROM orders`
      )
      .get() as any;

    const activeTablesRow = db
      .prepare(
        `SELECT COUNT(DISTINCT table_code) as active_tables_with_orders
         FROM orders
         WHERE status IN ('PENDING', 'ACCEPTED', 'PREPARING', 'READY')`
      )
      .get() as { active_tables_with_orders: number };

    const totalTablesRow = db
      .prepare("SELECT COUNT(*) as total_tables FROM tables WHERE is_active = 1")
      .get() as { total_tables: number };

    // 2. Popular Menu Items
    const popularItems = db
      .prepare(
        `SELECT
          oi.menu_item_id,
          oi.item_name,
          SUM(oi.quantity) as total_qty,
          SUM(oi.line_total) as total_sales,
          COUNT(DISTINCT oi.order_id) as order_count
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE o.status != 'CANCELLED'
         GROUP BY oi.menu_item_id, oi.item_name
         ORDER BY total_qty DESC, total_sales DESC
         LIMIT 8`
      )
      .all() as any[];

    // 3. Category Performance
    const categoryPerformance = db
      .prepare(
        `SELECT
          c.id,
          c.name as category_name,
          COALESCE(SUM(oi.quantity), 0) as items_sold,
          COALESCE(SUM(oi.line_total), 0) as revenue
         FROM categories c
         LEFT JOIN menu_items mi ON mi.category_id = c.id
         LEFT JOIN order_items oi ON oi.menu_item_id = mi.id
         LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'CANCELLED'
         GROUP BY c.id, c.name
         ORDER BY revenue DESC, c.sort_order ASC`
      )
      .all() as any[];

    // 4. Table Activity Breakdown
    const tableActivity = db
      .prepare(
        `SELECT
          t.code as table_code,
          t.name as table_name,
          t.zone,
          COUNT(o.id) as order_count,
          COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN o.total ELSE 0 END), 0) as revenue
         FROM tables t
         LEFT JOIN orders o ON o.table_id = t.id
         GROUP BY t.id, t.code, t.name, t.zone
         ORDER BY revenue DESC, t.code ASC`
      )
      .all() as any[];

    // 5. Peak Ordering Periods (Service Windows)
    const allOrderTimestamps = db
      .prepare("SELECT created_at, total FROM orders WHERE status != 'CANCELLED'")
      .all() as { created_at: string; total: number }[];

    const periodBuckets = [
      { label: "Morning Salon (07:00–11:00)", orders: 0, revenue: 0 },
      { label: "Midday & Lunch (11:00–15:00)", orders: 0, revenue: 0 },
      { label: "Afternoon Roastery (15:00–18:00)", orders: 0, revenue: 0 },
      { label: "Evening Dining (18:00–23:00)", orders: 0, revenue: 0 },
    ];

    for (const row of allOrderTimestamps) {
      const hour = new Date(row.created_at).getHours();
      if (hour < 11) {
        periodBuckets[0].orders += 1;
        periodBuckets[0].revenue += row.total;
      } else if (hour < 15) {
        periodBuckets[1].orders += 1;
        periodBuckets[1].revenue += row.total;
      } else if (hour < 18) {
        periodBuckets[2].orders += 1;
        periodBuckets[2].revenue += row.total;
      } else {
        periodBuckets[3].orders += 1;
        periodBuckets[3].revenue += row.total;
      }
    }

    return NextResponse.json({
      overview: {
        totalOrders: Number(totalsRow.total_orders || 0),
        totalRevenue: Math.round(Number(totalsRow.total_revenue || 0)),
        avgOrderValue: Math.round(Number(totalsRow.avg_order_value || 0)),
        pendingOrders: Number(totalsRow.pending_orders || 0),
        acceptedOrders: Number(totalsRow.accepted_orders || 0),
        preparingOrders: Number(totalsRow.preparing_orders || 0),
        readyOrders: Number(totalsRow.ready_orders || 0),
        completedOrders: Number(totalsRow.completed_orders || 0),
        cancelledOrders: Number(totalsRow.cancelled_orders || 0),
        activeTables: Number(activeTablesRow?.active_tables_with_orders || 0),
        totalActiveTables: Number(totalTablesRow?.total_tables || 12),
      },
      popularItems,
      categoryPerformance,
      tableActivity,
      peakPeriods: periodBuckets,
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics." },
      { status: 500 }
    );
  }
}
