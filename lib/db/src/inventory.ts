import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "./index";
import {
  inventoryItems,
  inventoryTransactions,
  type InventoryItem,
  type InventoryTransaction,
} from "./schema/crm";

export type InventoryFilters = {
  category?: string;
  search?: string;
  lowStock?: boolean;
};

export async function listInventory(
  filters: InventoryFilters = {},
): Promise<InventoryItem[]> {
  const conditions = [];
  if (filters.category) conditions.push(eq(inventoryItems.category, filters.category));
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        like(inventoryItems.name, pattern),
        like(inventoryItems.sku, pattern),
        like(inventoryItems.supplierName, pattern),
      ),
    );
  }
  if (filters.lowStock !== undefined) {
    conditions.push(eq(inventoryItems.isLowStock, filters.lowStock));
  }
  return db
    .select()
    .from(inventoryItems)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(inventoryItems.name));
}

export async function findInventoryItemById(
  id: number,
): Promise<InventoryItem | null> {
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.id, id))
    .limit(1);
  return item ?? null;
}

export async function createInventoryItem(
  input: typeof inventoryItems.$inferInsert,
): Promise<InventoryItem> {
  const [item] = await db
    .insert(inventoryItems)
    .values({ ...input, isLowStock: input.isLowStock ?? false })
    .returning();
  return item;
}

export async function updateInventoryItem(
  id: number,
  changes: Partial<Omit<typeof inventoryItems.$inferInsert, "id">>,
): Promise<InventoryItem | null> {
  const [item] = await db
    .update(inventoryItems)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(inventoryItems.id, id))
    .returning();
  return item ?? null;
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
}

export async function listInventoryTransactions(filters: {
  itemId?: number;
  projectId?: number;
  type?: string;
} = {}): Promise<InventoryTransaction[]> {
  const conditions = [];
  if (filters.itemId) conditions.push(eq(inventoryTransactions.itemId, filters.itemId));
  if (filters.projectId) {
    conditions.push(eq(inventoryTransactions.projectId, filters.projectId));
  }
  if (filters.type) conditions.push(eq(inventoryTransactions.type, filters.type));
  return db
    .select()
    .from(inventoryTransactions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(inventoryTransactions.createdAt));
}

export async function createInventoryTransaction(
  input: typeof inventoryTransactions.$inferInsert,
): Promise<InventoryTransaction> {
  const [transaction] = await db
    .insert(inventoryTransactions)
    .values(input)
    .returning();
  return transaction;
}
