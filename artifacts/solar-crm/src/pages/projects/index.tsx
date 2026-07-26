import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useListProjects, useGetProjectsSummary } from "@workspace/api-client-react";
import {
  Search, Filter, Phone, MapPin, ChevronRight, Zap,
  Briefcase, CheckCircle2, Wrench, Package,
} from "lucide-react";
import { EmptyTableState, PaginationBar, TableSkeleton } from "@/components/table-state";

const PROJECT_STAGES = [
  { id: "order_punched",     label: "Order Punched",    color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60" },
  { id: "pmsgy_registered",  label: "PMSGY Registered", color: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60" },
  { id: "discom_change",     label: "Discom Change",    color: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/60" },
  { id: "net_metering",      label: "Net Metering",     color: "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60" },
  { id: "material_supplied", label: "Material Supplied",color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60" },
  { id: "ic_done",           label: "I&C Done",         color: "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60" },
  { id: "quality_check",     label: "Quality Check",    color: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60" },
  { id: "meter_configured",  label: "Meter Configured", color: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60" },
  { id: "subsidy_submitted", label: "Subsidy Submitted",color: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60" },
  { id: "handover_done",     label: "Handover Done",    color: "bg-purple-50 text-purple-700 ring-1 ring-purple-200/60" },
  { id: "completed",         label: "Completed",        color: "bg-green-50 text-green-700 ring-1 ring-green-200/60" },
];

const STAGE_IDX = Object.fromEntries(PROJECT_STAGES.map((s, i) => [s.id, i]));

const SUMMARY_STATS = [
  { label: "Total Projects",     key: "total",             color: "text-gray-900",    icon: Briefcase, bg: "bg-gray-100" },
  { label: "Completed",          key: "completed",         color: "text-emerald-600", icon: CheckCircle2, bg: "bg-emerald-50" },
  { label: "I&C Done",           key: "ic_done",           color: "text-orange-600",  icon: Wrench,    bg: "bg-orange-50" },
  { label: "Material Supplied",  key: "material_supplied", color: "text-amber-600",   icon: Package,   bg: "bg-amber-50" },
] as const;

export function Projects() {
  const [search, setSearch]           = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [page, setPage]               = useState(1);
  const pageSize = 8;

  const { data: summary }   = useGetProjectsSummary();
  const { data: projects, isLoading } = useListProjects({
    search: search || undefined,
    stage:  stageFilter || undefined,
  });

  const pageCount      = Math.max(1, Math.ceil((projects?.length ?? 0) / pageSize));
  const visibleProjects = projects?.slice((page - 1) * pageSize, page * pageSize) ?? [];

  useEffect(() => { setPage(1); }, [search, stageFilter]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const statValues: Record<string, number> = {
    total:             summary?.total ?? 0,
    completed:         summary?.completed ?? 0,
    ic_done:           summary?.byStage.find(s => s.stage === "ic_done")?.count ?? 0,
    material_supplied: summary?.byStage.find(s => s.stage === "material_supplied")?.count ?? 0,
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="font-heading text-[1.6rem] font-bold tracking-tight text-gray-900">
          Project Execution
        </h1>
        <p className="mt-1 text-sm text-gray-500">Track solar installation progress</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {SUMMARY_STATS.map(({ label, key, color, icon: Icon, bg }) => (
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
              aria-label="Search projects"
              placeholder="Search customer, phone, or city…"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Stage filter */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Filter className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <select
              aria-label="Filter projects by stage"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              {PROJECT_STAGES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
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

        {/* ── Desktop table ─────────────────────────────────────────────────── */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-5 py-3">Project / Client</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Capacity / Value</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Engineer</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <TableSkeleton columns={6} />
              ) : projects?.length === 0 ? (
                <EmptyTableState
                  colSpan={6}
                  title="No projects found"
                  description={
                    search || stageFilter
                      ? "Try clearing a filter or searching for a different customer."
                      : "Projects created from won leads will appear here."
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
                visibleProjects.map((project) => {
                  const stageInfo = PROJECT_STAGES.find(s => s.id === project.stage) ?? PROJECT_STAGES[0];
                  const progress  = ((STAGE_IDX[project.stage] ?? 0) + 1) / PROJECT_STAGES.length * 100;

                  return (
                    <tr key={project.id} className="group transition-colors hover:bg-blue-50/20">
                      {/* Client */}
                      <td className="px-5 py-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          PRJ-{project.id.toString().padStart(4, "0")}
                        </div>
                        <div className="mt-0.5 font-medium text-gray-900">{project.customerName}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          {project.customerPhone}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4">
                        <div className="flex max-w-[180px] items-start gap-1 text-sm text-gray-600">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                          <span className="line-clamp-2">{project.address}, {project.city}</span>
                        </div>
                      </td>

                      {/* Capacity / Value */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <Zap className="h-3.5 w-3.5 text-amber-500" />
                          {project.systemCapacityKw ?? 0} kW
                        </div>
                        <div className="mt-0.5 text-xs text-gray-400">
                          ₹{Number(project.totalAmount ?? 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Stage + progress */}
                      <td className="px-5 py-4">
                        <div className="flex min-w-[148px] flex-col gap-2">
                          <span className={`inline-flex self-start rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${stageInfo.color}`}>
                            {stageInfo.label}
                          </span>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-gray-400">
                            {Math.round(progress)}% complete
                          </span>
                        </div>
                      </td>

                      {/* Engineer */}
                      <td className="px-5 py-4">
                        {project.assignedEngineer ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold uppercase text-indigo-700">
                              {project.assignedEngineer.name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {project.assignedEngineer.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-300">Unassigned</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/projects/${project.id}`}
                          aria-label={`Manage project for ${project.customerName}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md group-hover:shadow-sm"
                        >
                          Manage
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile card list ──────────────────────────────────────────────── */}
        <div className="divide-y divide-gray-100 sm:hidden">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : projects?.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              {search || stageFilter ? "No projects match — try clearing filters." : "No projects yet."}
            </div>
          ) : (
            visibleProjects.map((project) => {
              const stageInfo = PROJECT_STAGES.find(s => s.id === project.stage) ?? PROJECT_STAGES[0];
              const progress  = ((STAGE_IDX[project.stage] ?? 0) + 1) / PROJECT_STAGES.length * 100;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-gray-50/80"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        PRJ-{project.id.toString().padStart(4, "0")}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${stageInfo.color}`}>
                        {stageInfo.label}
                      </span>
                    </div>
                    <p className="truncate font-medium text-gray-900">{project.customerName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        {project.systemCapacityKw ?? 0} kW
                      </span>
                      {project.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{project.city}
                        </span>
                      )}
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300" />
                </Link>
              );
            })
          )}
        </div>

        <PaginationBar
          page={page}
          pageCount={pageCount}
          total={projects?.length ?? 0}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
