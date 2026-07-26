import { useState } from "react";
import { useListActivities } from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Briefcase,
  CalendarDays,
  FileText,
  Filter,
  IndianRupee,
  Package,
  Users,
  User,
  Zap,
} from "lucide-react";

const ENTITY_META: Record<string, {
  label: string;
  icon: React.ElementType;
  iconClass: string;
  iconBackground: string;
}> = {
  user: {
    label: "Users",
    icon: User,
    iconClass: "text-blue-600",
    iconBackground: "bg-blue-50",
  },
  lead: {
    label: "Leads",
    icon: Users,
    iconClass: "text-indigo-600",
    iconBackground: "bg-indigo-50",
  },
  project: {
    label: "Projects",
    icon: Briefcase,
    iconClass: "text-purple-600",
    iconBackground: "bg-purple-50",
  },
  payment: {
    label: "Payments",
    icon: IndianRupee,
    iconClass: "text-emerald-600",
    iconBackground: "bg-emerald-50",
  },
  inventory: {
    label: "Inventory",
    icon: Package,
    iconClass: "text-amber-600",
    iconBackground: "bg-amber-50",
  },
  service: {
    label: "Service",
    icon: AlertTriangle,
    iconClass: "text-red-600",
    iconBackground: "bg-red-50",
  },
  document: {
    label: "Documents",
    icon: FileText,
    iconClass: "text-cyan-600",
    iconBackground: "bg-cyan-50",
  },
};

function getEntityMeta(type: string) {
  return ENTITY_META[type] ?? {
    label: type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    icon: Zap,
    iconClass: "text-slate-600",
    iconBackground: "bg-slate-100",
  };
}

export function Activities() {
  const [entityFilter, setEntityFilter] = useState<string>("");
  
  const { data: activities, isLoading } = useListActivities({
    entityType: entityFilter || undefined,
    limit: 50
  });

  const hasFilter = Boolean(entityFilter);
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <ActivityIcon className="h-3.5 w-3.5" />
            Activity / Audit trail
          </div>
          <h1 className="font-heading text-[1.7rem] font-bold tracking-tight text-gray-950">Activity stream</h1>
          <p className="mt-1 text-sm text-gray-500">A chronological view of changes happening across the CRM.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-48">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <select
              aria-label="Filter activity by module"
              className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All modules</option>
              <option value="lead">Leads</option>
              <option value="project">Projects</option>
              <option value="payment">Payments</option>
              <option value="inventory">Inventory</option>
              <option value="service">Service</option>
              <option value="user">Users</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌄</span>
          </div>
          <button
            type="button"
            disabled={!hasFilter}
            onClick={() => setEntityFilter("")}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ActivityIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-base font-bold text-gray-950">Recent activity</h2>
                <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {activities?.length ?? 0} events
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {hasFilter ? `Showing ${getEntityMeta(entityFilter).label.toLowerCase()} activity` : "Latest system-wide events"}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-400">Most recent first</span>
        </div>

        <div className="relative p-4 sm:p-6">
        {isLoading ? (
          <div className="relative space-y-5 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-gray-200 sm:space-y-6 sm:before:left-6">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="relative flex gap-4 pl-1 sm:gap-5">
                <div className="z-10 h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200 ring-4 ring-white sm:h-11 sm:w-11" />
                <div className="h-28 min-w-0 flex-1 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : activities?.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ActivityIcon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No activity found</p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {hasFilter ? "Try clearing the module filter to see more activity." : "System activity will appear here as your team works in the CRM."}
            </p>
            {hasFilter && (
              <button type="button" onClick={() => setEntityFilter("")} className="mt-4 text-sm font-semibold text-primary hover:underline">
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="relative space-y-5 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-gray-200 sm:space-y-6 sm:before:left-6">
            {activities?.map((activity, index) => {
              const meta = getEntityMeta(activity.entityType);
              const Icon = meta.icon;
              return (
                <div key={activity.id} className="group relative flex gap-4 pl-1 sm:gap-5">
                  <div className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white sm:h-11 sm:w-11 ${meta.iconBackground} ${index === 0 ? "ring-primary/10" : ""}`}>
                    <Icon className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${meta.iconClass}`} />
                  </div>

                  <div className="min-w-0 flex-1 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all group-hover:border-primary/25 group-hover:shadow-md sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${meta.iconBackground} ${meta.iconClass}`}>
                          {meta.label}
                        </span>
                        {index === 0 && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
                            Latest
                          </span>
                        )}
                      </div>
                      <time className="flex shrink-0 items-center gap-1.5 text-xs text-gray-400" dateTime={new Date(activity.createdAt).toISOString()}>
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(new Date(activity.createdAt), "MMM d, yyyy · HH:mm")}
                      </time>
                    </div>

                    <p className="mt-3 font-heading text-base font-bold capitalize leading-5 text-gray-950">
                      {activity.action.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-gray-600">
                      {activity.description || "No additional details were provided for this activity."}
                    </p>

                    <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                        {activity.performedBy?.name?.charAt(0) || "?"}
                      </div>
                      <span>Performed by</span>
                      <span className="font-semibold text-gray-700">{activity.performedBy?.name || "System User"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
