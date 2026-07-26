import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
  AlertTriangle,
  RefreshCw,
  Shield,
} from "lucide-react";

type Role = "admin" | "sales" | "finance" | "warehouse" | "engineer";

const ROLE_NAV: Record<Role, Array<{ icon: React.ElementType; label: string; href: string }>> = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard",  href: "/dashboard" },
    { icon: Users,           label: "Leads",      href: "/leads" },
    { icon: Briefcase,       label: "Projects",   href: "/projects" },
    { icon: Wallet,          label: "Finance",    href: "/finance" },
    { icon: Package,         label: "Inventory",  href: "/inventory" },
    { icon: Wrench,          label: "Service",    href: "/service" },
    { icon: BarChart,        label: "Reports",    href: "/reports" },
    { icon: Activity,        label: "Activities", href: "/activities" },
    { icon: FileText,        label: "Documents",  href: "/documents" },
  ],
  sales: [
    { icon: LayoutDashboard, label: "Dashboard",  href: "/dashboard" },
    { icon: Users,           label: "Leads",      href: "/leads" },
    { icon: Activity,        label: "Activities", href: "/activities" },
    { icon: FileText,        label: "Documents",  href: "/documents" },
  ],
  finance: [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Wallet,          label: "Finance",   href: "/finance" },
    { icon: Briefcase,       label: "Projects",  href: "/projects" },
    { icon: BarChart,        label: "Reports",   href: "/reports" },
  ],
  warehouse: [
    { icon: LayoutDashboard, label: "Dashboard",  href: "/dashboard" },
    { icon: Briefcase,       label: "Projects",   href: "/projects" },
    { icon: Package,         label: "Inventory",  href: "/inventory" },
    { icon: Activity,        label: "Activities", href: "/activities" },
    { icon: FileText,        label: "Documents",  href: "/documents" },
  ],
  engineer: [
    { icon: LayoutDashboard, label: "Dashboard",  href: "/dashboard" },
    { icon: Wrench,          label: "Service",    href: "/service" },
    { icon: Activity,        label: "Activities", href: "/activities" },
    { icon: FileText,        label: "Documents",  href: "/documents" },
  ],
};

const ROLE_ALLOWED: Record<Role, string[]> = {
  admin:     ["/"],
  sales:     ["/dashboard", "/leads", "/activities", "/documents"],
  finance:   ["/dashboard", "/finance", "/projects", "/reports"],
  warehouse: ["/dashboard", "/projects", "/inventory", "/activities", "/documents"],
  engineer:  ["/dashboard", "/service", "/activities", "/documents"],
};

function isAllowed(role: Role, path: string): boolean {
  if (role === "admin") return true;
  const allowed = ROLE_ALLOWED[role] ?? [];
  return allowed.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/") || path === "/"
  );
}

// ─── Role colour pill ────────────────────────────────────────────────────────

const ROLE_COLORS: Record<Role, string> = {
  admin:     "bg-primary/20 text-primary",
  sales:     "bg-blue-500/20 text-blue-300",
  finance:   "bg-emerald-500/20 text-emerald-300",
  warehouse: "bg-amber-500/20 text-amber-300",
  engineer:  "bg-violet-500/20 text-violet-300",
};

// ─── Nav link ────────────────────────────────────────────────────────────────

function NavLink({
  item,
  location,
}: {
  item: { icon: React.ElementType; label: string; href: string };
  location: string;
}) {
  const isActive =
    item.href === "/dashboard"
      ? location === "/" || location === "/dashboard"
      : location.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={[
        "relative flex items-center gap-3 px-3 py-2 text-sm rounded-lg",
        "transition-[background-color,color] duration-150 ease-out",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary font-semibold"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 font-medium",
      ].join(" ")}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
      )}
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ─── Section label ───────────────────────────────────────────────────────────

function NavSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/30 select-none">
      {children}
    </p>
  );
}

// ─── Sidebar body (shared between desktop + mobile) ──────────────────────────

function SidebarBody({
  user,
  navItems,
  adminItems,
  location,
  onClose,
  onLogout,
}: {
  user: { name?: string | null; role?: string | null };
  navItems: Array<{ icon: React.ElementType; label: string; href: string }>;
  adminItems: Array<{ icon: React.ElementType; label: string; href: string }>;
  location: string;
  onClose?: () => void;
  onLogout: () => void;
}) {
  const role = (user.role ?? "admin") as Role;
  const initial = (user.name ?? "?").charAt(0).toUpperCase();

  return (
    <>
      {/* ── Logo header ───────────────────────────────────────────── */}
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
        {/* Brand mark */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
          <SunMedium className="h-4 w-4 text-primary" />
        </span>
        <span className="flex-1 truncate font-heading text-sm font-semibold tracking-tight text-white">
          Hitech Electropower
        </span>
        {/* Mobile close */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
            aria-label="Close menu"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="space-y-0.5 px-2">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} location={location} />
          ))}
        </div>

        {user.role === "admin" && (
          <div className="mt-5 space-y-0.5 px-2">
            <NavSectionLabel>Admin</NavSectionLabel>
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} location={location} />
            ))}
          </div>
        )}


      </div>

      {/* ── User footer ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-primary ring-2 ring-sidebar-border uppercase select-none">
            {initial}
          </span>

          {/* Name + role */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground leading-none">
              {user.name}
            </p>
            <span
              className={[
                "mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                ROLE_COLORS[role] ?? "bg-gray-500/20 text-gray-300",
              ].join(" ")}
            >
              {user.role}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground active:scale-95"
            data-testid="button-logout"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main layout ─────────────────────────────────────────────────────────────

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { signOut } = useAuth();
  const { data: user, error, refetch, isFetching } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() },
  });
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileLoadTimedOut, setProfileLoadTimedOut] = useState(false);

  // Refs for the main scroll container and page-transition div.
  // Kept here (before any early return) to satisfy Rules of Hooks.
  const mainRef = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const isFirstTransition = useRef(true);

  useEffect(() => { setSidebarOpen(false); }, [location]);

  useEffect(() => {
    if (user || error) { setProfileLoadTimedOut(false); return; }
    const id = window.setTimeout(() => setProfileLoadTimedOut(true), 10_000);
    return () => window.clearTimeout(id);
  }, [user, error]);

  useEffect(() => {
    if (!error) return;
    const err = error as { status?: number; payload?: { code?: string } } | null;
    const status = err?.status;
    // UNREGISTERED = Firebase account exists but no CRM user record.
    // Show the unregistered screen instead of forcing a logout.
    if (status === 403 && err?.payload?.code === "UNREGISTERED") return;
    if (status === 401 || status === 403) {
      signOut().catch(() => {});
      setLocation("/login");
    }
  }, [error, signOut, setLocation]);

  useEffect(() => {
    if (!user) return;
    const role = user.role as Role;
    if (!isAllowed(role, location)) {
      setLocation(ROLE_NAV[role]?.[0]?.href ?? "/dashboard");
    }
  }, [user, location, setLocation]);

  // On route change: scroll to top and restart the page-enter animation
  // without unmounting children (preserves React Query cache, no white flash).
  useEffect(() => {
    if (isFirstTransition.current) {
      isFirstTransition.current = false;
      return;
    }
    // Scroll the main content area back to the top.
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
    // Restart CSS animation by removing the class, forcing a reflow, then
    // re-adding it. This avoids the remount-based flash from key={location}.
    const el = pageRef.current;
    if (!el) return;
    el.classList.remove("page-transition");
    void el.offsetHeight; // force reflow so the browser sees the class removal
    el.classList.add("page-transition");
  }, [location]);

  // ── Loading / error state ──────────────────────────────────────────────────

  if (!user) {
    const err = error as { status?: number; payload?: { code?: string } } | null;
    const status = err?.status;

    // Firebase account exists but has no CRM user record — show a clear
    // "not registered" message instead of silently logging out.
    if (status === 403 && err?.payload?.code === "UNREGISTERED") {
      return (
        <div className="flex min-h-dvh w-full items-center justify-center bg-background p-6">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-violet-100">
              <Shield className="h-5 w-5 text-violet-600" />
            </div>
            <h1 className="text-base font-semibold text-foreground">Account not registered</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your Firebase account exists but hasn't been added to the CRM yet. Ask an admin to create your account from the Users page.
            </p>
            <button
              type="button"
              onClick={() => void signOut().finally(() => setLocation("/login"))}
              className="mt-5 inline-flex items-center justify-center h-9 w-full rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      );
    }

    const failed =
      profileLoadTimedOut ||
      Boolean(error && status !== 401 && status !== 403);

    if (failed) {
      return (
        <div className="flex min-h-dvh w-full items-center justify-center bg-background p-6">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <h1 className="text-base font-semibold text-foreground">
              Account could not be loaded
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sign-in succeeded but the CRM API isn't responding. Check the API
              URL, then try again.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => { setProfileLoadTimedOut(false); void refetch(); }}
                disabled={isFetching}
                className="inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-sidebar px-4 text-sm font-medium text-white transition-colors hover:bg-sidebar/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isFetching && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {isFetching ? "Retrying…" : "Retry"}
              </button>
              <button
                type="button"
                onClick={() => void signOut().finally(() => setLocation("/login"))}
                className="inline-flex items-center justify-center h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Loading skeleton
    return (
      <div className="flex h-dvh w-full bg-background">
        {/* Mobile topbar skeleton */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar z-40 border-b border-sidebar-border" />
        {/* Desktop sidebar skeleton */}
        <aside className="hidden md:flex w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col animate-pulse">
          <div className="h-14 flex items-center px-4 gap-3 border-b border-sidebar-border flex-shrink-0">
            <div className="h-7 w-7 rounded-lg bg-sidebar-accent/60" />
            <div className="h-3.5 flex-1 rounded-md bg-sidebar-accent/60" />
          </div>
          <div className="flex-1 p-2 space-y-1 pt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-sidebar-accent/40" />
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

  // ── Authenticated layout ───────────────────────────────────────────────────

  const handleLogout = async () => { await signOut(); setLocation("/login"); };
  const role = user.role as Role;
  const navItems = ROLE_NAV[role] ?? ROLE_NAV.admin;
  const adminItems = [
    { icon: Users,    label: "Users",    href: "/users" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: Server,   label: "System",   href: "/system" },
  ];
  const sidebarProps = {
    user, navItems, adminItems, location, onLogout: handleLogout,
  };

  return (
    <div className="flex h-dvh w-full bg-background">

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar text-sidebar-foreground flex items-center px-4 z-40 border-b border-sidebar-border gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/20">
          <SunMedium className="h-3.5 w-3.5 text-primary" />
        </span>
        <span className="flex-1 truncate font-heading text-sm font-semibold tracking-tight text-white">
          Hitech Electropower
        </span>
      </div>

      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-[1px] z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────────────── */}
      <aside
        className={[
          "md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw]",
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          "flex flex-col z-50 transition-transform duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        ].join(" ")}
      >
        <SidebarBody {...sidebarProps} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col">
        <SidebarBody {...sidebarProps} />
      </aside>

      {/* ── Page content ───────────────────────────────────────── */}
      <main ref={mainRef} className="flex-1 min-w-0 min-h-0 bg-background overflow-y-auto pt-14 md:pt-0">
        <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
          <div ref={pageRef} className="page-transition">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
