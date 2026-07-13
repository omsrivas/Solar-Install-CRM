import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListLeads, useGetLeadsSummary } from "@workspace/api-client-react";
import { Search, Plus, Filter, Phone, MapPin, Calendar, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-gray-100 text-gray-700",
  tele_calling: "bg-blue-100 text-blue-700",
  site_visit: "bg-purple-100 text-purple-700",
  quotation_sent: "bg-amber-100 text-amber-700",
  negotiation: "bg-orange-100 text-orange-700",
  order_owned: "bg-green-100 text-green-700",
  allocated: "bg-emerald-100 text-emerald-700",
};

export function Leads() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [, setLocation] = useLocation();

  const { data: summary } = useGetLeadsSummary();
  const { data: leads, isLoading } = useListLeads({
    search: search || undefined,
    stage: stageFilter || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leads Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track potential customers</p>
        </div>
        <button 
          onClick={() => setLocation("/leads/new")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm"
          data-testid="button-new-lead"
        >
          <Plus className="h-4 w-4" />
          New Lead
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Total Leads</p>
          <p className="text-2xl font-bold mt-1">{summary?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Today's Follow-ups</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{summary?.todayFollowUps || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Overdue</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{summary?.overdueFollowUps || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">Conversion Rate</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            {summary?.total ? Math.round((summary.byStage.find(s => s.stage === 'order_owned')?.count || 0) / summary.total * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or city..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              className="w-full sm:w-auto border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              <option value="lead">New Lead</option>
              <option value="tele_calling">Tele Calling</option>
              <option value="site_visit">Site Visit</option>
              <option value="quotation_sent">Quotation Sent</option>
              <option value="negotiation">Negotiation</option>
              <option value="order_owned">Order Won</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-white">
                <th className="px-6 py-3 font-medium">Customer Details</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Stage</th>
                <th className="px-6 py-3 font-medium">Follow Up</th>
                <th className="px-6 py-3 font-medium">Assigned To</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    </div>
                  </td>
                </tr>
              ) : leads?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads?.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{lead.customerName}</div>
                      <div className="text-gray-500 flex items-center gap-1 mt-1 text-xs">
                        <Phone className="h-3 w-3" />
                        {lead.mobileNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {lead.city || "Not specified"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wider ${STAGE_COLORS[lead.stage] || "bg-gray-100 text-gray-700"}`}>
                        {lead.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lead.followUpDate ? (
                        <div className="flex flex-col">
                          <span className={`flex items-center gap-1 text-xs font-medium ${
                            new Date(lead.followUpDate) < new Date() && lead.followUpStatus !== 'completed' 
                              ? 'text-red-600' 
                              : 'text-gray-600'
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {format(new Date(lead.followUpDate), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-gray-400 capitalize flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {lead.followUpStatus.replace('_', ' ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {lead.assignedSalesPerson ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                            {lead.assignedSalesPerson.name.charAt(0)}
                          </div>
                          <span className="text-gray-700 text-sm">{lead.assignedSalesPerson.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/leads/${lead.id}`}
                        className="inline-flex items-center justify-center p-2 hover:bg-gray-100 rounded-md text-gray-400 hover:text-primary transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Link>
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
