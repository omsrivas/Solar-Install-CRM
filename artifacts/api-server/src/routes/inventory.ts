import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { db, inventoryItemsTable, inventoryTransactionsTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

function isLowStock(item: { currentStock: string; minStockLevel: string }): boolean {
  return parseFloat(item.currentStock) <= parseFloat(item.minStockLevel);
}

// Alerts
router.get("/inventory/alerts", async (_req, res): Promise<void> => {
  const items = await db.select().from(inventoryItemsTable);
  const lowStock = items.filter(isLowStock).map(i => ({ ...i, isLowStock: true }));
  res.json(lowStock);
});

// Transactions list
router.get("/inventory/transactions", async (req, res): Promise<void> => {
  const { itemId, projectId, type } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (itemId) conditions.push(eq(inventoryTransactionsTable.itemId, Number(itemId)));
  if (projectId) conditions.push(eq(inventoryTransactionsTable.projectId, Number(projectId)));
  if (type) conditions.push(eq(inventoryTransactionsTable.type, type));
  const rows = await db.select({
    id: inventoryTransactionsTable.id,
    itemId: inventoryTransactionsTable.itemId,
    type: inventoryTransactionsTable.type,
    quantity: inventoryTransactionsTable.quantity,
    projectId: inventoryTransactionsTable.projectId,
    projectName: projectsTable.customerName,
    performedById: inventoryTransactionsTable.performedById,
    notes: inventoryTransactionsTable.notes,
    createdAt: inventoryTransactionsTable.createdAt,
  }).from(inventoryTransactionsTable).leftJoin(projectsTable, eq(inventoryTransactionsTable.projectId, projectsTable.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(inventoryTransactionsTable.createdAt));
  res.json(rows);
});

// Record transaction
router.post("/inventory/transactions", async (req, res): Promise<void> => {
  const { itemId, type, quantity, projectId, performedById, notes } = req.body;
  if (!itemId || !type || quantity === undefined) { res.status(400).json({ error: "itemId, type, quantity required" }); return; }
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, Number(itemId)));
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }
  const current = parseFloat(item.currentStock);
  const qty = Number(quantity);
  const STOCK_IN = new Set(["stock_in", "return_from_project"]);
  const newStock = STOCK_IN.has(type) ? current + qty : current - qty;
  if (newStock < 0) { res.status(400).json({ error: "Insufficient stock" }); return; }
  const [tx] = await db.insert(inventoryTransactionsTable).values({ itemId: Number(itemId), type, quantity: String(qty), projectId: projectId || null, performedById: performedById || null, notes }).returning();
  await db.update(inventoryItemsTable).set({ currentStock: String(newStock) }).where(eq(inventoryItemsTable.id, Number(itemId)));
  res.status(201).json(tx);
});

// List items
router.get("/inventory", async (req, res): Promise<void> => {
  const { category, search, lowStock } = req.query as Record<string, string>;
  let items = await db.select().from(inventoryItemsTable).orderBy(inventoryItemsTable.name);
  if (category) items = items.filter(i => i.category === category);
  if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku ?? "").toLowerCase().includes(search.toLowerCase()));
  const result = items.map(i => ({ ...i, isLowStock: isLowStock(i) }));
  if (lowStock === "true") return res.json(result.filter(i => i.isLowStock));
  res.json(result);
});

router.post("/inventory", async (req, res): Promise<void> => {
  const body = req.body;
  const n2s = (v: number | undefined) => v !== undefined ? String(v) : undefined;
  const [item] = await db.insert(inventoryItemsTable).values({
    ...body,
    currentStock: n2s(body.currentStock) ?? "0",
    minStockLevel: n2s(body.minStockLevel) ?? "0",
    maxStockLevel: n2s(body.maxStockLevel),
    unitCost: n2s(body.unitCost),
  }).returning();
  res.status(201).json({ ...item, isLowStock: isLowStock(item) });
});

router.get("/inventory/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }
  res.json({ ...item, isLowStock: isLowStock(item) });
});

router.patch("/inventory/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body = req.body;
  const n2s = (v: number | undefined) => v !== undefined ? String(v) : undefined;
  if (body.currentStock !== undefined) body.currentStock = n2s(body.currentStock);
  if (body.minStockLevel !== undefined) body.minStockLevel = n2s(body.minStockLevel);
  if (body.maxStockLevel !== undefined) body.maxStockLevel = n2s(body.maxStockLevel);
  if (body.unitCost !== undefined) body.unitCost = n2s(body.unitCost);
  const [item] = await db.update(inventoryItemsTable).set(body).where(eq(inventoryItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }
  res.json({ ...item, isLowStock: isLowStock(item) });
});

router.delete("/inventory/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  res.status(204).send();
});

export default router;
