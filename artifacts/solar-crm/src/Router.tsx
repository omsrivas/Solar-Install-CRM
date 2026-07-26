import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/context/AuthContext";

// Route-level code splitting. Each page chunk is fetched on first navigation
// to that route; subsequent visits use the cached module.
const Login         = lazy(() => import("@/pages/login").then(m => ({ default: m.Login })));
const Dashboard     = lazy(() => import("@/pages/dashboard").then(m => ({ default: m.Dashboard })));
const Leads         = lazy(() => import("@/pages/leads").then(m => ({ default: m.Leads })));
const LeadDetail    = lazy(() => import("@/pages/leads/detail").then(m => ({ default: m.LeadDetail })));
const NewLead       = lazy(() => import("@/pages/leads/new").then(m => ({ default: m.NewLead })));
const Projects      = lazy(() => import("@/pages/projects").then(m => ({ default: m.Projects })));
const ProjectDetail = lazy(() => import("@/pages/projects/detail").then(m => ({ default: m.ProjectDetail })));
const Finance       = lazy(() => import("@/pages/finance").then(m => ({ default: m.Finance })));
const Inventory     = lazy(() => import("@/pages/inventory").then(m => ({ default: m.Inventory })));
const Service       = lazy(() => import("@/pages/service").then(m => ({ default: m.Service })));
const Reports       = lazy(() => import("@/pages/reports").then(m => ({ default: m.Reports })));
const Activities    = lazy(() => import("@/pages/activities").then(m => ({ default: m.Activities })));
const Documents     = lazy(() => import("@/pages/documents").then(m => ({ default: m.Documents })));
const Users         = lazy(() => import("@/pages/users").then(m => ({ default: m.Users })));
const Settings      = lazy(() => import("@/pages/settings").then(m => ({ default: m.Settings })));
const System        = lazy(() => import("@/pages/system").then(m => ({ default: m.System })));

/** Shared spinner shown while a lazy page chunk is loading. */
function PageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

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
    return <PageSpinner />;
  }

  // Auth resolved but no user — render Login while the effect above updates
  // the URL. Avoids a flash of protected content or spurious API calls.
  if (!firebaseUser) {
    return (
      <Suspense fallback={<PageSpinner />}>
        <Login />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageSpinner />}>
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        {/* ── Specific routes must come before "/" ─────────────────────────
            In Wouter, "/" prefix-matches every path. Placing it before other
            routes inside a Switch caused it to intercept all navigation and
            always render Dashboard, making sidebar links appear broken. */}
        <Route path="/dashboard">
          <Layout><Dashboard /></Layout>
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
    </Suspense>
  );
}
