import { useState } from "react";
import { useListInventory, useGetInventoryAlerts } from "@workspace/api-client-react";
import { Search, Filter, AlertTriangle, Package, Layers, Plus, ArrowRightLeft } from "lucide-react";

export function Inventory() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  
  const { data: alerts } = useGetInventoryAlerts();
  const { data: inventory, isLoading } = useListInventory({
    search: search || undefined,
    category: categoryFilter || undefined,
  });

  const categories = Array.from(new Set(inventory?.map(i => i.category) || []));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Warehouse Control</h1>
          <p className="text-sm text-gray-500 mt-1">Manage stock levels and material issuance</p>
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
              <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider">Critical Low Stock Alerts</h3>
              <div className="mt-2 space-y-1">
                {alerts.map(item => (
                  <p key={item.id} className="text-sm text-red-700">
                    <span className="font-semibold">{item.name}</span> is below minimum level ({item.currentStock} {item.unit} remaining)
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
                placeholder="Search inventory..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                <th className="px-6 py-4 font-semibold text-right">Current Stock</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 animate-pulse">Loading inventory...</td>
                </tr>
              ) : inventory?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No items found matching criteria.</td>
                </tr>
              ) : (
                inventory?.map((item) => {
                  const stockPct = item.maxStockLevel 
                    ? (Number(item.currentStock) / Number(item.maxStockLevel)) * 100 
                    : 50; // Fallback if no max

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                        {item.sku || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-gray-900 text-base">
                          {item.currentStock} <span className="text-xs text-gray-500 font-normal uppercase">{item.unit}</span>
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
                            className={`h-full rounded-full transition-all ${item.isLowStock ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${Math.min(stockPct, 100)}%` }} 
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-sm font-medium text-gray-500 hover:text-gray-900 underline decoration-gray-300 underline-offset-4">
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
      </div>
    </div>
  );
}
