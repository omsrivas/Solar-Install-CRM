import { and, asc, eq, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { db } from "./index";
import {
  inventoryItems,
  leads,
  payments,
  projects,
  serviceCalls,
} from "./schema/crm";
import { users } from "./schema/users";

export type ReportDateRange = {
  fromDate?: string;
  toDate?: string;
};

/**
 * Builds date-range conditions for unix-timestamp INTEGER columns.
 * Converts the ISO date string (e.g. '2024-01-15') to unix epoch seconds
 * using SQLite's unixepoch() function.
 */
function timestampRange(column: SQLWrapper, filters: ReportDateRange): SQL[] {
  const conditions: SQL[] = [];
  if (filters.fromDate) {
    conditions.push(sql`${column} >= unixepoch(${filters.fromDate})`);
  }
  if (filters.toDate) {
    conditions.push(
      sql`${column} < unixepoch(date(${filters.toDate}, '+1 day'))`,
    );
  }
  return conditions;
}

/**
 * Builds date-range conditions for the payments table.
 * paymentDate is stored as TEXT (ISO date), createdAt is unix timestamp INTEGER.
 * The effective date is coalesce(paymentDate, date(createdAt, 'unixepoch')),
 * which is always a TEXT ISO date — so we compare directly as text.
 */
function paymentDateRange(filters: ReportDateRange): SQL[] {
  const paymentDate = sql`coalesce(${payments.paymentDate}, date(${payments.createdAt}, 'unixepoch'))`;
  const conditions: SQL[] = [];
  if (filters.fromDate) {
    conditions.push(sql`${paymentDate} >= ${filters.fromDate}`);
  }
  if (filters.toDate) {
    conditions.push(sql`${paymentDate} < date(${filters.toDate}, '+1 day')`);
  }
  return conditions;
}

function whereOrUndefined(conditions: SQL[]): SQL | undefined {
  return conditions.length ? and(...conditions) : undefined;
}

function asNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

export async function getLeadsReport(filters: ReportDateRange = {}) {
  const conditions = timestampRange(leads.createdAt, filters);
  const where = whereOrUndefined(conditions);

  const [totals] = await db
    .select({
      totalLeads: sql<number>`count(*)`,
      newLeads: sql<number>`count(*) filter (where ${leads.stage} = 'new')`,
      convertedLeads: sql<number>`count(*) filter (where ${leads.convertedProjectId} is not null or ${leads.stage} = 'converted')`,
    })
    .from(leads)
    .where(where);

  const [bySource, byStage, daily] = await Promise.all([
    db
      .select({
        source: sql<string>`coalesce(nullif(${leads.leadSource}, ''), 'Unknown')`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(where)
      .groupBy(sql`coalesce(nullif(${leads.leadSource}, ''), 'Unknown')`)
      .orderBy(asc(sql`coalesce(nullif(${leads.leadSource}, ''), 'Unknown')`)),
    db
      .select({
        stage: leads.stage,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(where)
      .groupBy(leads.stage)
      .orderBy(asc(leads.stage)),
    db
      .select({
        // createdAt is unix timestamp INTEGER — format to YYYY-MM-DD
        date: sql<string>`strftime('%Y-%m-%d', ${leads.createdAt}, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(where)
      .groupBy(sql`strftime('%Y-%m-%d', ${leads.createdAt}, 'unixepoch')`)
      .orderBy(asc(sql`strftime('%Y-%m-%d', ${leads.createdAt}, 'unixepoch')`)),
  ]);

  return {
    totalLeads: asNumber(totals?.totalLeads),
    newLeads: asNumber(totals?.newLeads),
    convertedLeads: asNumber(totals?.convertedLeads),
    bySource: bySource.map((item) => ({
      source: item.source,
      count: asNumber(item.count),
    })),
    byStage: byStage.map((item) => ({
      stage: item.stage,
      count: asNumber(item.count),
    })),
    daily: daily.map((item) => ({
      date: item.date,
      count: asNumber(item.count),
    })),
  };
}

export async function getSalesReport(filters: ReportDateRange = {}) {
  const conditions = timestampRange(leads.createdAt, filters);
  const where = whereOrUndefined(conditions);

  const [totals] = await db
    .select({
      totalOrders: sql<number>`count(distinct ${projects.id})`,
      totalRevenue: sql<string>`coalesce(sum(${projects.totalAmount}), 0)`,
      totalLeads: sql<number>`count(distinct ${leads.id})`,
    })
    .from(leads)
    .leftJoin(projects, eq(projects.leadId, leads.id))
    .where(where);

  const bySalesPerson = await db
    .select({
      salesPersonName: sql<string>`coalesce(nullif(${users.name}, ''), 'Unassigned')`,
      leadsAssigned: sql<number>`count(distinct ${leads.id})`,
      ordersConverted: sql<number>`count(distinct ${projects.id})`,
      revenue: sql<string>`coalesce(sum(${projects.totalAmount}), 0)`,
    })
    .from(leads)
    .leftJoin(users, eq(users.id, leads.assignedSalesPersonId))
    .leftJoin(projects, eq(projects.leadId, leads.id))
    .where(where)
    .groupBy(sql`coalesce(nullif(${users.name}, ''), 'Unassigned')`)
    .orderBy(asc(sql`coalesce(nullif(${users.name}, ''), 'Unassigned')`));

  const totalOrders = asNumber(totals?.totalOrders);
  const totalLeads = asNumber(totals?.totalLeads);

  return {
    totalOrders,
    totalRevenue: asNumber(totals?.totalRevenue),
    bySalesPerson: bySalesPerson.map((item) => ({
      salesPersonName: item.salesPersonName,
      leadsAssigned: asNumber(item.leadsAssigned),
      ordersConverted: asNumber(item.ordersConverted),
      revenue: asNumber(item.revenue),
    })),
    conversionRate: totalLeads > 0 ? (totalOrders / totalLeads) * 100 : 0,
  };
}

export async function getFinanceReport(filters: ReportDateRange = {}) {
  const conditions = paymentDateRange(filters);
  const where = whereOrUndefined(conditions);
  // Effective payment date: paymentDate (TEXT) or date derived from createdAt (unix int)
  const paymentDateExpr = sql`coalesce(${payments.paymentDate}, date(${payments.createdAt}, 'unixepoch'))`;

  const [totals] = await db
    .select({
      totalCollected: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} in ('paid', 'received')), 0)`,
      totalPending: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'pending'), 0)`,
      totalOverdue: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'overdue'), 0)`,
    })
    .from(payments)
    .where(where);

  const [daily, byPaymentMode] = await Promise.all([
    db
      .select({
        date: paymentDateExpr,
        collected: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} in ('paid', 'received')), 0)`,
      })
      .from(payments)
      .where(where)
      .groupBy(paymentDateExpr)
      .orderBy(asc(paymentDateExpr)),
    db
      .select({
        mode: sql<string>`coalesce(nullif(${payments.paymentMode}, ''), 'Unspecified')`,
        amount: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} in ('paid', 'received')), 0)`,
      })
      .from(payments)
      .where(where)
      .groupBy(sql`coalesce(nullif(${payments.paymentMode}, ''), 'Unspecified')`)
      .orderBy(asc(sql`coalesce(nullif(${payments.paymentMode}, ''), 'Unspecified')`)),
  ]);

  return {
    totalCollected: asNumber(totals?.totalCollected),
    totalPending: asNumber(totals?.totalPending),
    totalOverdue: asNumber(totals?.totalOverdue),
    daily: daily.map((item) => ({
      date: item.date as string,
      collected: asNumber(item.collected),
    })),
    byPaymentMode: byPaymentMode.map((item) => ({
      mode: item.mode,
      amount: asNumber(item.amount),
    })),
  };
}

export async function getServiceReport(filters: ReportDateRange = {}) {
  const conditions = timestampRange(serviceCalls.createdAt, filters);
  const where = whereOrUndefined(conditions);

  const [totals] = await db
    .select({
      totalCalls: sql<number>`count(*)`,
      closedCalls: sql<number>`count(*) filter (where ${serviceCalls.status} = 'closed')`,
      // Both closedAt and createdAt are unix timestamp INTEGERs — simple subtraction gives seconds
      avgResolutionDays: sql<number>`coalesce(avg((${serviceCalls.closedAt} - ${serviceCalls.createdAt}) / 86400.0) filter (where ${serviceCalls.closedAt} is not null), 0)`,
    })
    .from(serviceCalls)
    .where(where);

  const [byPriority, byEngineer] = await Promise.all([
    db
      .select({
        priority: serviceCalls.priority,
        count: sql<number>`count(*)`,
      })
      .from(serviceCalls)
      .where(where)
      .groupBy(serviceCalls.priority)
      .orderBy(asc(serviceCalls.priority)),
    db
      .select({
        engineerName: sql<string>`coalesce(nullif(${users.name}, ''), 'Unassigned')`,
        assigned: sql<number>`count(*)`,
        closed: sql<number>`count(*) filter (where ${serviceCalls.status} = 'closed')`,
      })
      .from(serviceCalls)
      .leftJoin(users, eq(users.id, serviceCalls.assignedEngineerId))
      .where(where)
      .groupBy(sql`coalesce(nullif(${users.name}, ''), 'Unassigned')`)
      .orderBy(asc(sql`coalesce(nullif(${users.name}, ''), 'Unassigned')`)),
  ]);

  return {
    totalCalls: asNumber(totals?.totalCalls),
    closedCalls: asNumber(totals?.closedCalls),
    avgResolutionDays: asNumber(totals?.avgResolutionDays),
    byPriority: byPriority.map((item) => ({
      priority: item.priority,
      count: asNumber(item.count),
    })),
    byEngineer: byEngineer.map((item) => ({
      engineerName: item.engineerName,
      assigned: asNumber(item.assigned),
      closed: asNumber(item.closed),
    })),
  };
}

export async function getInventoryReport() {
  const [totals] = await db
    .select({
      totalItems: sql<number>`count(*)`,
      // isLowStock is stored as INTEGER 0/1
      lowStockCount: sql<number>`count(*) filter (where ${inventoryItems.isLowStock} = 1)`,
      // currentStock and unitCost are REAL — no casting needed
      totalValue: sql<string>`coalesce(sum(${inventoryItems.currentStock} * coalesce(${inventoryItems.unitCost}, 0)), 0)`,
    })
    .from(inventoryItems);

  const byCategory = await db
    .select({
      category: inventoryItems.category,
      count: sql<number>`count(*)`,
      value: sql<string>`coalesce(sum(${inventoryItems.currentStock} * coalesce(${inventoryItems.unitCost}, 0)), 0)`,
    })
    .from(inventoryItems)
    .groupBy(inventoryItems.category)
    .orderBy(asc(inventoryItems.category));

  return {
    totalItems: asNumber(totals?.totalItems),
    lowStockCount: asNumber(totals?.lowStockCount),
    totalValue: asNumber(totals?.totalValue),
    byCategory: byCategory.map((item) => ({
      category: item.category,
      count: asNumber(item.count),
      value: asNumber(item.value),
    })),
  };
}
