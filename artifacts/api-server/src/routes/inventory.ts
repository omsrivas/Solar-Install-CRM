import { Router, type IRouter } from "express";
import { requireAuth } from "../auth/middleware";
import { requireRole } from "../auth/roles";
import {
  createActivity,
  createInventoryItem,
  createInventoryTransaction,
  deleteInventoryItem,
  findInventoryItemById,
  listInventory,
  listInventoryTransactions,
  updateInventoryItem,
} from "@workspace/db";

const router: IRouter = Router();

const allAuthenticated = [requireAuth];
const warehouseAndAbove = [requireAuth, requireRole("admin", "warehouse")];
const adminOnly = [requireAuth, requireRole("admin")];

function parseId(value: unknown): number | null {
  const id = Number(typeof value === "string" ? value : "");
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parsePositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return isFinite(n) && n >= 0 ? n : null;
}

function computeIsLowStock(
  currentStock: string | number | null | undefined,
  minStockLevel: string | number | null | undefined,
): boolean {
  const stock = Number(currentStock ?? 0);
  const minStock = Number(minStockLevel ?? 0);
  return stock <= minStock;
}

// ─── Alerts ────────────────────────────────────────────────────────────────
// GET /inventory/alerts — must come before /:id to avoid shadowing
router.get(
  "/inventory/alerts",
  ...allAuthenticated,
  async (_request, response) => {
    try {
      const items = await listInventory({ lowStock: true });
      response.json(items);
    } catch {
      response.status(500).json({ error: "Unable to fetch inventory alerts." });
    }
  },
);

// ─── Transactions ───────────────────────────────────────────────────────────
// GET /inventory/transactions
router.get(
  "/inventory/transactions",
  ...allAuthenticated,
  async (request, response) => {
    const q = request.query;

    let itemId: number | undefined;
    if (typeof q.itemId === "string") {
      const parsed = parseId(q.itemId);
      if (!parsed) {
        response.status(400).json({ error: "Invalid itemId." });
        return;
      }
      itemId = parsed;
    }

    let projectId: number | undefined;
    if (typeof q.projectId === "string") {
      const parsed = parseId(q.projectId);
      if (!parsed) {
        response.status(400).json({ error: "Invalid projectId." });
        return;
      }
      projectId = parsed;
    }

    const type = typeof q.type === "string" ? q.type : undefined;

    try {
      const transactions = await listInventoryTransactions({
        itemId,
        projectId,
        type,
      });
      response.json(transactions);
    } catch {
      response
        .status(500)
        .json({ error: "Unable to list inventory transactions." });
    }
  },
);

// POST /inventory/transactions
router.post(
  "/inventory/transactions",
  ...warehouseAndAbove,
  async (request, response) => {
    const body = request.body as Record<string, unknown>;

    const itemId =
      typeof body.itemId === "number"
        ? body.itemId
        : parseId(body.itemId);
    if (!itemId) {
      response.status(400).json({ error: "itemId is required." });
      return;
    }

    const type =
      typeof body.type === "string" ? body.type.trim() : "";
    if (!type) {
      response.status(400).json({ error: "type is required." });
      return;
    }

    const rawQty = body.quantity !== undefined ? Number(body.quantity) : NaN;
    if (isNaN(rawQty) || rawQty <= 0) {
      response
        .status(400)
        .json({ error: "quantity must be a positive number." });
      return;
    }

    let projectId: number | null = null;
    if (body.projectId !== undefined && body.projectId !== null) {
      const parsed = parseId(body.projectId);
      if (!parsed) {
        response.status(400).json({ error: "Invalid projectId." });
        return;
      }
      projectId = parsed;
    }

    const performedById =
      typeof body.performedById === "number"
        ? body.performedById
        : parseId(body.performedById) ?? undefined;

    const notes =
      typeof body.notes === "string" ? body.notes.trim() || null : null;

    try {
      const item = await findInventoryItemById(itemId);
      if (!item) {
        response.status(404).json({ error: "Inventory item not found." });
        return;
      }

      const transaction = await createInventoryTransaction({
        itemId,
        type,
        quantity: rawQty,
        projectId,
        performedById,
        notes,
      });

      // Update item stock based on transaction type
      let newStock = Number(item.currentStock ?? 0);
      if (type === "in") {
        newStock += rawQty;
      } else if (type === "out") {
        newStock = Math.max(0, newStock - rawQty);
      } else if (type === "adjust") {
        newStock = rawQty;
      }

      const isLowStock = computeIsLowStock(newStock, item.minStockLevel);
      await updateInventoryItem(itemId, {
        currentStock: newStock,
        isLowStock,
      });

      void createActivity({ entityType: "inventory", entityId: transaction.id, action: "inventory_transaction", description: `Stock ${type} of ${rawQty} ${item.unit} for ${item.name}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
      response.status(201).json(transaction);
    } catch {
      response
        .status(500)
        .json({ error: "Unable to record inventory transaction." });
    }
  },
);

// ─── Items ──────────────────────────────────────────────────────────────────
// GET /inventory
router.get(
  "/inventory",
  ...allAuthenticated,
  async (request, response) => {
    const q = request.query;

    const category =
      typeof q.category === "string" ? q.category : undefined;
    const search =
      typeof q.search === "string" ? q.search.trim() || undefined : undefined;

    let lowStock: boolean | undefined;
    if (q.lowStock === "true") lowStock = true;
    else if (q.lowStock === "false") lowStock = false;

    try {
      const items = await listInventory({ category, search, lowStock });
      response.json(items);
    } catch {
      response.status(500).json({ error: "Unable to list inventory." });
    }
  },
);

// POST /inventory
router.post(
  "/inventory",
  ...warehouseAndAbove,
  async (request, response) => {
    const body = request.body as Record<string, unknown>;

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      response.status(400).json({ error: "name is required." });
      return;
    }

    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    if (!category) {
      response.status(400).json({ error: "category is required." });
      return;
    }

    const unit =
      typeof body.unit === "string" ? body.unit.trim() : "";
    if (!unit) {
      response.status(400).json({ error: "unit is required." });
      return;
    }

    const sku =
      typeof body.sku === "string" ? body.sku.trim() || null : null;

    const currentStock =
      body.currentStock !== undefined
        ? (parsePositiveNumber(body.currentStock) ?? 0)
        : 0;
    const minStockLevel =
      body.minStockLevel !== undefined
        ? (parsePositiveNumber(body.minStockLevel) ?? 0)
        : 0;
    const maxStockLevel =
      body.maxStockLevel !== undefined &&
      parsePositiveNumber(body.maxStockLevel) !== null
        ? parsePositiveNumber(body.maxStockLevel)
        : null;
    const unitCost =
      body.unitCost !== undefined && parsePositiveNumber(body.unitCost) !== null
        ? parsePositiveNumber(body.unitCost)
        : null;
    const supplierName =
      typeof body.supplierName === "string"
        ? body.supplierName.trim() || null
        : null;
    const location =
      typeof body.location === "string" ? body.location.trim() || null : null;

    const isLowStock = computeIsLowStock(currentStock, minStockLevel);

    try {
      const item = await createInventoryItem({
        name,
        category,
        unit,
        sku,
        currentStock,
        minStockLevel,
        maxStockLevel,
        unitCost,
        supplierName,
        location,
        isLowStock,
      });
      void createActivity({ entityType: "inventory", entityId: item.id, action: "create_inventory_item", description: `Inventory item created: ${item.name} (${item.category})`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
      response.status(201).json(item);
    } catch {
      response.status(500).json({ error: "Unable to create inventory item." });
    }
  },
);

// GET /inventory/:id
router.get(
  "/inventory/:id",
  ...allAuthenticated,
  async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid inventory item ID." });
      return;
    }

    try {
      const item = await findInventoryItemById(id);
      if (!item) {
        response.status(404).json({ error: "Inventory item not found." });
        return;
      }
      response.json(item);
    } catch {
      response.status(500).json({ error: "Unable to fetch inventory item." });
    }
  },
);

// PATCH /inventory/:id
router.patch(
  "/inventory/:id",
  ...warehouseAndAbove,
  async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid inventory item ID." });
      return;
    }

    const body = request.body as Record<string, unknown>;
    const changes: Parameters<typeof updateInventoryItem>[1] = {};

    if (typeof body.name === "string") changes.name = body.name.trim();
    if (typeof body.category === "string")
      changes.category = body.category.trim();
    if (typeof body.sku === "string")
      changes.sku = body.sku.trim() || null;
    if (typeof body.unit === "string") changes.unit = body.unit.trim();
    if (body.currentStock !== undefined) {
      const v = parsePositiveNumber(body.currentStock);
      if (v !== null) changes.currentStock = v;
    }
    if (body.minStockLevel !== undefined) {
      const v = parsePositiveNumber(body.minStockLevel);
      if (v !== null) changes.minStockLevel = v;
    }
    if (body.maxStockLevel !== undefined) {
      const v = parsePositiveNumber(body.maxStockLevel);
      changes.maxStockLevel = v !== null ? v : null;
    }
    if (body.unitCost !== undefined) {
      const v = parsePositiveNumber(body.unitCost);
      changes.unitCost = v !== null ? v : null;
    }
    if (typeof body.supplierName === "string")
      changes.supplierName = body.supplierName.trim() || null;
    if (typeof body.location === "string")
      changes.location = body.location.trim() || null;

    if (Object.keys(changes).length === 0) {
      response
        .status(400)
        .json({ error: "No valid fields provided for update." });
      return;
    }

    try {
      // Fetch current item to recompute isLowStock if stock levels change
      const existing = await findInventoryItemById(id);
      if (!existing) {
        response.status(404).json({ error: "Inventory item not found." });
        return;
      }

      const newCurrentStock = changes.currentStock ?? existing.currentStock;
      const newMinStockLevel = changes.minStockLevel ?? existing.minStockLevel;
      changes.isLowStock = computeIsLowStock(newCurrentStock, newMinStockLevel);

      const item = await updateInventoryItem(id, changes);
      if (!item) {
        response.status(404).json({ error: "Inventory item not found." });
        return;
      }
      void createActivity({ entityType: "inventory", entityId: item.id, action: "update_inventory_item", description: `Inventory item updated: ${item.name}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
      response.json(item);
    } catch {
      response.status(500).json({ error: "Unable to update inventory item." });
    }
  },
);

// DELETE /inventory/:id — admin only
router.delete(
  "/inventory/:id",
  ...adminOnly,
  async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid inventory item ID." });
      return;
    }

    try {
      const existing = await findInventoryItemById(id);
      if (!existing) {
        response.status(404).json({ error: "Inventory item not found." });
        return;
      }
      await deleteInventoryItem(id);
      void createActivity({ entityType: "inventory", entityId: id, action: "delete_inventory_item", description: `Inventory item deleted: ${existing.name}`, performedById: request.auth!.dbUserId ?? null }).catch(() => {});
      response.status(204).send();
    } catch {
      response.status(500).json({ error: "Unable to delete inventory item." });
    }
  },
);

export default router;
