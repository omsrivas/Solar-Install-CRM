import { useState } from "react";
import { 
  useGetLeadsReport, 
  useGetSalesReport, 
  useGetFinanceReport, 
  useGetInventoryReport 
} from "@workspace/api-client-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { FileText, TrendingUp, IndianRupee, Package, Users } from "lucide-react";

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#64748b'];

export function Reports() {
  const [activeTab, setActiveTab] = useState<"sales" | "finance" | "inventory">("sales");

  const { data: leadsReport } = useGetLeadsReport({});
  const { data: salesReport } = useGetSalesReport({});
  const { data: financeReport } = useGetFinanceReport({});
  const { data: inventoryReport } = useGetInventoryReport();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Business Intelligence</h1>
          <p className="text-sm text-gray-500 mt-1">Analytics and performance reports</p>
        </div>
        <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm shadow-sm">
          <FileText className="h-4 w-4" />
          Export PDF
        </button>
      </div>

      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-lg border border-gray-200 w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "sales" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <TrendingUp className="h-4 w-4" /> Sales & Pipeline
        </button>
        <button
          onClick={() => setActiveTab("finance")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "finance" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <IndianRupee className="h-4 w-4" /> Financials
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "inventory" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Package className="h-4 w-4" /> Inventory
        </button>
      </div>

      {activeTab === "sales" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{leadsReport?.totalLeads || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Orders Won</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{salesReport?.totalOrders || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Conversion Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{Math.round(salesReport?.conversionRate || 0)}%</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Sales Revenue</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">₹{((salesReport?.totalRevenue || 0) / 100000).toFixed(1)}L</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wider mb-6">Leads by Stage</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsReport?.byStage || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="stage" tickFormatter={(v) => v.replace('_', ' ')} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wider mb-6">Sales Rep Performance</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesReport?.bySalesPerson || []} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="salesPersonName" type="category" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="ordersConverted" name="Orders Won" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "finance" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-50/50 pointer-events-none" />
              <p className="text-sm text-emerald-800 font-bold uppercase tracking-wider relative z-10">Total Collected</p>
              <p className="text-3xl font-bold text-emerald-700 mt-2 relative z-10">₹{(financeReport?.totalCollected || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-amber-50/50 pointer-events-none" />
              <p className="text-sm text-amber-800 font-bold uppercase tracking-wider relative z-10">Total Pending</p>
              <p className="text-3xl font-bold text-amber-700 mt-2 relative z-10">₹{(financeReport?.totalPending || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-red-50/50 pointer-events-none" />
              <p className="text-sm text-red-800 font-bold uppercase tracking-wider relative z-10">Total Overdue</p>
              <p className="text-3xl font-bold text-red-700 mt-2 relative z-10">₹{(financeReport?.totalOverdue || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wider mb-6">Collection Trend</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financeReport?.daily || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Collected']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wider mb-6">Payment Modes</h3>
              <div className="h-72 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={financeReport?.byPaymentMode || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="amount"
                      nameKey="mode"
                    >
                      {(financeReport?.byPaymentMode || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{inventoryReport?.totalItems || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Total Value</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">₹{((inventoryReport?.totalValue || 0) / 100000).toFixed(1)}L</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm bg-red-50/10">
              <p className="text-sm text-red-800 font-bold uppercase tracking-wider">Low Stock Alerts</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{inventoryReport?.lowStockCount || 0}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wider mb-6">Inventory Value by Category</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryReport?.byCategory || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar yAxisId="left" dataKey="value" name="Value (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar yAxisId="right" dataKey="count" name="Item Count" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
