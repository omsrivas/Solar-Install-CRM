import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListProjects, useGetProjectsSummary } from "@workspace/api-client-react";
import { Search, Filter, Phone, MapPin, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { format } from "date-fns";

const PROJECT_STAGES = [
  { id: "order_punched", label: "Order Punched", color: "bg-blue-100 text-blue-700" },
  { id: "survey_done", label: "Survey Done", color: "bg-indigo-100 text-indigo-700" },
  { id: "material_issued", label: "Material Issued", color: "bg-amber-100 text-amber-700" },
  { id: "installation_done", label: "Installation Done", color: "bg-orange-100 text-orange-700" },
  { id: "handover_done", label: "Handover Done", color: "bg-purple-100 text-purple-700" },
  { id: "completed", label: "Completed", color: "bg-green-100 text-green-700" },
];

export function Projects() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");

  const { data: summary } = useGetProjectsSummary();
  const { data: projects, isLoading } = useListProjects({
    search: search || undefined,
    stage: stageFilter || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Project Execution</h1>
          <p className="text-sm text-gray-500 mt-1">Track solar installation progress</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Total Projects</p>
          <p className="text-2xl font-bold mt-1">{summary?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Completed</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{summary?.completed || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Pending Handover</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">
            {summary?.byStage.find(s => s.stage === 'installation_done')?.count || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Material Issued</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">
            {summary?.byStage.find(s => s.stage === 'material_issued')?.count || 0}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, phone, or city..."
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
              <option value="">All Execution Stages</option>
              {PROJECT_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-white">
                <th className="px-6 py-3 font-medium">Project / Client</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Capacity / Value</th>
                <th className="px-6 py-3 font-medium">Execution Stage</th>
                <th className="px-6 py-3 font-medium">Engineer</th>
                <th className="px-6 py-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 animate-pulse">Loading projects...</td>
                </tr>
              ) : projects?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No projects found.</td>
                </tr>
              ) : (
                projects?.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">PRJ-{project.id.toString().padStart(4, '0')}</div>
                      <div className="font-medium text-gray-700 mt-1">{project.customerName}</div>
                      <div className="text-gray-500 flex items-center gap-1 mt-0.5 text-xs">
                        <Phone className="h-3 w-3" />
                        {project.customerPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-start gap-1 max-w-[200px]">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{project.address}, {project.city}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-medium text-gray-900">
                        <Zap className="h-4 w-4 text-amber-500" />
                        {project.systemCapacityKw || 0} kW
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        ₹{Number(project.totalAmount || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const stageInfo = PROJECT_STAGES.find(s => s.id === project.stage) || PROJECT_STAGES[0];
                        const progress = ((PROJECT_STAGES.findIndex(s => s.id === project.stage) + 1) / PROJECT_STAGES.length) * 100;
                        return (
                          <div className="flex flex-col gap-2 min-w-[150px]">
                            <span className={`inline-flex items-center self-start px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${stageInfo.color}`}>
                              {stageInfo.label}
                            </span>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {project.assignedEngineer ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                            {project.assignedEngineer.name.charAt(0)}
                          </div>
                          <span className="text-gray-700 text-sm font-medium">{project.assignedEngineer.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/projects/${project.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                      >
                        Manage
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
