import { useState } from "react";
import { useListSettings, useBulkUpdateSettings } from "@workspace/api-client-react";
import {
  Settings as SettingsIcon, Save, Building, Bell, Shield, Palette,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "general" | "leads" | "notifications" | "ui";

interface NavTab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TABS: NavTab[] = [
  { id: "general",       label: "General",       icon: Building, description: "Company details & defaults" },
  { id: "leads",         label: "Lead Management", icon: Shield,  description: "Pipeline & assignment rules" },
  { id: "notifications", label: "Notifications",  icon: Bell,    description: "Alerts & system warnings" },
  { id: "ui",            label: "Preferences",    icon: Palette,  description: "Interface & display options" },
];

// ─── Field primitives ─────────────────────────────────────────────────────────

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-gray-800 leading-none">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-gray-400 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pb-4 border-b border-gray-100">
      <h2 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Toggle row (Switch + label + description) ────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 leading-snug">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
      />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-5 p-6 animate-pulse">
      <div className="h-5 w-40 rounded-md bg-gray-100" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-gray-100" />
            <div className="h-9 w-full rounded-md bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Settings() {
  const { data: settingsList, isLoading } = useListSettings();
  const updateSettings = useBulkUpdateSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  const getSetting = (key: string, defaultVal = "") => {
    if (key in localSettings) return localSettings[key];
    return settingsList?.find((s) => s.key === key)?.value ?? defaultVal;
  };

  const set = (key: string, value: string) =>
    setLocalSettings((prev) => ({ ...prev, [key]: value }));

  const getBool = (key: string, defaultVal: boolean) =>
    getSetting(key, defaultVal ? "true" : "false") === "true";

  const setBool = (key: string, checked: boolean) =>
    set(key, checked ? "true" : "false");

  const hasChanges = Object.keys(localSettings).length > 0;

  const handleSave = () => {
    if (!hasChanges) return;
    const settingsArray = Object.entries(localSettings).map(([key, value]) => ({ key, value }));
    updateSettings.mutate(
      { data: { settings: settingsArray } },
      {
        onSuccess: () => {
          toast({ title: "Settings saved" });
          setLocalSettings({});
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        },
        onError: () => {
          toast({ title: "Failed to save settings", variant: "destructive" });
        },
      }
    );
  };

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 tracking-tight">
            <SettingsIcon className="h-5 w-5 text-primary shrink-0" />
            System Configuration
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage global preferences and application behaviour
          </p>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 shrink-0">
          {hasChanges && (
            <span className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-full px-3 py-1 leading-none">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 shadow-sm",
              hasChanges && !updateSettings.isPending
                ? "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none",
            ].join(" ")}
          >
            {updateSettings.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : hasChanges ? (
              <Save className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {updateSettings.isPending ? "Saving…" : hasChanges ? "Save Changes" : "Saved"}
          </button>
        </div>
      </div>

      {/* ── Layout ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-5">

        {/* Sidebar nav */}
        <nav className="w-full md:w-56 shrink-0">
          <ul className="flex flex-row md:flex-col gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <li key={tab.id} className="flex-1 md:flex-none">
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-100",
                      active
                        ? "bg-white border border-gray-200 shadow-sm text-primary font-semibold"
                        : "text-gray-500 font-medium hover:bg-white/70 hover:text-gray-800",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-primary" : "text-gray-400",
                      ].join(" ")}
                    />
                    <span className="truncate hidden md:block">{tab.label}</span>
                    <span className="truncate md:hidden">{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <SettingsSkeleton />
          ) : (
            <div className="p-6 md:p-8">

              {/* Panel header */}
              <div className="mb-6">
                <SectionHeader
                  title={activeTabMeta.label}
                  subtitle={activeTabMeta.description}
                />
              </div>

              {/* ── General ─────────────────────────────────────────── */}
              {activeTab === "general" && (
                <div className="animate-in fade-in duration-150 ease-out space-y-5 max-w-md">
                  <FieldRow label="Company Name">
                    <Input
                      value={getSetting("company_name", "Hitech Electropower")}
                      onChange={(e) => set("company_name", e.target.value)}
                      placeholder="e.g. Hitech Electropower"
                    />
                  </FieldRow>

                  <FieldRow label="Support Email">
                    <Input
                      type="email"
                      value={getSetting("support_email", "support@hitechelectropower.com")}
                      onChange={(e) => set("support_email", e.target.value)}
                      placeholder="support@example.com"
                    />
                  </FieldRow>

                  <FieldRow label="Support Phone">
                    <Input
                      type="tel"
                      value={getSetting("support_phone", "+91 1800 123 4567")}
                      onChange={(e) => set("support_phone", e.target.value)}
                      placeholder="+91 1800 000 0000"
                    />
                  </FieldRow>

                  <FieldRow label="Default Currency">
                    <Select
                      value={getSetting("currency", "INR")}
                      onValueChange={(v) => set("currency", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              )}

              {/* ── Lead Management ──────────────────────────────────── */}
              {activeTab === "leads" && (
                <div className="animate-in fade-in duration-150 ease-out space-y-6 max-w-md">
                  <FieldRow
                    label="Lead Sources"
                    hint="Comma-separated list. These appear as options when adding a new lead."
                  >
                    <Textarea
                      rows={4}
                      value={getSetting("lead_sources", "Direct,Referral,Facebook Ad,Google Search,Exhibition")}
                      onChange={(e) => set("lead_sources", e.target.value)}
                      placeholder="Direct, Referral, Facebook Ad…"
                      className="resize-none"
                    />
                  </FieldRow>

                  <div className="pt-2 border-t border-gray-100">
                    <ToggleRow
                      label="Round-robin Lead Assignment"
                      description="Automatically distribute incoming web leads to available sales representatives in rotation."
                      checked={getBool("auto_assign_leads", false)}
                      onCheckedChange={(c) => setBool("auto_assign_leads", c)}
                    />
                  </div>
                </div>
              )}

              {/* ── Notifications ────────────────────────────────────── */}
              {activeTab === "notifications" && (
                <div className="animate-in fade-in duration-150 ease-out max-w-md">
                  <div className="rounded-lg border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                    <div className="px-4">
                      <ToggleRow
                        label="Low Inventory Alerts"
                        description="Show a banner when items drop below their minimum stock level."
                        checked={getBool("alert_low_stock", true)}
                        onCheckedChange={(c) => setBool("alert_low_stock", c)}
                      />
                    </div>
                    <div className="px-4">
                      <ToggleRow
                        label="Overdue Follow-up Alerts"
                        description="Highlight leads with missed follow-up dates in red across all views."
                        checked={getBool("alert_overdue_followups", true)}
                        onCheckedChange={(c) => setBool("alert_overdue_followups", c)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Preferences ──────────────────────────────────────── */}
              {activeTab === "ui" && (
                <div className="animate-in fade-in duration-150 ease-out space-y-5 max-w-md">
                  <FieldRow
                    label="Default View on Login"
                    hint="The page users land on after signing in."
                  >
                    <Select
                      value={getSetting("default_view", "dashboard")}
                      onValueChange={(v) => set("default_view", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashboard">Dashboard Overview</SelectItem>
                        <SelectItem value="leads">Leads Pipeline</SelectItem>
                        <SelectItem value="projects">Active Projects</SelectItem>
                        <SelectItem value="service">Service & Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
