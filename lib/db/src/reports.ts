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

function timestampRange(
  column: SQLWrapper,
  filters: ReportDateRange,
): SQL[] {
  const conditions: SQL[] = [];
  if (filters.fromDate) {
    conditions.push(sql`${column} >= ${filters.fromDate}::date`);
  }
  if (filters.toDate) {
    conditions.push(sql`${column} < ${filters.toDate}::date + interval '1 day'`);
  }
  return conditions;
}

function paymentDateRange(
  filters: ReportDateRange,
): SQL[] {
  const paymentDate = sql`coalesce(${payments.paymentDate}, ${payments.createdAt}::date)`;
  const conditions: SQL[] = [];
  if (filters.fromDate) {
    conditions.push(sql`${paymentDate} >= ${filters.fromDate}::date`);
  }
  if (filters.toDate) {
    conditions.push(sql`${paymentDate} < ${filters.toDate}::date + interval '1 day'`);
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
      totalLeads: sql<number>`count(*)::int`,
      newLeads: sql<number>`count(*) filter (where ${leads.stage} = 'new')::int`,
      convertedLeads: sql<number>`count(*) filter (where ${leads.convertedProjectId} is not null or ${leads.stage} = 'converted')::int`,
    })
    .from(leads)
    .where(where);

  const [bySource, byStage, daily] = await Promise.all([
    db
      .select({
        source: sql<string>`coalesce(nullif(${leads.leadSource}, ''), 'Unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .where(where)
      .groupBy(sql`coalesce(nullif(${leads.leadSource}, ''), 'Unknown')`)
      .orderBy(asc(sql`coalesce(nullif(${leads.leadSource}, ''), 'Unknown')`)),
    db
      .select({
        stage: leads.stage,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .where(where)
      .groupBy(leads.stage)
      .orderBy(asc(leads.stage)),
    db
      .select({
        date: sql<string>`to_char(${leads.createdAt}::date, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .where(where)
      .groupBy(sql`${leads.createdAt}::date`)
      .orderBy(asc(sql`${leads.createdAt}::date`)),
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
      totalOrders: sql<number>`count(distinct ${projects.id})::int`,
      totalRevenue: sql<string>`coalesce(sum(${projects.totalAmount}), 0)`,
      totalLeads: sql<number>`count(distinct ${leads.id})::int`,
    })
    .from(leads)
    .leftJoin(projects, eq(projects.leadId, leads.id))
    .where(where);

  const bySalesPerson = await db
    .select({
      salesPersonName: sql<string>`coalesce(nullif(${users.name}, ''), 'Unassigned')`,
      leadsAssigned: sql<number>`count(distinct ${leads.id})::int`,
      ordersConverted: sql<number>`count(distinct ${projects.id})::int`,
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
  const paymentDate = sql`coalesce(${payments.paymentDate}, ${payments.createdAt}::date)`;

  const [totals] = await db
    .select({
      totalCollected: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'paid'), 0)`,
      totalPending: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'pending'), 0)`,
      totalOverdue: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'overdue'), 0)`,
    })
    .from(payments)
    .where(where);

  const [daily, byPaymentMode] = await Promise.all([
    db
      .select({
        date: sql<string>`to_char(${paymentDate}, 'YYYY-MM-DD')`,
        collected: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'paid'), 0)`,
      })
      .from(payments)
      .where(where)
      .groupBy(paymentDate)
      .orderBy(asc(paymentDate)),
    db
      .select({
        mode: sql<string>`coalesce(nullif(${payments.paymentMode}, ''), 'Unspecified')`,
        amount: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'paid'), 0)`,
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
      date: item.date,
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
      totalCalls: sql<number>`count(*)::int`,
      closedCalls: sql<number>`count(*) filter (where ${serviceCalls.status} = 'closed')::int`,
      avgResolutionDays: sql<number>`coalesce(avg(extract(epoch from (${serviceCalls.closedAt} - ${serviceCalls.createdAt})) / 86400) filter (where ${serviceCalls.closedAt} is not null), 0)`,
    })
    .from(serviceCalls)
    .where(where);

  const [byPriority, byEngineer] = await Promise.all([
    db
      .select({
        priority: serviceCalls.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(serviceCalls)
      .where(where)
      .groupBy(serviceCalls.priority)
      .orderBy(asc(serviceCalls.priority)),
    db
      .select({
        engineerName: sql<string>`coalesce(nullif(${users.name}, ''), 'Unassigned')`,
        assigned: sql<number>`count(*)::int`,
        closed: sql<number>`count(*) filter (where ${serviceCalls.status} = 'closed')::int`,
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
      totalItems: sql<number>`count(*)::int`,
      lowStockCount: sql<number>`count(*) filter (where ${inventoryItems.isLowStock} = true)::int`,
      totalValue: sql<string>`coalesce(sum(${inventoryItems.currentStock}::numeric * coalesce(${inventoryItems.unitCost}::numeric, 0)), 0)`,
    })
    .from(inventoryItems);

  const byCategory = await db
    .select({
      category: inventoryItems.category,
      count: sql<number>`count(*)::int`,
      value: sql<string>`coalesce(sum(${inventoryItems.currentStock}::numeric * coalesce(${inventoryItems.unitCost}::numeric, 0)), 0)`,
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