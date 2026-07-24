import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetMe, getGetMeQueryKey,
  useListProjects, useListServiceCalls,
} from "@workspace/api-client-react";
import { 
  Users, CalendarClock, Briefcase, IndianRupee, 
  AlertTriangle, PackageX, CheckCircle2, Wallet,
  ArrowRight, Wrench, Bell, Clock, Phone, MapPin
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

function KPICard({ title, value, icon: Icon, colorClass, link }: { title: string, value: string | number, icon: React.ElementType, colorClass: string, link: string }) {
  return (
    <Link href={link} className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group flex flex-col gap-4 relative overflow-hidden" data-testid={`card-kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${colorClass.replace('bg-', 'text-').replace('text-opacity-10', '')}`} />
        </div>
        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-300 ${colorClass.replace('text-', 'bg-')}`} />
    </Link>
  );
}

// ─── Engineer Dashboard ────────────────────────────────────────────────────────

function EngineerDashboard({ userId }: { userId: number }) {
  const { data: myProjects, isLoading: loadingProjects } = useListProjects({ assignedEngineerId: userId });
  const { data: myCalls, isLoading: loadingCalls } = useListServiceCalls({ assignedEngineerId: userId });

  const activeProjects = myProjects?.filter(p => p.stage !== "completed") ?? [];
  const openCalls = myCalls?.filter(c => c.status !== "closed") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your active assignments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Active Projects</p>
          <p className="text-2xl font-bold mt-1 text-indigo-600">{activeProjects.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Open Service Calls</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{openCalls.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Completed Projects</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            {myProjects?.filter(p => p.stage === "completed").length ?? 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Urgent Calls</p>
          <p className="text-2xl font-bold mt-1 text-red-600">
            {myCalls?.filter(c => c.priority === "urgent" && c.status !== "closed").length ?? 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Projects */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gray-400" />
              My Active Projects
            </h2>
            <Link href="/projects" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {loadingProjects ? (
              <p className="p-4 text-sm text-center text-gray-400 animate-pulse">Loading...</p>
            ) : activeProjects.length === 0 ? (
              <p className="p-6 text-sm text-center text-gray-400">No active projects assigned to you.</p>
            ) : (
              activeProjects.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {project.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{project.customerName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />{project.city ?? "—"}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                      {project.stage?.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* My Service Calls */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gray-400" />
              My Open Service Calls
            </h2>
            <Link href="/service" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {loadingCalls ? (
              <p className="p-4 text-sm text-center text-gray-400 animate-pulse">Loading...</p>
            ) : openCalls.length === 0 ? (
              <p className="p-6 text-sm text-center text-gray-400">No open service calls assigned to you.</p>
            ) : (
              openCalls.map(call => (
                <div key={call.id} className="flex items-start gap-3 p-4">
                  <span className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    call.priority === "urgent" ? "bg-red-500" :
                    call.priority === "high" ? "bg-orange-500" :
                    call.priority === "medium" ? "bg-amber-400" : "bg-gray-300"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      SRV-{call.id.toString().padStart(4, "0")} · {call.customerName}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{call.issueDescription}</p>
                    {call.scheduledDate && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {format(new Date(call.scheduledDate), "MMM d")}
                      </p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    call.status === "pending_complaint" ? "bg-orange-100 text-orange-700" :
                    call.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {call.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
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

function StandardDashboard({ summary, role }: { summary: DashSummary, role: string }) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const overdueCount = (summary as { overdueFollowUps?: number }).overdueFollowUps ?? 0;
  const showLeads = ["admin", "sales"].includes(role);
  const showFinance = ["admin", "finance"].includes(role);
  const showInventory = ["admin", "warehouse"].includes(role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time control center metrics</p>
        </div>
        <div className="text-xs font-mono text-gray-400 bg-white px-3 py-1.5 rounded-md border border-gray-200">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Overdue follow-up reminder banner (admin + sales only) */}
      {overdueCount > 0 && showLeads && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Bell className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {overdueCount} lead{overdueCount !== 1 ? "s" : ""} overdue for follow-up
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Weekly reminders are logged automatically every Monday. Review and reschedule these leads.
            </p>
          </div>
          <Link href="/leads" className="text-xs font-bold text-amber-700 hover:underline flex-shrink-0">
            View Leads →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {showLeads && (
          <>
            <KPICard title="Total Active Leads" value={summary.totalLeads} icon={Users} colorClass="text-blue-600 bg-blue-100" link="/leads" />
            <KPICard title="Today's Follow-ups" value={summary.todayFollowUps} icon={CalendarClock} colorClass="text-amber-600 bg-amber-100" link="/leads" />
            <KPICard title="Orders Won (This Month)" value={summary.ordersOwned} icon={CheckCircle2} colorClass="text-green-600 bg-green-100" link="/projects" />
          </>
        )}
        <KPICard title="Active Projects" value={summary.activeProjects} icon={Briefcase} colorClass="text-indigo-600 bg-indigo-100" link="/projects" />
        {showFinance && (
          <>
            <KPICard title="Total Revenue (This Month)" value={formatCurrency(summary.totalRevenue)} icon={IndianRupee} colorClass="text-emerald-600 bg-emerald-100" link="/finance" />
            <KPICard title="Pending Payments" value={summary.pendingPayments} icon={Wallet} colorClass="text-rose-600 bg-rose-100" link="/finance" />
          </>
        )}
        <KPICard title="Open Service Calls" value={summary.pendingComplaints} icon={AlertTriangle} colorClass="text-orange-600 bg-orange-100" link="/service" />
        {showInventory && (
          <KPICard title="Low Stock Alerts" value={summary.lowStockAlerts} icon={PackageX} colorClass="text-red-600 bg-red-100" link="/inventory" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            {showLeads && (
              <Link href="/leads/new" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary/30 transition-colors text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">Add Lead</span>
              </Link>
            )}
            <Link href="/projects" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary/30 transition-colors text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">View Projects</span>
            </Link>
            {showFinance && (
              <Link href="/finance" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary/30 transition-colors text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">Finance</span>
              </Link>
            )}
            <Link href="/service" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary/30 transition-colors text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">Service</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">System Status</h2>
            {role === "admin" && <Link href="/system" className="text-xs text-primary hover:underline">View All</Link>}
          </div>
          <div className="p-5 flex-1 flex flex-col justify-center space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">All systems operational</p>
                <p className="text-xs text-gray-500">Database & API connected</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Storage Capacity</span>
                <span className="font-mono font-medium text-gray-700">45%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "45%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root Dashboard ────────────────────────────────────────────────────────────

export function Dashboard() {
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  if (isLoading || !summary || !user) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (user.role === "engineer") {
    return <EngineerDashboard userId={user.id} />;
  }

  return <StandardDashboard summary={summary} role={user.role} />;
}
