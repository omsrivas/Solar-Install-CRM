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
import {
  BarChart3,
  CheckCircle2,
  FileText,
  IndianRupee,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
  WalletCards,
  AlertTriangle,
  Boxes,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#64748b'];

function MetricCard({
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
  helper: string;
  icon: React.ElementType;
  iconClass: string;
  iconBackground: string;
  valueClass?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</p>
          <p className={`mt-2 font-heading text-[1.7rem] font-bold tracking-tight ${valueClass}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBackground}`}>
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
      </div>
      <p className="relative z-10 mt-4 truncate border-t border-gray-100 pt-3 text-xs text-gray-500">{helper}</p>
      <div className={`absolute -bottom-12 -right-12 h-32 w-32 rounded-full blur-2xl transition-transform duration-300 group-hover:scale-125 ${iconBackground}`} />
    </div>
  );
}

function ChartPanel({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-base font-bold text-gray-950">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400 sm:flex">
          <BarChart3 className="h-4 w-4" />
        </div>
      </div>
      {children}
    </div>
  );
}

export function Reports() {
  const [activeTab, setActiveTab] = useState<"sales" | "finance" | "inventory">("sales");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { toast } = useToast();

  const dateParams = {
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };

  const { data: leadsReport } = useGetLeadsReport(dateParams);
  const { data: salesReport } = useGetSalesReport(dateParams);
  const { data: financeReport } = useGetFinanceReport(dateParams);
  const { data: inventoryReport } = useGetInventoryReport();

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <BarChart3 className="h-3.5 w-3.5" />
            Reports / Insights
          </div>
          <h1 className="font-heading text-[1.7rem] font-bold tracking-tight text-gray-950">Business intelligence</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor sales performance, collections, and warehouse value.</p>
        </div>
        <button
          onClick={() =>
            toast({
              title: "Export not available",
              description: "PDF export is not yet supported. Contact your administrator.",
              variant: "destructive",
            })
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:w-auto"
        >
          <FileText className="h-4 w-4 text-gray-500" />
          Export PDF
        </button>
      </div>

      <div className="rounded-xl border border-gray-200/80 bg-white p-1.5 shadow-sm sm:w-fit">
        <div className="grid grid-cols-3 gap-1">
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
            activeTab === "sales" ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          }`}
        >
          <TrendingUp className="h-4 w-4" /> <span className="hidden sm:inline">Sales & Pipeline</span><span className="sm:hidden">Sales</span>
        </button>
        <button
          onClick={() => setActiveTab("finance")}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
            activeTab === "finance" ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          }`}
        >
          <IndianRupee className="h-4 w-4" /> <span className="hidden sm:inline">Financials</span><span className="sm:hidden">Finance</span>
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
            activeTab === "inventory" ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          }`}
        >
          <Package className="h-4 w-4" /> <span className="hidden sm:inline">Inventory</span><span className="sm:hidden">Stock</span>
        </button>
        </div>
      </div>

      {activeTab !== "inventory" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Date range</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="From date"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="To date"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(""); setToDate(""); }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "sales" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total leads" value={leadsReport?.totalLeads || 0} helper="Current lead volume" icon={Users} iconClass="text-blue-600" iconBackground="bg-blue-50" />
            <MetricCard label="Orders won" value={salesReport?.totalOrders || 0} helper="Successfully converted" icon={CheckCircle2} iconClass="text-emerald-600" iconBackground="bg-emerald-50" valueClass="text-emerald-700" />
            <MetricCard label="Conversion rate" value={`${Math.round(salesReport?.conversionRate || 0)}%`} helper="Lead-to-order efficiency" icon={TrendingUp} iconClass="text-indigo-600" iconBackground="bg-indigo-50" valueClass="text-indigo-700" />
            <MetricCard label="Sales revenue" value={`₹${((salesReport?.totalRevenue || 0) / 100000).toFixed(1)}L`} helper="Revenue from converted orders" icon={IndianRupee} iconClass="text-amber-600" iconBackground="bg-amber-50" valueClass="text-amber-700" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartPanel title="Leads by stage" description="Distribution of leads across the sales pipeline">
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsReport?.byStage || []} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="stage" tickFormatter={(v) => v.replace(/_/g, ' ')} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [val, "Leads"]} contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 }} />
                    <Bar dataKey="count" name="Leads" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={46} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>

            <ChartPanel title="Sales rep performance" description="Orders converted by each sales representative">
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesReport?.bySalesPerson || []} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="salesPersonName" type="category" width={85} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [val, "Orders won"]} contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 }} />
                    <Bar dataKey="ordersConverted" name="Orders won" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          </div>
        </div>
      )}

      {activeTab === "finance" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard label="Total collected" value={`₹${(financeReport?.totalCollected || 0).toLocaleString()}`} helper="Payments received" icon={WalletCards} iconClass="text-emerald-600" iconBackground="bg-emerald-50" valueClass="text-emerald-700" />
            <MetricCard label="Total pending" value={`₹${(financeReport?.totalPending || 0).toLocaleString()}`} helper="Outstanding balance" icon={RefreshCw} iconClass="text-amber-600" iconBackground="bg-amber-50" valueClass="text-amber-700" />
            <MetricCard label="Total overdue" value={`₹${(financeReport?.totalOverdue || 0).toLocaleString()}`} helper="Requires follow-up" icon={AlertTriangle} iconClass="text-red-600" iconBackground="bg-red-50" valueClass="text-red-700" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartPanel title="Collection trend" description="Daily payments received" className="lg:col-span-2">
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financeReport?.daily || []} margin={{ top: 8, right: 8, left: 2, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Collected']} contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 }} />
                    <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>

            <ChartPanel title="Payment modes" description="Collected amount by payment method">
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={financeReport?.byPaymentMode || []}
                      cx="50%"
                      cy="50%"
                       innerRadius={54}
                       outerRadius={78}
                       paddingAngle={4}
                      dataKey="amount"
                      nameKey="mode"
                    >
                      {(financeReport?.byPaymentMode || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                     <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 }} />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          </div>
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard label="Total items" value={inventoryReport?.totalItems || 0} helper="Items currently tracked" icon={Boxes} iconClass="text-blue-600" iconBackground="bg-blue-50" />
            <MetricCard label="Total value" value={`₹${((inventoryReport?.totalValue || 0) / 100000).toFixed(1)}L`} helper="Current inventory valuation" icon={Package} iconClass="text-indigo-600" iconBackground="bg-indigo-50" valueClass="text-indigo-700" />
            <MetricCard label="Low stock alerts" value={inventoryReport?.lowStockCount || 0} helper="Items below minimum level" icon={AlertTriangle} iconClass="text-red-600" iconBackground="bg-red-50" valueClass="text-red-700" />
          </div>

          <ChartPanel title="Inventory value by category" description="Compare category value and item count across the warehouse">
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryReport?.byCategory || []} margin={{ top: 8, right: 8, left: 2, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `₹${v/1000}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="value" name="Value (₹)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar yAxisId="right" dataKey="count" name="Item count" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>
        </div>
      )}
    </div>
  );
}
