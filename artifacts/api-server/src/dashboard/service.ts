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
    db
      .select({
        totalLeads: sql<number>`count(*)::int`,
        todayFollowUps: sql<number>`count(*) filter (where ${leads.followUpDate} = current_date)::int`,
      })
      .from(leads),

    // Total revenue: sum of completed/received payments
    db
      .select({
        totalRevenue: sql<number>`coalesce(sum(${payments.amount}::numeric), 0)::float`,
      })
      .from(payments)
      .where(sql`${payments.status} = 'received' or ${payments.status} = 'completed'`),

    // Pending payments count
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(sql`${payments.status} = 'pending'`),

    // Active projects (not completed/cancelled)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(
        sql`${projects.stage} not in ('completed', 'cancelled')`,
      ),

    // Pending complaints (open + in_progress service calls)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(serviceCalls)
      .where(
        sql`${serviceCalls.status} in ('open', 'in_progress')`,
      ),

    // Low stock alerts
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryItems)
      .where(
        sql`${inventoryItems.currentStock}::numeric <= ${inventoryItems.minStockLevel}::numeric`,
      ),
  ]);

  const leads_ = leadsData[0];
  const revenue = revenueData[0];
  const pending = pendingPaymentsData[0];
  const active = activeProjectsData[0];
  const complaints = pendingComplaintsData[0];
  const lowStock = lowStockData[0];

  return {
    totalLeads: leads_?.totalLeads ?? 0,
    todayFollowUps: leads_?.todayFollowUps ?? 0,
    ordersOwned: active?.count ?? 0,
    totalRevenue: revenue?.totalRevenue ?? 0,
    pendingComplaints: complaints?.count ?? 0,
    lowStockAlerts: lowStock?.count ?? 0,
    activeProjects: active?.count ?? 0,
    pendingPayments: pending?.count ?? 0,
  };
}
