import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wallet,
  Package,
  Wrench,
  BarChart,
  Activity,
  FileText,
  Settings,
  Server,
  LogOut,
  SunMedium
} from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, error } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });

  useEffect(() => {
    if (error) {
      localStorage.removeItem("solar_crm_token");
      setLocation("/login");
    }
  }, [error, setLocation]);

  if (error || !user) return null; // loading or redirecting

  const handleLogout = () => {
    localStorage.removeItem("solar_crm_token");
    setLocation("/login");
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Leads", href: "/leads" },
    { icon: Briefcase, label: "Projects", href: "/projects" },
    { icon: Wallet, label: "Finance", href: "/finance" },
    { icon: Package, label: "Inventory", href: "/inventory" },
    { icon: Wrench, label: "Service", href: "/service" },
    { icon: BarChart, label: "Reports", href: "/reports" },
    { icon: Activity, label: "Activities", href: "/activities" },
    { icon: FileText, label: "Documents", href: "/documents" },
  ];

  const adminItems = [
    { icon: Users, label: "Users", href: "/users" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: Server, label: "System", href: "/system" },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-2 text-sidebar-primary">
          <SunMedium className="h-6 w-6" />
          <span className="font-bold text-lg tracking-tight text-white">SunPower Solar</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-primary" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}>
                  <item.icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {user.role === 'admin' && (
            <>
              <div className="px-4 mt-6 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Admin
              </div>
              <div className="px-3 space-y-1">
                {adminItems.map((item) => {
                  const isActive = location.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-primary" 
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}>
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-sidebar-foreground/50 capitalize">{user.role}</span>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-sidebar-accent rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors" data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#F8FAFC]">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="container mx-auto p-6 md:p-8 max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
