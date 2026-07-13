import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { 
  Users, CalendarClock, Briefcase, IndianRupee, 
  AlertTriangle, PackageX, CheckCircle2, Wallet,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";

function KPICard({ title, value, icon: Icon, colorClass, link }: { title: string, value: string | number, icon: any, colorClass: string, link: string }) {
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
      <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-300 ${colorClass.replace('bg-', 'bg-').replace('text-', 'bg-')}`} />
    </Link>
  );
}

export function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey()
    }
  });

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Active Leads" 
          value={summary.totalLeads} 
          icon={Users} 
          colorClass="text-blue-600 bg-blue-100" 
          link="/leads" 
        />
        <KPICard 
          title="Today's Follow-ups" 
          value={summary.todayFollowUps} 
          icon={CalendarClock} 
          colorClass="text-amber-600 bg-amber-100" 
          link="/leads?followUpDate=today" 
        />
        <KPICard 
          title="Orders Won (This Month)" 
          value={summary.ordersOwned} 
          icon={CheckCircle2} 
          colorClass="text-green-600 bg-green-100" 
          link="/projects" 
        />
        <KPICard 
          title="Total Revenue (This Month)" 
          value={formatCurrency(summary.totalRevenue)} 
          icon={IndianRupee} 
          colorClass="text-emerald-600 bg-emerald-100" 
          link="/finance" 
        />
        <KPICard 
          title="Active Projects" 
          value={summary.activeProjects} 
          icon={Briefcase} 
          colorClass="text-indigo-600 bg-indigo-100" 
          link="/projects" 
        />
        <KPICard 
          title="Pending Payments" 
          value={summary.pendingPayments} 
          icon={Wallet} 
          colorClass="text-rose-600 bg-rose-100" 
          link="/finance?status=pending" 
        />
        <KPICard 
          title="Open Service Calls" 
          value={summary.pendingComplaints} 
          icon={AlertTriangle} 
          colorClass="text-orange-600 bg-orange-100" 
          link="/service?status=open" 
        />
        <KPICard 
          title="Low Stock Alerts" 
          value={summary.lowStockAlerts} 
          icon={PackageX} 
          colorClass="text-red-600 bg-red-100" 
          link="/inventory?lowStock=true" 
        />
      </div>

      {/* Activity Feed Section could go here - Dashboard is dense and actionable */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <Link href="/leads/new" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary/30 transition-colors text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">Add Lead</span>
            </Link>
            <Link href="/projects/new" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary/30 transition-colors text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">New Project</span>
            </Link>
            <Link href="/finance/new" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary/30 transition-colors text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <IndianRupee className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">Record Payment</span>
            </Link>
            <Link href="/service/new" className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-primary/30 transition-colors text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">Log Complaint</span>
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">System Status</h2>
            <Link href="/system" className="text-xs text-primary hover:underline">View All</Link>
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
                <div className="h-full bg-primary rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
