import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListLeads, useGetLeadsSummary } from "@workspace/api-client-react";
import {
  Search, Plus, Filter, Phone, MapPin, Calendar, Clock,
  ChevronRight, Users, CalendarClock, AlertCircle, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { EmptyTableState, PaginationBar, TableSkeleton } from "@/components/table-state";

const STAGE_COLORS: Record<string, string> = {
  lead:             "bg-gray-100 text-gray-600",
  tele_calling:     "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60",
  site_visit:       "bg-purple-50 text-purple-700 ring-1 ring-purple-200/60",
  quotation_sent:   "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  negotiation:      "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60",
  order_owned:      "bg-green-50 text-green-700 ring-1 ring-green-200/60",
  allocated:        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
};

const SUMMARY_STATS = [
  { key: "total",           label: "Total Leads",       color: "text-gray-900",    icon: Users,         bg: "bg-gray-100" },
  { key: "todayFollowUps",  label: "Today's Follow-ups", color: "text-amber-600",  icon: CalendarClock, bg: "bg-amber-50" },
  { key: "overdueFollowUps",label: "Overdue",            color: "text-rose-600",   icon: AlertCircle,   bg: "bg-rose-50" },
  { key: "conversion",      label: "Conversion Rate",   color: "text-emerald-600", icon: TrendingUp,    bg: "bg-emerald-50" },
] as const;

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

  useEffect(() => { setPage(1); }, [search, stageFilter]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const conversionRate = summary?.total
    ? Math.round(((summary.byStage.find(s => s.stage === "order_owned")?.count ?? 0) / summary.total) * 100)
    : 0;

  const statValues: Record<string, string | number> = {
    total:           summary?.total ?? 0,
    todayFollowUps:  summary?.todayFollowUps ?? 0,
    overdueFollowUps:summary?.overdueFollowUps ?? 0,
    conversion:      `${conversionRate}%`,
  };

  return (
    <div className="space-y-7">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[1.6rem] font-bold tracking-tight text-gray-900">
            Leads Pipeline
          </h1>
          <p className="mt-1 text-sm text-gray-500">Manage and track potential customers</p>
        </div>
        <button
          onClick={() => setLocation("/leads/new")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
          data-testid="button-new-lead"
        >
          <Plus className="h-4 w-4" />
          New Lead
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {SUMMARY_STATS.map(({ key, label, color, icon: Icon, bg }) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
              <p className={`mt-0.5 font-heading text-2xl font-bold tracking-tight ${color}`}>
                {statValues[key]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              aria-label="Search leads"
              placeholder="Search name, phone, or city…"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Stage filter */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Filter className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <select
              aria-label="Filter leads by stage"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
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
            {(search || stageFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setStageFilter(""); }}
                className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Desktop table ───────────────────────────────────────────────────── */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Follow Up</th>
                <th className="px-5 py-3">Assigned To</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <TableSkeleton columns={6} />
              ) : leads?.length === 0 ? (
                <EmptyTableState
                  colSpan={6}
                  title="No leads found"
                  description={
                    search || stageFilter
                      ? "Try clearing a filter or searching for a different customer."
                      : "New leads will appear here as they enter your pipeline."
                  }
                  action={
                    search || stageFilter ? (
                      <button
                        type="button"
                        onClick={() => { setSearch(""); setStageFilter(""); }}
                        className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        Clear filters
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                visibleLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="group transition-colors hover:bg-blue-50/20"
                  >
                    {/* Customer */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{lead.customerName}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        {lead.mobileNumber}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        {lead.city || <span className="text-gray-300">—</span>}
                      </div>
                    </td>

                    {/* Stage badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          STAGE_COLORS[lead.stage] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {lead.stage.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Follow-up */}
                    <td className="px-5 py-4">
                      {lead.followUpDate ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`flex items-center gap-1 text-xs font-medium ${
                              new Date(lead.followUpDate) < new Date() && lead.followUpStatus !== "completed"
                                ? "text-rose-600"
                                : "text-gray-700"
                            }`}
                          >
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            {format(new Date(lead.followUpDate), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1 text-xs capitalize text-gray-400">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {lead.followUpStatus.replace(/_/g, " ")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-300">Not scheduled</span>
                      )}
                    </td>

                    {/* Assigned */}
                    <td className="px-5 py-4">
                      {lead.assignedSalesPerson ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold uppercase text-primary">
                            {lead.assignedSalesPerson.name.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-700">{lead.assignedSalesPerson.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-300">Unassigned</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/leads/${lead.id}`}
                        aria-label={`View ${lead.customerName}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-primary/10 hover:text-primary group-hover:text-gray-500"
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

        {/* ── Mobile card list ─────────────────────────────────────────────────── */}
        <div className="divide-y divide-gray-100 sm:hidden">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : leads?.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              {search || stageFilter ? "No leads match — try clearing filters." : "No leads yet."}
            </div>
          ) : (
            visibleLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-gray-50/80"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900">{lead.customerName}</p>
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        STAGE_COLORS[lead.stage] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {lead.stage.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />{lead.mobileNumber}
                    </span>
                    {lead.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{lead.city}
                      </span>
                    )}
                    {lead.followUpDate && (
                      <span
                        className={`flex items-center gap-1 ${
                          new Date(lead.followUpDate) < new Date() && lead.followUpStatus !== "completed"
                            ? "text-rose-500"
                            : ""
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        {format(new Date(lead.followUpDate), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300" />
              </Link>
            ))
          )}
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
