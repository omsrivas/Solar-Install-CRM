import { Switch, Route } from "wouter";
import { Layout } from "@/components/layout";
import { Login } from "@/pages/login";
import { Dashboard } from "@/pages/dashboard";
import { Leads } from "@/pages/leads";
import { LeadDetail } from "@/pages/leads/detail";
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

export function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/dashboard">
        <Layout>
          <Dashboard />
        </Layout>
      </Route>
      <Route path="/leads">
        <Layout><Leads /></Layout>
      </Route>
      <Route path="/leads/:id">
        <Layout><LeadDetail /></Layout>
      </Route>
      <Route path="/projects">
        <Layout><Projects /></Layout>
      </Route>
      <Route path="/projects/:id">
        <Layout><ProjectDetail /></Layout>
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
