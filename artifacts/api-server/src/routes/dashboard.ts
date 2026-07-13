import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, leadsTable, projectsTable, paymentsTable, serviceCallsTable, inventoryItemsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [{ totalLeads }] = await db.select({ totalLeads: sql<number>`count(*)::int` }).from(leadsTable);
  const [{ todayFollowUps }] = await db.select({ todayFollowUps: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.followUpDate, today));
  const [{ ordersOwned }] = await db.select({ ordersOwned: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.stage, "order_owned"));
  const [{ totalRevenue }] = await db.select({ totalRevenue: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(eq(paymentsTable.status, "received"));
  const [{ pendingComplaints }] = await db.select({ pendingComplaints: sql<number>`count(*)::int` }).from(serviceCallsTable).where(sql`status != 'closed'`);
  const [{ activeProjects }] = await db.select({ activeProjects: sql<number>`count(*)::int` }).from(projectsTable).where(sql`stage != 'completed'`);
  const [{ pendingPayments }] = await db.select({ pendingPayments: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(eq(paymentsTable.status, "pending"));
  const inventoryItems = await db.select().from(inventoryItemsTable);
  const lowStockAlerts = inventoryItems.filter(i => parseFloat(i.currentStock) <= parseFloat(i.minStockLevel)).length;

  res.json({ totalLeads, todayFollowUps, ordersOwned, totalRevenue, pendingComplaints, lowStockAlerts, activeProjects, pendingPayments });
});

export default router;
