import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, leadsTable, projectsTable, paymentsTable, serviceCallsTable, inventoryItemsTable, inventoryTransactionsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/reports/leads", async (req, res): Promise<void> => {
  const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
  const [{ totalLeads }] = await db.select({ totalLeads: sql<number>`count(*)::int` }).from(leadsTable);
  const dateWhere = fromDate || toDate ? and(
    fromDate ? gte(leadsTable.createdAt, new Date(fromDate)) : undefined,
    toDate ? lte(leadsTable.createdAt, (() => { const d = new Date(toDate); d.setHours(23, 59, 59, 999); return d; })()) : undefined,
  ) : undefined;
  const [{ newLeads }] = await db.select({ newLeads: sql<number>`count(*)::int` }).from(leadsTable).where(dateWhere);
  const [{ convertedLeads }] = await db.select({ convertedLeads: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.stage, "order_owned"));
  const sourceRows = await db.select({ source: leadsTable.leadSource, count: sql<number>`count(*)::int` }).from(leadsTable).groupBy(leadsTable.leadSource);
  const bySource = sourceRows.map(r => ({ source: r.source ?? "Unknown", count: r.count }));
  const stageRows = await db.select({ stage: leadsTable.stage, count: sql<number>`count(*)::int` }).from(leadsTable).groupBy(leadsTable.stage);
  const byStage = stageRows.map(r => ({ stage: r.stage, count: r.count }));
  const dailyRows = await db.select({ date: sql<string>`date(${leadsTable.createdAt})::text`, count: sql<number>`count(*)::int` }).from(leadsTable).where(dateWhere).groupBy(sql`date(${leadsTable.createdAt})`).orderBy(sql`date(${leadsTable.createdAt})`);
  const daily = dailyRows.map(r => ({ date: r.date, count: r.count }));
  res.json({ totalLeads, newLeads, convertedLeads, bySource, byStage, daily });
});

router.get("/reports/sales", async (req, res): Promise<void> => {
  const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
  const [{ totalOrders }] = await db.select({ totalOrders: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.stage, "order_owned"));
  const [{ totalRevenue }] = await db.select({ totalRevenue: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(eq(paymentsTable.status, "received"));
  const [{ totalLeads }] = await db.select({ totalLeads: sql<number>`count(*)::int` }).from(leadsTable);
  const conversionRate = totalLeads > 0 ? Number(((totalOrders / totalLeads) * 100).toFixed(1)) : 0;

  const salesPersonRows = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    leadsAssigned: sql<number>`count(distinct ${leadsTable.id})::int`,
    ordersConverted: sql<number>`count(distinct case when ${leadsTable.stage} = 'order_owned' then ${leadsTable.id} end)::int`,
  }).from(usersTable).leftJoin(leadsTable, eq(leadsTable.assignedSalesPersonId, usersTable.id)).where(eq(usersTable.role, "sales")).groupBy(usersTable.id, usersTable.name);

  const bySalesPerson = salesPersonRows.map(r => ({
    salesPersonName: r.name,
    leadsAssigned: r.leadsAssigned,
    ordersConverted: r.ordersConverted,
    revenue: 0,
  }));

  res.json({ totalOrders, totalRevenue, bySalesPerson, conversionRate });
});

router.get("/reports/finance", async (req, res): Promise<void> => {
  const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
  const dateWhere = fromDate || toDate ? and(
    fromDate ? gte(paymentsTable.createdAt, new Date(fromDate)) : undefined,
    toDate ? lte(paymentsTable.createdAt, (() => { const d = new Date(toDate); d.setHours(23, 59, 59, 999); return d; })()) : undefined,
  ) : undefined;
  const [{ totalCollected }] = await db.select({ totalCollected: sql<number>`coalesce(sum(case when status = 'received' then amount::numeric else 0 end), 0)::float` }).from(paymentsTable);
  const [{ totalPending }] = await db.select({ totalPending: sql<number>`coalesce(sum(case when status = 'pending' then amount::numeric else 0 end), 0)::float` }).from(paymentsTable);
  const [{ totalOverdue }] = await db.select({ totalOverdue: sql<number>`coalesce(sum(case when status = 'overdue' then amount::numeric else 0 end), 0)::float` }).from(paymentsTable);
  const dailyRows = await db.select({ date: sql<string>`date(${paymentsTable.createdAt})::text`, collected: sql<number>`coalesce(sum(case when status='received' then amount::numeric else 0 end), 0)::float` }).from(paymentsTable).where(and(eq(paymentsTable.status, "received"), dateWhere)).groupBy(sql`date(${paymentsTable.createdAt})`).orderBy(sql`date(${paymentsTable.createdAt})`);
  const daily = dailyRows.map(r => ({ date: r.date, collected: r.collected }));
  const modeRows = await db.select({ mode: paymentsTable.paymentMode, amount: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(eq(paymentsTable.status, "received")).groupBy(paymentsTable.paymentMode);
  const byPaymentMode = modeRows.map(r => ({ mode: r.mode ?? "Unknown", amount: r.amount }));
  res.json({ totalCollected, totalPending, totalOverdue, daily, byPaymentMode });
});

router.get("/reports/service", async (req, res): Promise<void> => {
  const [{ totalCalls }] = await db.select({ totalCalls: sql<number>`count(*)::int` }).from(serviceCallsTable);
  const [{ closedCalls }] = await db.select({ closedCalls: sql<number>`count(*)::int` }).from(serviceCallsTable).where(eq(serviceCallsTable.status, "closed"));
  const avgRows = await db.select({ avg: sql<number>`coalesce(avg(extract(epoch from (closed_at - created_at)) / 86400), 0)::float` }).from(serviceCallsTable).where(eq(serviceCallsTable.status, "closed"));
  const avgResolutionDays = Number((avgRows[0]?.avg ?? 0).toFixed(1));
  const priorityRows = await db.select({ priority: serviceCallsTable.priority, count: sql<number>`count(*)::int` }).from(serviceCallsTable).groupBy(serviceCallsTable.priority);
  const byPriority = priorityRows.map(r => ({ priority: r.priority, count: r.count }));
  const engineerRows = await db.select({ engineerName: usersTable.name, assigned: sql<number>`count(*)::int`, closed: sql<number>`count(case when ${serviceCallsTable.status} = 'closed' then 1 end)::int` }).from(serviceCallsTable).leftJoin(usersTable, eq(serviceCallsTable.assignedEngineerId, usersTable.id)).groupBy(usersTable.name);
  const byEngineer = engineerRows.map(r => ({ engineerName: r.engineerName ?? "Unassigned", assigned: r.assigned, closed: r.closed }));
  res.json({ totalCalls, closedCalls, avgResolutionDays, byPriority, byEngineer });
});

router.get("/reports/inventory", async (_req, res): Promise<void> => {
  const items = await db.select().from(inventoryItemsTable);
  const totalItems = items.length;
  const lowStockCount = items.filter(i => parseFloat(i.currentStock) <= parseFloat(i.minStockLevel)).length;
  const totalValue = items.reduce((sum, i) => sum + (parseFloat(i.currentStock) * parseFloat(i.unitCost ?? "0")), 0);
  const categoryMap: Record<string, { count: number; value: number }> = {};
  for (const i of items) {
    const cat = i.category;
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, value: 0 };
    categoryMap[cat].count++;
    categoryMap[cat].value += parseFloat(i.currentStock) * parseFloat(i.unitCost ?? "0");
  }
  const byCategory = Object.entries(categoryMap).map(([category, v]) => ({ category, ...v }));
  res.json({ totalItems, lowStockCount, totalValue, byCategory });
});

export default router;
