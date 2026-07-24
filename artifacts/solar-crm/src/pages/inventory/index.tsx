import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInventory,
  useGetInventoryAlerts,
  useUpdateInventoryItem,
  getListInventoryQueryKey,
  getGetInventoryAlertsQueryKey,
} from "@workspace/api-client-react";
import {
  Search,
  AlertTriangle,
  Package,
  Layers,
  Plus,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmptyTableState, PaginationBar, TableSkeleton } from "@/components/table-state";

interface EditForm {
  name: string;
  category: string;
  sku: string;
  unit: string;
  currentStock: string;
  minStockLevel: string;
  maxStockLevel: string;
  unitCost: string;
  supplierName: string;
  location: string;
}

function EditInventoryModal({
  itemId,
  initial,
  onClose,
  onSubmit,
  isPending,
}: {
  itemId: number;
  initial: EditForm;
  onClose: () => void;
  onSubmit: (data: EditForm) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<EditForm>(initial);
  const set =
    (field: keyof EditForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            Edit Item #{itemId}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Item Name
              </label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.name}
                onChange={set("name")}
                placeholder="Item name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Category
              </label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.category}
                onChange={set("category")}
                placeholder="e.g. Panels"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Unit
              </label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.unit}
                onChange={set("unit")}
                placeholder="e.g. pcs, kg, m"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                SKU / Code{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                value={form.sku}
                onChange={set("sku")}
                placeholder="SKU-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Unit Cost{" "}
                <span className="text-gray-400 font-normal">(₹, optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.unitCost}
                onChange={set("unitCost")}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Stock Levels
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Current
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.currentStock}
                  onChange={set("currentStock")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Min Level
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.minStockLevel}
                  onChange={set("minStockLevel")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Max Level{" "}
                  <span className="text-gray-400 font-normal">(opt)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.maxStockLevel}
                  onChange={set("maxStockLevel")}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Logistics
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Supplier{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.supplierName}
                  onChange={set("supplierName")}
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Location{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.location}
                  onChange={set("location")}
                  placeholder="Shelf / Rack"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            type="button"
            aria-label="Close edit inventory item"
            onClick={onClose}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={isPending || !form.name || !form.category || !form.unit}
            onClick={() => onSubmit(form)}
            className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Inventory() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [editTarget, setEditTarget] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alerts } = useGetInventoryAlerts();
  const { data: inventory, isLoading } = useListInventory({
    search: search || undefined,
    category: categoryFilter || undefined,
  });

  const updateItem = useUpdateInventoryItem({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListInventoryQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetInventoryAlertsQueryKey(),
        });
        setEditTarget(null);
        toast({ title: "Item updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update item", variant: "destructive" });
      },
    },
  });

  const editTargetItem = inventory?.find((i) => i.id === editTarget);

  const handleSubmit = (form: EditForm) => {
    if (!editTarget) return;
    updateItem.mutate({
      id: editTarget,
      data: {
        name: form.name,
        category: form.category,
        unit: form.unit,
        sku: form.sku || undefined,
        currentStock: form.currentStock ? Number(form.currentStock) : undefined,
        minStockLevel: form.minStockLevel
          ? Number(form.minStockLevel)
          : undefined,
        maxStockLevel: form.maxStockLevel
          ? Number(form.maxStockLevel)
          : undefined,
        unitCost: form.unitCost ? Number(form.unitCost) : undefined,
        supplierName: form.supplierName || undefined,
        location: form.location || undefined,
      },
    });
  };

  const categories = Array.from(
    new Set(inventory?.map((i) => i.category) || [])
  );
  const pageCount = Math.max(1, Math.ceil((inventory?.length ?? 0) / pageSize));
  const visibleInventory = inventory?.slice((page - 1) * pageSize, page * pageSize) ?? [];

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Warehouse Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage stock levels and material issuance
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm shadow-sm">
            <ArrowRightLeft className="h-4 w-4" />
            Stock In/Out
          </button>
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm shadow-sm">
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      {alerts && alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider">
                Critical Low Stock Alerts
              </h3>
              <div className="mt-2 space-y-1">
                {alerts.map((item) => (
                  <p key={item.id} className="text-sm text-red-700">
                    <span className="font-semibold">{item.name}</span> is below
                    minimum level ({item.currentStock} {item.unit} remaining)
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Master Stock List</h2>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                aria-label="Search inventory"
                placeholder="Search inventory..."
                className="h-10 w-full rounded-md border border-input bg-white pl-9 pr-4 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter inventory by category"
              className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-gray-50/30">
                <th className="px-6 py-4 font-semibold">Item Name</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">SKU / Code</th>
                <th className="px-6 py-4 font-semibold text-right">
                  Current Stock
                </th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <TableSkeleton columns={6} />
              ) : inventory?.length === 0 ? (
                <EmptyTableState
                  colSpan={6}
                  title="No inventory items found"
                  description={search || categoryFilter ? "Try clearing a filter or searching for another item." : "Add stock items to start tracking warehouse levels."}
                  action={search || categoryFilter ? (
                    <button
                      type="button"
                      onClick={() => { setSearch(""); setCategoryFilter(""); }}
                      className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      Clear filters
                    </button>
                  ) : undefined}
                />
              ) : (
                visibleInventory.map((item) => {
                  const stockPct = item.maxStockLevel
                    ? (Number(item.currentStock) /
                        Number(item.maxStockLevel)) *
                      100
                    : 50;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          {item.name}
                        </div>
                        {item.supplierName && (
                          <div className="text-xs text-gray-400 mt-0.5 ml-6">
                            {item.supplierName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                        {item.sku || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-gray-900 text-base">
                          {item.currentStock}{" "}
                          <span className="text-xs text-gray-500 font-normal uppercase">
                            {item.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.isLowStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-100 text-red-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-green-100 text-green-700">
                            Adequate
                          </span>
                        )}
                        <div className="mt-2 h-1.5 w-24 ml-auto bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${item.isLowStock ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(stockPct, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setEditTarget(item.id)}
                           className="rounded px-2 py-1 text-sm font-medium text-gray-500 underline decoration-gray-300 underline-offset-4 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={page}
          pageCount={pageCount}
          total={inventory?.length ?? 0}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {editTarget !== null && editTargetItem && (
        <EditInventoryModal
          itemId={editTarget}
          initial={{
            name: editTargetItem.name,
            category: editTargetItem.category,
            sku: editTargetItem.sku ?? "",
            unit: editTargetItem.unit,
            currentStock: editTargetItem.currentStock,
            minStockLevel: editTargetItem.minStockLevel,
            maxStockLevel: editTargetItem.maxStockLevel ?? "",
            unitCost: editTargetItem.unitCost ?? "",
            supplierName: editTargetItem.supplierName ?? "",
            location: editTargetItem.location ?? "",
          }}
          onClose={() => setEditTarget(null)}
          onSubmit={handleSubmit}
          isPending={updateItem.isPending}
        />
      )}
    </div>
  );
}
