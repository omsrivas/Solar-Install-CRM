import { useState } from "react";
import { useListServiceCalls, useGetServiceSummary } from "@workspace/api-client-react";
import { Search, Filter, AlertCircle, CheckCircle2, Clock, Wrench, Phone, MapPin, Plus } from "lucide-react";
import { format } from "date-fns";

export function Service() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  const { data: summary } = useGetServiceSummary();
  const { data: calls, isLoading } = useListServiceCalls({
    search: search || undefined,
    status: statusFilter || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Service & Maintenance</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer complaints and service requests</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm shadow-sm">
          <Plus className="h-4 w-4" />
          Log Complaint
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Urgent</span>
          </div>
          <p className="text-3xl font-bold text-red-600 mt-2">{summary?.urgent || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-amber-500">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Open</span>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-2">{summary?.open || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Resolved</span>
          </div>
          <p className="text-3xl font-bold text-green-600 mt-2">{summary?.closed || 0}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Service Tickets</h2>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
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
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-gray-50/30">
                <th className="px-6 py-4 font-semibold">Ticket ID / Customer</th>
                <th className="px-6 py-4 font-semibold">Issue Description</th>
                <th className="px-6 py-4 font-semibold">Priority</th>
                <th className="px-6 py-4 font-semibold">Status / Schedule</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 animate-pulse">Loading service tickets...</td>
                </tr>
              ) : calls?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No tickets found matching criteria.</td>
                </tr>
              ) : (
                calls?.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-primary mb-1">SRV-{call.id.toString().padStart(4, '0')}</div>
                      <div className="font-semibold text-gray-900">{call.customerName}</div>
                      <div className="text-gray-500 flex flex-col gap-0.5 mt-1 text-xs">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {call.customerPhone}</span>
                        {call.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> <span className="truncate w-40">{call.address}</span></span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <p className="line-clamp-2">{call.issueDescription}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                        call.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        call.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        call.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {call.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex self-start items-center px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wider ${
                          call.status === 'open' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                          call.status === 'in_progress' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                          'border-green-200 text-green-700 bg-green-50'
                        }`}>
                          {call.status.replace('_', ' ')}
                        </span>
                        {call.scheduledDate && call.status !== 'closed' && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(call.scheduledDate), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-medium text-gray-500 hover:text-gray-900 underline decoration-gray-300 underline-offset-4">
                        Update
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
