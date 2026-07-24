import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Login } from "@/pages/login";
import { Dashboard } from "@/pages/dashboard";
import { Leads } from "@/pages/leads";
import { LeadDetail } from "@/pages/leads/detail";
import { NewLead } from "@/pages/leads/new";
import { Projects } from "@/pages/projects";
import { ProjectDetail } from "@/pages/projects/detail";
import { Finance } from "@/pages/finance";
import { Inventory } from "@/pages/inventory";
import { Service } from "@/pages/service";
import { Reports } from "@/pages/reports";
import { Activities } from "@/pages/activities";
import { Documents } from "@/pages/documents";
import { Users } from "@/pages/users";
import { Settings } from "@/pages/settings";
import { System } from "@/pages/system";
import { useAuth } from "@/context/AuthContext";

/** Redirect to `to` without leaving a history entry. */
function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to, { replace: true }); }, [to, navigate]);
  return null;
}

export function Router() {
  const { loading, firebaseUser } = useAuth();
  const [location, setLocation] = useLocation();

  // Once auth resolves, keep the URL in sync with auth state:
  // • unauthenticated on a protected path → /login
  // • authenticated and sitting on /login → /dashboard
  useEffect(() => {
    if (loading) return;
    if (!firebaseUser && location !== "/login") {
      setLocation("/login");
    } else if (firebaseUser && location === "/login") {
      setLocation("/dashboard");
    }
  }, [loading, firebaseUser, location, setLocation]);

  // Wait for Firebase to resolve the persisted session before routing.
  // Without this guard, unauthenticated API calls would fire immediately
  // (token store is empty) and redirect authenticated users to /login.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Auth resolved but no user — render Login while the effect above updates
  // the URL. Avoids a flash of protected content or spurious API calls.
  if (!firebaseUser) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      {/* ── Specific routes must come before "/" ─────────────────────────
          In Wouter, "/" prefix-matches every path. Placing it before other
          routes inside a Switch caused it to intercept all navigation and
          always render Dashboard, making sidebar links appear broken. */}
      <Route path="/dashboard">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/leads/new">
        <Layout><NewLead /></Layout>
      </Route>
      <Route path="/leads/:id">
        <Layout><LeadDetail /></Layout>
      </Route>
      <Route path="/leads">
        <Layout><Leads /></Layout>
      </Route>
      <Route path="/projects/:id">
        <Layout><ProjectDetail /></Layout>
      </Route>
      <Route path="/projects">
        <Layout><Projects /></Layout>
      </Route>
      <Route path="/finance">
        <Layout><Finance /></Layout>
      </Route>
      <Route path="/inventory">
        <Layout><Inventory /></Layout>
      </Route>
      <Route path="/service">
        <Layout><Service /></Layout>
      </Route>
      <Route path="/reports">
        <Layout><Reports /></Layout>
      </Route>
      <Route path="/activities">
        <Layout><Activities /></Layout>
      </Route>
      <Route path="/documents">
        <Layout><Documents /></Layout>
      </Route>
      <Route path="/users">
        <Layout><Users /></Layout>
      </Route>
      <Route path="/settings">
        <Layout><Settings /></Layout>
      </Route>
      <Route path="/system">
        <Layout><System /></Layout>
      </Route>
      {/* Root "/" redirect — placed last so specific routes always win first */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route>
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
            <p className="text-gray-500">Page not found</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}
