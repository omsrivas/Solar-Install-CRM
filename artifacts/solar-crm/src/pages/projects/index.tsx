import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useListProjects, useGetProjectsSummary } from "@workspace/api-client-react";
import { Search, Filter, Phone, MapPin, ChevronRight, Zap } from "lucide-react";
import { EmptyTableState, PaginationBar, TableSkeleton } from "@/components/table-state";

const PROJECT_STAGES = [
  { id: "order_punched",     label: "Order Punched",      color: "bg-blue-50 text-blue-700" },
  { id: "pmsgy_registered",  label: "PMSGY Registered",   color: "bg-sky-50 text-sky-700" },
  { id: "discom_change",     label: "Discom Change",       color: "bg-cyan-50 text-cyan-700" },
  { id: "net_metering",      label: "Net Metering",        color: "bg-teal-50 text-teal-700" },
  { id: "material_supplied", label: "Material Supplied",   color: "bg-amber-50 text-amber-700" },
  { id: "ic_done",           label: "I&C Done",            color: "bg-orange-50 text-orange-700" },
  { id: "quality_check",     label: "Quality Check",       color: "bg-rose-50 text-rose-700" },
  { id: "meter_configured",  label: "Meter Configured",    color: "bg-violet-50 text-violet-700" },
  { id: "subsidy_submitted", label: "Subsidy Submitted",   color: "bg-indigo-50 text-indigo-700" },
  { id: "handover_done",     label: "Handover Done",       color: "bg-purple-50 text-purple-700" },
  { id: "completed",         label: "Completed",           color: "bg-green-50 text-green-700" },
];

export function Projects() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const { data: summary } = useGetProjectsSummary();
  const { data: projects, isLoading } = useListProjects({
    search: search || undefined,
    stage: stageFilter || undefined,
  });
  const pageCount = Math.max(1, Math.ceil((projects?.length ?? 0) / pageSize));
  const visibleProjects = projects?.slice((page - 1) * pageSize, page * pageSize) ?? [];

  useEffect(() => {
    setPage(1);
  }, [search, stageFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Project Execution</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track solar installation progress</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Projects", value: summary?.total ?? 0, color: "text-gray-900" },
          { label: "Completed", value: summary?.completed ?? 0, color: "text-green-600" },
          { label: "I&C Done", value: summary?.byStage.find(s => s.stage === "ic_done")?.count ?? 0, color: "text-orange-600" },
          { label: "Material Supplied", value: summary?.byStage.find(s => s.stage === "material_supplied")?.count ?? 0, color: "text-amber-600" },
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
              aria-label="Search projects"
              placeholder="Search customer, phone, or city…"
              className="h-10 w-full rounded-md border border-input bg-white pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              aria-label="Filter projects by stage"
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-auto"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              {PROJECT_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-muted-foreground bg-white">
                <th className="px-6 py-3 font-semibold">Project / Client</th>
                <th className="px-6 py-3 font-semibold">Location</th>
                <th className="px-6 py-3 font-semibold">Capacity / Value</th>
                <th className="px-6 py-3 font-semibold">Stage</th>
                <th className="px-6 py-3 font-semibold">Engineer</th>
                <th className="px-6 py-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <TableSkeleton columns={6} />
              ) : projects?.length === 0 ? (
                <EmptyTableState
                  colSpan={6}
                  title="No projects found"
                  description={search || stageFilter ? "Try clearing a filter or searching for a different customer." : "Projects created from won leads will appear here."}
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
                visibleProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-500 text-xs">PRJ-{project.id.toString().padStart(4, "0")}</div>
                      <div className="font-medium text-gray-900 mt-0.5">{project.customerName}</div>
                      <div className="text-muted-foreground flex items-center gap-1 mt-0.5 text-xs">
                        <Phone className="h-3 w-3" />
                        {project.customerPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-start gap-1 max-w-[180px]">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2 text-sm">{project.address}, {project.city}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-semibold text-gray-900">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        {project.systemCapacityKw ?? 0} kW
                      </div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        ₹{Number(project.totalAmount ?? 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const stageInfo = PROJECT_STAGES.find(s => s.id === project.stage) ?? PROJECT_STAGES[0];
                        const progress = ((PROJECT_STAGES.findIndex(s => s.id === project.stage) + 1) / PROJECT_STAGES.length) * 100;
                        return (
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <span className={`inline-flex items-center self-start px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${stageInfo.color}`}>
                              {stageInfo.label}
                            </span>
                            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {project.assignedEngineer ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                            {project.assignedEngineer.name.charAt(0)}
                          </div>
                          <span className="text-gray-700 text-sm font-medium">{project.assignedEngineer.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/projects/${project.id}`}
                        aria-label={`Manage project for ${project.customerName}`}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        Manage
                        <ChevronRight className="h-3.5 w-3.5" />
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
          total={projects?.length ?? 0}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
