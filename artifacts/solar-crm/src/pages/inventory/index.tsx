import { useEffect, useMemo, useState } from "react";
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
  Boxes,
  ChevronRight,
  Filter,
  Gauge,
  MapPin,
  Plus,
  ArrowRightLeft,
  Package,
  PackageCheck,
  SlidersHorizontal,
  Tag,
  Truck,
  Warehouse,
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

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not specified";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  iconClass,
  iconBackground,
  valueClass = "text-gray-950",
}: {
  label: string;
  value: string | number;
  helper: React.ReactNode;
  icon: React.ElementType;
  iconClass: string;
  iconBackground: string;
  valueClass?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            {label}
          </p>
          <p className={`mt-2 font-heading text-[1.7rem] font-bold tracking-tight ${valueClass}`}>
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBackground}`}>
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
      </div>
      <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
        {helper}
      </div>
      <div className={`absolute -bottom-12 -right-12 h-32 w-32 rounded-full blur-2xl transition-transform duration-300 group-hover:scale-125 ${iconBackground}`} />
    </div>
  );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Inventory editor
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold text-gray-950">
              Edit item #{itemId}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close inventory item editor"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Package className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Item details</p>
                <p className="text-xs text-gray-400">Identify and classify this material.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Item Name
              </label>
              <input
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.name}
                onChange={set("name")}
                placeholder="Item name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Category
              </label>
              <input
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.category}
                onChange={set("category")}
                placeholder="e.g. Panels"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Unit
              </label>
              <input
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.unit}
                onChange={set("unit")}
                placeholder="e.g. pcs, kg, m"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                SKU / Code{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                className="h-10 w-full rounded-lg border border-gray-200 px-3 font-mono text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.sku}
                onChange={set("sku")}
                placeholder="SKU-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Unit Cost{" "}
                <span className="font-normal text-gray-400">(₹, optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.unitCost}
                onChange={set("unitCost")}
                placeholder="0.00"
              />
            </div>
          </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <Gauge className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Stock levels</p>
                <p className="text-xs text-gray-400">Set thresholds for replenishment.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Current
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={form.currentStock}
                  onChange={set("currentStock")}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Min Level
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={form.minStockLevel}
                  onChange={set("minStockLevel")}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Max Level{" "}
                  <span className="font-normal text-gray-400">(opt)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={form.maxStockLevel}
                  onChange={set("maxStockLevel")}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <Truck className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Logistics</p>
                <p className="text-xs text-gray-400">Keep supplier and storage details current.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Supplier{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={form.supplierName}
                  onChange={set("supplierName")}
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Location{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={form.location}
                  onChange={set("location")}
                  placeholder="Shelf / Rack"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 bg-gray-50/50 p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={isPending || !form.name || !form.category || !form.unit}
            onClick={() => onSubmit(form)}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
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
  const inventoryStats = useMemo(() => {
    const items = inventory ?? [];
    const totalUnits = items.reduce((total, item) => total + Number(item.currentStock || 0), 0);
    const trackedValue = items.reduce(
      (total, item) => total + Number(item.currentStock || 0) * Number(item.unitCost || 0),
      0,
    );
    const stockedItems = items.filter((item) => Number(item.currentStock || 0) > 0).length;
    const lowStockCount = items.filter((item) => item.isLowStock).length;

    return { totalUnits, trackedValue, stockedItems, lowStockCount };
  }, [inventory]);
  const pageCount = Math.max(1, Math.ceil((inventory?.length ?? 0) / pageSize));
  const visibleInventory = inventory?.slice((page - 1) * pageSize, page * pageSize) ?? [];
  const hasFilters = Boolean(search || categoryFilter);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Warehouse className="h-3.5 w-3.5" />
            Inventory / Warehouse
          </div>
          <h1 className="font-heading text-[1.7rem] font-bold tracking-tight text-gray-950">
            Warehouse control
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage material availability, thresholds, and storage details.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:flex-none">
            <ArrowRightLeft className="h-4 w-4 text-gray-500" />
            Stock in/out
          </button>
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:flex-none">
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Inventory items"
          value={inventory?.length ?? 0}
          helper={<><Boxes className="h-3.5 w-3.5 text-blue-600" /><span>{categories.length} categories tracked</span></>}
          icon={Boxes}
          iconClass="text-blue-600"
          iconBackground="bg-blue-50"
        />
        <SummaryCard
          label="Units on hand"
          value={inventoryStats.totalUnits.toLocaleString("en-IN")}
          helper={<><PackageCheck className="h-3.5 w-3.5 text-emerald-600" /><span>{inventoryStats.stockedItems} items currently stocked</span></>}
          icon={PackageCheck}
          iconClass="text-emerald-600"
          iconBackground="bg-emerald-50"
          valueClass="text-emerald-700"
        />
        <SummaryCard
          label="Low stock alerts"
          value={inventoryStats.lowStockCount}
          helper={<><AlertTriangle className={`h-3.5 w-3.5 ${inventoryStats.lowStockCount ? "text-red-600" : "text-emerald-600"}`} /><span>{inventoryStats.lowStockCount ? "Replenishment needed" : "All thresholds healthy"}</span></>}
          icon={AlertTriangle}
          iconClass={inventoryStats.lowStockCount ? "text-red-600" : "text-emerald-600"}
          iconBackground={inventoryStats.lowStockCount ? "bg-red-50" : "bg-emerald-50"}
          valueClass={inventoryStats.lowStockCount ? "text-red-700" : "text-emerald-700"}
        />
        <SummaryCard
          label="Tracked stock value"
          value={`₹${inventoryStats.trackedValue.toLocaleString("en-IN")}`}
          helper={<><Tag className="h-3.5 w-3.5 text-amber-600" /><span>Based on current unit cost</span></>}
          icon={Tag}
          iconClass="text-amber-600"
          iconBackground="bg-amber-50"
        />
      </div>

      {alerts && alerts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-red-200/80 bg-red-50/70 shadow-sm">
          <div className="flex items-start gap-3 border-b border-red-200/70 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-base font-bold text-red-950">Low stock requires attention</h3>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                  {alerts.length} {alerts.length === 1 ? "item" : "items"}
                </span>
              </div>
              <p className="mt-1 text-xs text-red-700/80">These materials are below their minimum threshold.</p>
            </div>
          </div>
          <div className="grid gap-px bg-red-200/60 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 bg-red-50/80 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-red-900">{item.name}</p>
                  <p className="mt-0.5 text-xs text-red-700/70">{item.currentStock} {item.unit} remaining</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-red-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-base font-bold text-gray-950">Master stock list</h2>
                  <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{inventory?.length ?? 0} items</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">Review quantities, thresholds, and storage information</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {hasFilters ? "Filtered inventory" : "All inventory"}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Search inventory"
                placeholder="Search item, SKU, supplier, or location…"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <select
                aria-label="Filter inventory by category"
                className="h-10 w-full min-w-40 appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌄</span>
            </div>
            <button
              type="button"
              onClick={() => { setSearch(""); setCategoryFilter(""); }}
              disabled={!hasFilters}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                <th className="px-5 py-3.5">Item</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">SKU / Code</th>
                <th className="px-5 py-3.5 text-right">On hand</th>
                <th className="px-5 py-3.5">Stock health</th>
                <th className="px-5 py-3.5">Storage</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <TableSkeleton columns={7} />
              ) : inventory?.length === 0 ? (
                <EmptyTableState
                  colSpan={7}
                  title="No inventory items found"
                  description={hasFilters ? "Try clearing a filter or searching for another item." : "Add stock items to start tracking warehouse levels."}
                  action={hasFilters ? <button type="button" onClick={() => { setSearch(""); setCategoryFilter(""); }} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
                />
              ) : (
                visibleInventory.map((item) => {
                  const stockPct = item.maxStockLevel ? (Number(item.currentStock) / Number(item.maxStockLevel)) * 100 : 50;
                  return (
                    <tr key={item.id} className="group transition-colors hover:bg-amber-50/20">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary"><Package className="h-4 w-4" /></div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-950">{item.name}</p>
                            <p className="mt-1 text-xs text-gray-400">{item.supplierName || "Supplier not specified"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">{formatLabel(item.category)}</span></td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">{item.sku || "—"}</td>
                      <td className="px-5 py-4 text-right"><div className="font-heading text-base font-bold text-gray-950">{item.currentStock}</div><div className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">{item.unit}</div></td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-[150px] flex-col gap-2">
                          <span className={`inline-flex self-start items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.isLowStock ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15" : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${item.isLowStock ? "bg-red-500" : "bg-emerald-500"}`} />
                            {item.isLowStock ? "Low stock" : "Adequate"}
                          </span>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full transition-all ${item.isLowStock ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(stockPct, 100)}%` }} /></div>
                          <span className="text-[10px] text-gray-400">{item.minStockLevel} {item.unit} minimum</span>
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="flex max-w-[150px] items-start gap-1.5 text-xs text-gray-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" /><span className="line-clamp-2">{item.location || "Location not set"}</span></div></td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => setEditTarget(item.id)} className="rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:border-gray-200 hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">Edit</button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-gray-100 md:hidden">
          {isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-xl bg-gray-100" />)}</div>
          ) : inventory?.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">{hasFilters ? "No items match these filters." : "No inventory items yet."}</div>
          ) : (
            visibleInventory.map((item) => {
              const stockPct = item.maxStockLevel ? (Number(item.currentStock) / Number(item.maxStockLevel)) * 100 : 50;
              return (
                <div key={item.id} className="space-y-4 p-4 transition-colors hover:bg-amber-50/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500"><Package className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate font-semibold text-gray-950">{item.name}</p><p className="mt-1 text-xs text-gray-400">{item.sku || "No SKU"} · {formatLabel(item.category)}</p></div></div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.isLowStock ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${item.isLowStock ? "bg-red-500" : "bg-emerald-500"}`} />{item.isLowStock ? "Low" : "Good"}</span>
                  </div>
                  <div className="flex items-end justify-between gap-3"><div><p className="text-xs text-gray-500">On hand</p><p className="mt-0.5 font-heading text-xl font-bold text-gray-950">{item.currentStock} <span className="text-xs font-semibold uppercase text-gray-400">{item.unit}</span></p></div><div className="w-32"><div className="mb-1 flex justify-between text-[10px] text-gray-400"><span>Stock health</span><span>{item.minStockLevel} min</span></div><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${item.isLowStock ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(stockPct, 100)}%` }} /></div></div></div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500"><span className="flex min-w-0 items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />{item.location || "Location not set"}</span><button type="button" onClick={() => setEditTarget(item.id)} className="ml-3 shrink-0 font-semibold text-primary hover:underline">Edit item</button></div>
                </div>
              );
            })
          )}
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
