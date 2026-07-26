import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetMe, getGetMeQueryKey,
  useListProjects, useListServiceCalls,
} from "@workspace/api-client-react";
import {
  Users, CalendarClock, Briefcase, IndianRupee,
  AlertTriangle, PackageX, CheckCircle2, Wallet,
  ArrowUpRight, Wrench, Bell, Clock, MapPin,
  Activity, Zap,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  title,
  value,
  icon: Icon,
  colorClass,
  bgClass,
  link,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  link: string;
}) {
  return (
    <Link
      href={link}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
      data-testid={`card-kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
        <ArrowUpRight
          className={`h-4 w-4 transition-all duration-200 ${colorClass} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5`}
        />
      </div>

      {/* Value + label */}
      <div>
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-gray-900">
          {value}
        </p>
      </div>

      {/* Accent bar */}
      <span
        className={`absolute bottom-0 left-0 h-[3px] w-0 rounded-full transition-all duration-300 ease-out group-hover:w-full ${bgClass.replace("/10", "").replace("/15", "")}`}
      />
    </Link>
  );
}

// ─── Section Card shell ────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Engineer Dashboard ────────────────────────────────────────────────────────

function EngineerDashboard({ userId }: { userId: number }) {
  const { data: myProjects, isLoading: loadingProjects } = useListProjects({ assignedEngineerId: userId });
  const { data: myCalls, isLoading: loadingCalls } = useListServiceCalls({ assignedEngineerId: userId });

  const activeProjects = myProjects?.filter((p) => p.stage !== "completed") ?? [];
  const openCalls = myCalls?.filter((c) => c.status !== "closed") ?? [];
  const completedProjects = myProjects?.filter((p) => p.stage === "completed").length ?? 0;
  const urgentCalls = myCalls?.filter((c) => c.priority === "urgent" && c.status !== "closed").length ?? 0;

  const stats = [
    { label: "Active Projects", value: activeProjects.length, colorClass: "text-indigo-600", bgClass: "bg-indigo-50", icon: Briefcase },
    { label: "Open Service Calls", value: openCalls.length, colorClass: "text-orange-600", bgClass: "bg-orange-50", icon: Wrench },
    { label: "Completed Projects", value: completedProjects, colorClass: "text-emerald-600", bgClass: "bg-emerald-50", icon: CheckCircle2 },
    { label: "Urgent Calls", value: urgentCalls, colorClass: "text-rose-600", bgClass: "bg-rose-50", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="font-heading text-[1.6rem] font-bold tracking-tight text-gray-900">
          My Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">Your active assignments at a glance</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, colorClass, bgClass, icon: StatIcon }) => (
          <div
            key={label}
            className="flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bgClass}`}>
              <StatIcon className={`h-4 w-4 ${colorClass}`} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
              <p className={`mt-0.5 font-heading text-2xl font-bold tracking-tight ${colorClass}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My Projects */}
        <SectionCard
          title="My Active Projects"
          icon={Briefcase}
          action={
            <Link href="/projects" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
            {loadingProjects ? (
              <p className="p-5 text-center text-sm text-gray-400 animate-pulse">Loading…</p>
            ) : activeProjects.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">No active projects assigned to you.</p>
            ) : (
              activeProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50/80"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 uppercase">
                    {project.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{project.customerName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {project.city ?? "—"}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                    {project.stage?.replace(/_/g, " ")}
                  </span>
                </Link>
              ))
            )}
          </div>
        </SectionCard>

        {/* My Service Calls */}
        <SectionCard
          title="My Open Service Calls"
          icon={Wrench}
          action={
            <Link href="/service" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
            {loadingCalls ? (
              <p className="p-5 text-center text-sm text-gray-400 animate-pulse">Loading…</p>
            ) : openCalls.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">No open service calls assigned to you.</p>
            ) : (
              openCalls.map((call) => (
                <div key={call.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                      call.priority === "urgent"
                        ? "bg-rose-500"
                        : call.priority === "high"
                        ? "bg-orange-500"
                        : call.priority === "medium"
                        ? "bg-amber-400"
                        : "bg-gray-300"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      SRV-{call.id.toString().padStart(4, "0")}
                      <span className="ml-1.5 font-normal text-gray-500">· {call.customerName}</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{call.issueDescription}</p>
                    {call.scheduledDate && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        {format(new Date(call.scheduledDate), "MMM d")}
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      call.status === "pending_complaint"
                        ? "bg-orange-100 text-orange-700"
                        : call.status === "in_progress"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {call.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Standard Dashboard ────────────────────────────────────────────────────────

type DashSummary = {
  totalLeads: number;
  todayFollowUps: number;
  ordersOwned: number;
  activeProjects: number;
  totalRevenue: number;
  pendingPayments: number;
  pendingComplaints: number;
  lowStockAlerts: number;
  overdueFollowUps?: number;
};

function StandardDashboard({ summary, role }: { summary: DashSummary; role: string }) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const overdueCount = (summary as { overdueFollowUps?: number }).overdueFollowUps ?? 0;
  const showLeads = ["admin", "sales"].includes(role);
  const showFinance = ["admin", "finance"].includes(role);
  const showInventory = ["admin", "warehouse"].includes(role);

  const quickActions = [
    ...(showLeads
      ? [{ href: "/leads/new", icon: Users, label: "Add Lead", colorClass: "text-primary", bgClass: "bg-primary/10" }]
      : []),
    { href: "/projects", icon: Briefcase, label: "Projects", colorClass: "text-indigo-600", bgClass: "bg-indigo-100" },
    ...(showFinance
      ? [{ href: "/finance", icon: IndianRupee, label: "Finance", colorClass: "text-emerald-600", bgClass: "bg-emerald-100" }]
      : []),
    { href: "/service", icon: Wrench, label: "Service", colorClass: "text-rose-600", bgClass: "bg-rose-100" },
  ];

  return (
    <div className="space-y-7">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[1.6rem] font-bold tracking-tight text-gray-900">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-gray-500">Real-time control centre metrics</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-mono text-gray-400 shadow-sm">
          <Activity className="h-3 w-3" />
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && showLeads && (
        <div className="flex items-center gap-3.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3.5 backdrop-blur-sm">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Bell className="h-4 w-4 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {overdueCount} lead{overdueCount !== 1 ? "s" : ""} overdue for follow-up
            </p>
            <p className="mt-0.5 text-xs text-amber-600">
              Weekly reminders are logged automatically every Monday. Review and reschedule these leads.
            </p>
          </div>
          <Link
            href="/leads"
            className="flex-shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50"
          >
            View Leads
          </Link>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showLeads && (
          <>
            <KPICard
              title="Total Active Leads"
              value={summary.totalLeads}
              icon={Users}
              colorClass="text-blue-600"
              bgClass="bg-blue-100"
              link="/leads"
            />
            <KPICard
              title="Today's Follow-ups"
              value={summary.todayFollowUps}
              icon={CalendarClock}
              colorClass="text-amber-600"
              bgClass="bg-amber-100"
              link="/leads"
            />
            <KPICard
              title="Orders Won (This Month)"
              value={summary.ordersOwned}
              icon={CheckCircle2}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-100"
              link="/projects"
            />
          </>
        )}
        <KPICard
          title="Active Projects"
          value={summary.activeProjects}
          icon={Briefcase}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-100"
          link="/projects"
        />
        {showFinance && (
          <>
            <KPICard
              title="Revenue (This Month)"
              value={formatCurrency(summary.totalRevenue)}
              icon={IndianRupee}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-100"
              link="/finance"
            />
            <KPICard
              title="Pending Payments"
              value={summary.pendingPayments}
              icon={Wallet}
              colorClass="text-rose-600"
              bgClass="bg-rose-100"
              link="/finance"
            />
          </>
        )}
        <KPICard
          title="Open Service Calls"
          value={summary.pendingComplaints}
          icon={AlertTriangle}
          colorClass="text-orange-600"
          bgClass="bg-orange-100"
          link="/service"
        />
        {showInventory && (
          <KPICard
            title="Low Stock Alerts"
            value={summary.lowStockAlerts}
            icon={PackageX}
            colorClass="text-red-600"
            bgClass="bg-red-100"
            link="/inventory"
          />
        )}
      </div>

      {/* Lower panels */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Quick Actions — spans 2 cols */}
        <div className="lg:col-span-2">
          <SectionCard title="Quick Actions" icon={Zap}>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              {quickActions.map(({ href, icon: QIcon, label, colorClass, bgClass }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col items-center justify-center gap-2.5 rounded-xl border border-gray-100 p-4 text-center transition-all duration-200 hover:border-gray-200 hover:bg-gray-50/80 hover:shadow-sm"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${bgClass}`}
                  >
                    <QIcon className={`h-5 w-5 ${colorClass}`} />
                  </div>
                  <span className="text-[13px] font-medium text-gray-700">{label}</span>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* System Status */}
        <SectionCard
          title="System Status"
          icon={Activity}
          action={
            role === "admin" ? (
              <Link href="/system" className="text-xs font-medium text-primary hover:underline">
                View All
              </Link>
            ) : undefined
          }
        >
          <div className="flex flex-1 flex-col justify-center gap-6 p-5">
            {/* Operational indicator */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-3 w-3 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">All systems operational</p>
                <p className="text-xs text-gray-500">Database &amp; API connected</p>
              </div>
            </div>

            {/* Storage bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Storage Capacity</span>
                <span className="font-mono text-xs font-semibold text-gray-700">45%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: "45%" }}
                />
              </div>
              <p className="text-[10px] text-gray-400">27 GB of 60 GB used</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-7 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-lg bg-gray-200" />
        <div className="h-4 w-40 rounded-lg bg-gray-100" />
      </div>
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-gray-200"
            style={{ opacity: 1 - i * 0.07 }}
          />
        ))}
      </div>
      {/* Lower panels skeleton */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="h-48 rounded-xl bg-gray-200 lg:col-span-2" />
        <div className="h-48 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

// ─── Root Dashboard ────────────────────────────────────────────────────────────

export function Dashboard() {
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  if (isLoading || !summary || !user) {
    return <DashboardSkeleton />;
  }

  if (user.role === "engineer") {
    return <EngineerDashboard userId={user.id} />;
  }

  return <StandardDashboard summary={summary} role={user.role} />;
}
