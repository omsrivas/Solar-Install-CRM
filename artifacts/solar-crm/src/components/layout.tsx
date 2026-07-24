import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
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
  SunMedium,
  Menu,
  X as XIcon,
} from "lucide-react";

type Role = "admin" | "sales" | "finance" | "warehouse" | "engineer";

const ROLE_NAV: Record<Role, Array<{ icon: React.ElementType; label: string; href: string }>> = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Leads", href: "/leads" },
    { icon: Briefcase, label: "Projects", href: "/projects" },
    { icon: Wallet, label: "Finance", href: "/finance" },
    { icon: Package, label: "Inventory", href: "/inventory" },
    { icon: Wrench, label: "Service", href: "/service" },
    { icon: BarChart, label: "Reports", href: "/reports" },
    { icon: Activity, label: "Activities", href: "/activities" },
    { icon: FileText, label: "Documents", href: "/documents" },
  ],
  sales: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Leads", href: "/leads" },
    { icon: Activity, label: "Activities", href: "/activities" },
    { icon: FileText, label: "Documents", href: "/documents" },
  ],
  finance: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Wallet, label: "Finance", href: "/finance" },
    { icon: Briefcase, label: "Projects", href: "/projects" },
    { icon: BarChart, label: "Reports", href: "/reports" },
  ],
  warehouse: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Briefcase, label: "Projects", href: "/projects" },
    { icon: Package, label: "Inventory", href: "/inventory" },
    { icon: Activity, label: "Activities", href: "/activities" },
    { icon: FileText, label: "Documents", href: "/documents" },
  ],
  engineer: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Wrench, label: "Service", href: "/service" },
    { icon: Activity, label: "Activities", href: "/activities" },
    { icon: FileText, label: "Documents", href: "/documents" },
  ],
};

const ROLE_ALLOWED: Record<Role, string[]> = {
  admin: ["/"],
  sales: ["/dashboard", "/leads", "/activities", "/documents"],
  finance: ["/dashboard", "/finance", "/projects", "/reports"],
  warehouse: ["/dashboard", "/projects", "/inventory", "/activities", "/documents"],
  engineer: ["/dashboard", "/service", "/activities", "/documents"],
};

function isAllowed(role: Role, path: string): boolean {
  if (role === "admin") return true;
  const allowed = ROLE_ALLOWED[role] ?? [];
  return allowed.some((prefix) => path === prefix || path.startsWith(prefix + "/") || path === "/");
}

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useAuth();
  const { data: user, error, refetch, isFetching } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() },
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileLoadTimedOut, setProfileLoadTimedOut] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location]);

  useEffect(() => {
    if (user || error) {
      setProfileLoadTimedOut(false);
      return;
    }
    const timeoutId = window.setTimeout(() => setProfileLoadTimedOut(true), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [user, error]);

  useEffect(() => {
    if (!error) return;
    const status = (error as { status?: number } | null)?.status;
    if (status === 401 || status === 403) {
      signOut().catch(() => {});
      setLocation("/login");
    }
  }, [error, signOut, setLocation]);

  useEffect(() => {
    if (!user) return;
    const role = user.role as Role;
    if (!isAllowed(role, location)) {
      const fallback = ROLE_NAV[role]?.[0]?.href ?? "/dashboard";
      setLocation(fallback);
    }
  }, [user, location, setLocation]);

  if (!user) {
    const status = (error as { status?: number } | null)?.status;
    const profileLoadFailed = profileLoadTimedOut || Boolean(error && status !== 401 && status !== 403);

    if (profileLoadFailed) {
      return (
        <div className="flex min-h-dvh w-full items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <SunMedium className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Your account could not be loaded</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The sign-in succeeded, but the CRM API is not responding. Check the API URL configured for this frontend, then try again.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  setProfileLoadTimedOut(false);
                  void refetch();
                }}
                disabled={isFetching}
                className="inline-flex items-center justify-center h-9 rounded-md bg-sidebar px-4 text-sm font-medium text-white transition-colors hover:bg-sidebar/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFetching ? "Retrying…" : "Retry"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void signOut().finally(() => setLocation("/login"));
                }}
                className="inline-flex items-center justify-center h-9 rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-dvh w-full bg-background">
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar z-40 border-b border-sidebar-border" />
        <aside className="hidden md:flex w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col animate-pulse">
          <div className="h-16 flex items-center px-5 gap-3 border-b border-sidebar-border flex-shrink-0">
            <div className="h-5 w-5 rounded bg-sidebar-accent/60" />
            <div className="h-4 flex-1 rounded bg-sidebar-accent/60" />
          </div>
          <div className="flex-1 p-3 space-y-1.5 pt-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 rounded-md bg-sidebar-accent/40" />
            ))}
          </div>
        </aside>
        <main className="flex-1 min-w-0 min-h-0 bg-background overflow-y-auto pt-14 md:pt-0">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    setLocation("/login");
  };

  const role = user.role as Role;
  const navItems = ROLE_NAV[role] ?? ROLE_NAV.admin;

  const adminItems = [
    { icon: Users, label: "Users", href: "/users" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: Server, label: "System", href: "/system" },
  ];

  const NavLink = ({ item }: { item: { icon: React.ElementType; label: string; href: string } }) => {
    const isActive = item.href === "/dashboard"
      ? location === "/" || location === "/dashboard"
      : location.startsWith(item.href);

    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-[background-color,color,transform] duration-200 ease-out active:translate-y-px ${
          isActive
            ? "bg-sidebar-accent text-sidebar-primary font-medium"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        }`}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border gap-3 text-sidebar-primary flex-shrink-0">
        <SunMedium className="h-5 w-5 flex-shrink-0" />
        <span className="font-heading font-semibold text-base text-white truncate tracking-tight">
          Hitech Electropower
        </span>
        <button
          className="ml-auto rounded-md p-1.5 text-sidebar-foreground/70 transition-[background-color,color,transform] duration-200 ease-out hover:bg-sidebar-accent active:scale-95 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-0.5">
          {navItems.map((item) => <NavLink key={item.href} item={item} />)}
        </div>

        {user.role === "admin" && (
          <>
            <div className="px-5 mt-6 mb-2 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
              Admin
            </div>
            <div className="px-3 space-y-0.5">
              {adminItems.map((item) => <NavLink key={item.href} item={item} />)}
            </div>
          </>
        )}
      </div>

      {/* User footer */}
      <div className="p-4 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary flex-shrink-0 uppercase">
            {user.name?.charAt(0) ?? "?"}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</span>
            <span className="text-xs text-sidebar-foreground/50 capitalize">{user.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 rounded-md p-1.5 text-sidebar-foreground/50 transition-[background-color,color,transform] duration-200 ease-out hover:bg-sidebar-accent hover:text-sidebar-foreground active:scale-95"
            data-testid="button-logout"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh w-full bg-background">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar text-sidebar-foreground flex items-center px-4 z-40 border-b border-sidebar-border gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-1.5 text-sidebar-foreground/70 transition-[background-color,color,transform] duration-200 ease-out hover:bg-sidebar-accent active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <SunMedium className="h-4 w-4 text-sidebar-primary flex-shrink-0" />
        <span className="font-heading font-semibold text-sm text-white tracking-tight truncate">
          Hitech Electropower
        </span>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <aside className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-50 transition-transform duration-200 ease-out ${sidebarOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"}`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 min-h-0 bg-background overflow-y-auto pt-14 md:pt-0">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
          <div key={location} className="page-transition">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
