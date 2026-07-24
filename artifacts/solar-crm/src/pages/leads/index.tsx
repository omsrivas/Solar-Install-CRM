import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListLeads, useGetLeadsSummary } from "@workspace/api-client-react";
import { Search, Plus, Filter, Phone, MapPin, Calendar, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { EmptyTableState, PaginationBar, TableSkeleton } from "@/components/table-state";

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-gray-100 text-gray-600",
  tele_calling: "bg-blue-50 text-blue-700",
  site_visit: "bg-purple-50 text-purple-700",
  quotation_sent: "bg-amber-50 text-amber-700",
  negotiation: "bg-orange-50 text-orange-700",
  order_owned: "bg-green-50 text-green-700",
  allocated: "bg-emerald-50 text-emerald-700",
};

export function Leads() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();
  const pageSize = 8;

  const { data: summary } = useGetLeadsSummary();
  const { data: leads, isLoading } = useListLeads({
    search: search || undefined,
    stage: stageFilter || undefined,
  });
  const pageCount = Math.max(1, Math.ceil((leads?.length ?? 0) / pageSize));
  const visibleLeads = leads?.slice((page - 1) * pageSize, page * pageSize) ?? [];

  useEffect(() => {
    setPage(1);
  }, [search, stageFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Leads Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and track potential customers</p>
        </div>
        <button
          onClick={() => setLocation("/leads/new")}
          className="inline-flex items-center justify-center gap-2 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 rounded-md transition-colors text-sm shadow-sm"
          data-testid="button-new-lead"
        >
          <Plus className="h-4 w-4" />
          New Lead
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: summary?.total ?? 0, color: "text-gray-900" },
          { label: "Today's Follow-ups", value: summary?.todayFollowUps ?? 0, color: "text-amber-600" },
          { label: "Overdue", value: summary?.overdueFollowUps ?? 0, color: "text-red-600" },
          {
            label: "Conversion Rate",
            value: `${summary?.total ? Math.round(((summary.byStage.find(s => s.stage === 'order_owned')?.count ?? 0) / summary.total) * 100) : 0}%`,
            color: "text-green-600",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              aria-label="Search leads"
              placeholder="Search name, phone, or city…"
              className="h-10 w-full rounded-md border border-input bg-white pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              aria-label="Filter leads by stage"
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-auto"
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
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-muted-foreground bg-white">
                <th className="px-6 py-3 font-semibold">Customer</th>
                <th className="px-6 py-3 font-semibold">Location</th>
                <th className="px-6 py-3 font-semibold">Stage</th>
                <th className="px-6 py-3 font-semibold">Follow Up</th>
                <th className="px-6 py-3 font-semibold">Assigned To</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <TableSkeleton columns={6} />
              ) : leads?.length === 0 ? (
                <EmptyTableState
                  colSpan={6}
                  title="No leads found"
                  description={search || stageFilter ? "Try clearing a filter or searching for a different customer." : "New leads will appear here as they enter your pipeline."}
                  action={search || stageFilter ? (
                    <button
                      type="button"
                      onClick={() => { setSearch(""); setStageFilter(""); }}
                      className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      Clear filters
                    </button>
                  ) : undefined}
                />
              ) : (
                visibleLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{lead.customerName}</div>
                      <div className="text-muted-foreground flex items-center gap-1 mt-0.5 text-xs">
                        <Phone className="h-3 w-3" />
                        {lead.mobileNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {lead.city || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${STAGE_COLORS[lead.stage] ?? "bg-gray-100 text-gray-600"}`}>
                        {lead.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lead.followUpDate ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={`flex items-center gap-1 text-xs font-medium ${
                            new Date(lead.followUpDate) < new Date() && lead.followUpStatus !== 'completed'
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {format(new Date(lead.followUpDate), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lead.followUpStatus.replace('_', ' ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {lead.assignedSalesPerson ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                            {lead.assignedSalesPerson.name.charAt(0)}
                          </div>
                          <span className="text-gray-700 text-sm">{lead.assignedSalesPerson.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/leads/${lead.id}`}
                        aria-label={`View ${lead.customerName}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={page}
          pageCount={pageCount}
          total={leads?.length ?? 0}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
