import { useState } from "react";
import { Link } from "wouter";
import { useListPayments, useGetPaymentsSummary } from "@workspace/api-client-react";
import { format } from "date-fns";
import { IndianRupee, ArrowUpRight, ArrowDownRight, Clock, Plus, Filter, Search, Receipt } from "lucide-react";

export function Finance() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  
  const { data: summary } = useGetPaymentsSummary();
  const { data: payments, isLoading } = useListPayments({
    status: statusFilter || undefined,
  });

  // Filter payments locally if search is active since API might not support full text search on payments
  const filteredPayments = payments?.filter(p => 
    !search || 
    p.project?.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    p.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.amount.toString().includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial Control</h1>
          <p className="text-sm text-gray-500 mt-1">Track collections and outstanding payments</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Collected</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">₹{(summary?.totalCollected || 0).toLocaleString()}</h2>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
              <ArrowDownRight className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm relative z-10">
            <span className="text-gray-500">This Month</span>
            <span className="font-semibold text-emerald-600">+₹{(summary?.monthlyCollected || 0).toLocaleString()}</span>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Pending</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">₹{(summary?.totalPending || 0).toLocaleString()}</h2>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm relative z-10">
            <span className="text-gray-500">Advance Expected</span>
            <span className="font-semibold text-gray-900">₹{(summary?.advanceReceived || 0).toLocaleString()}</span>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Overdue</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">₹{(summary?.totalOverdue || 0).toLocaleString()}</h2>
            </div>
            <div className="p-3 bg-red-100 rounded-lg text-red-600">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm relative z-10">
            <span className="text-gray-500">Immediate Action Required</span>
            <span className="font-semibold text-red-600">Urgent</span>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Transaction Register</h2>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="received">Received</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-gray-50/30">
                <th className="px-6 py-4 font-semibold">Transaction Details</th>
                <th className="px-6 py-4 font-semibold">Project / Client</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 animate-pulse">Loading financial records...</td>
                </tr>
              ) : filteredPayments?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions found matching criteria.</td>
                </tr>
              ) : (
                filteredPayments?.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 capitalize">{payment.type.replace('_', ' ')}</div>
                      <div className="text-gray-500 font-mono text-xs mt-1">
                        {payment.referenceNumber || 'No Ref'} • {payment.paymentMode || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/projects/${payment.projectId}`} className="font-medium text-primary hover:underline">
                        PRJ-{payment.projectId.toString().padStart(4, '0')}
                      </Link>
                      <div className="text-gray-600 mt-0.5 text-xs">
                        {payment.project?.customerName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 text-base">₹{Number(payment.amount).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        payment.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-medium text-gray-500 hover:text-gray-900 underline decoration-gray-300 underline-offset-4">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
