import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  inventoryItems,
  leads,
  payments,
  projects,
  serviceCalls,
} from "@workspace/db";

export async function getDashboardSummary() {
  const [
    leadsData,
    revenueData,
    pendingPaymentsData,
    activeProjectsData,
    pendingComplaintsData,
    lowStockData,
  ] = await Promise.all([
    // Leads: total + todayFollowUps
    // SQLite: FILTER (WHERE ...) is supported since 3.25. No ::type casts needed.
    db
      .select({
        totalLeads: sql<number>`count(*)`,
        todayFollowUps: sql<number>`count(*) filter (where ${leads.followUpDate} = date('now'))`,
      })
      .from(leads),

    // Total revenue: sum of completed/received payments
    db
      .select({
        totalRevenue: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(sql`${payments.status} = 'received' or ${payments.status} = 'completed'`),

    // Pending payments count
    db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(sql`${payments.status} = 'pending'`),

    // Active projects (not completed/cancelled)
    db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(
        sql`${projects.stage} not in ('completed', 'cancelled')`,
      ),

    // Pending complaints (open + in_progress service calls)
    db
      .select({ count: sql<number>`count(*)` })
      .from(serviceCalls)
      .where(
        sql`${serviceCalls.status} in ('open', 'in_progress')`,
      ),

    // Low stock alerts
    db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(
        sql`${inventoryItems.currentStock} <= ${inventoryItems.minStockLevel}`,
      ),
  ]);

  const leads_ = leadsData[0];
  const revenue = revenueData[0];
  const pending = pendingPaymentsData[0];
  const active = activeProjectsData[0];
  const complaints = pendingComplaintsData[0];
  const lowStock = lowStockData[0];

  return {
    totalLeads: Number(leads_?.totalLeads ?? 0),
    todayFollowUps: Number(leads_?.todayFollowUps ?? 0),
    ordersOwned: Number(active?.count ?? 0),
    totalRevenue: Number(revenue?.totalRevenue ?? 0),
    pendingComplaints: Number(complaints?.count ?? 0),
    lowStockAlerts: Number(lowStock?.count ?? 0),
    activeProjects: Number(active?.count ?? 0),
    pendingPayments: Number(pending?.count ?? 0),
  };
}
