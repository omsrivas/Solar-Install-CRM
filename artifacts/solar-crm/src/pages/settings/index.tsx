import { useState } from "react";
import { useListSettings, useBulkUpdateSettings } from "@workspace/api-client-react";
import { Settings as SettingsIcon, Save, Building, Bell, Shield, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function Settings() {
  const { data: settingsList, isLoading } = useListSettings();
  const updateSettings = useBulkUpdateSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("general");
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  // Merge server settings with local unsaved changes
  const getSetting = (key: string, defaultVal: string = "") => {
    if (key in localSettings) return localSettings[key];
    const serverSetting = settingsList?.find(s => s.key === key);
    return serverSetting ? serverSetting.value : defaultVal;
  };

  const handleUpdate = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (Object.keys(localSettings).length === 0) return;

    const settingsArray = Object.entries(localSettings).map(([key, value]) => ({ key, value }));
    
    updateSettings.mutate({ data: { settings: settingsArray } }, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully" });
        setLocalSettings({});
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      },
      onError: () => {
        toast({ title: "Failed to save settings", variant: "destructive" });
      },
    });
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            System Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage global preferences and application behavior</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
          className={`font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm shadow-sm ${
            hasChanges 
              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-row md:flex-col gap-1">
            <button 
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "general" ? "bg-white border border-gray-200 text-primary shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Building className="h-4 w-4" /> General Info
            </button>
            <button 
              onClick={() => setActiveTab("leads")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "leads" ? "bg-white border border-gray-200 text-primary shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Shield className="h-4 w-4" /> Lead Management
            </button>
            <button 
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "notifications" ? "bg-white border border-gray-200 text-primary shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Bell className="h-4 w-4" /> Notifications
            </button>
            <button 
              onClick={() => setActiveTab("ui")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "ui" ? "bg-white border border-gray-200 text-primary shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Palette className="h-4 w-4" /> Preferences
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">Loading settings...</div>
          ) : (
            <div className="p-6">
              {activeTab === "general" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Company Information</h2>
                  
                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input 
                        type="text" 
                        value={getSetting("company_name", "Hitech Electropower")}
                        onChange={(e) => handleUpdate("company_name", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                      <input 
                        type="email" 
                        value={getSetting("support_email", "support@hitechelectropower.com")}
                        onChange={(e) => handleUpdate("support_email", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                      <input 
                        type="text" 
                        value={getSetting("support_phone", "+91 1800 123 4567")}
                        onChange={(e) => handleUpdate("support_phone", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                      <select 
                        value={getSetting("currency", "INR")}
                        onChange={(e) => handleUpdate("currency", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "leads" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Lead & Pipeline Configuration</h2>
                  
                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lead Sources (Comma separated)</label>
                      <textarea 
                        value={getSetting("lead_sources", "Direct,Referral,Facebook Ad,Google Search,Exhibition")}
                        onChange={(e) => handleUpdate("lead_sources", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px]"
                      />
                      <p className="text-xs text-gray-500 mt-1">These will appear as options when adding a new lead.</p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={getSetting("auto_assign_leads", "false") === "true"}
                          onChange={(e) => handleUpdate("auto_assign_leads", e.target.checked ? "true" : "false")}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <span className="text-sm font-medium text-gray-700">Auto-assign new leads via round-robin</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">Automatically distribute web leads to available sales representatives.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">System Alerts</h2>
                  
                  <div className="space-y-4 max-w-lg">
                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-md bg-gray-50/50">
                      <input 
                        type="checkbox" 
                        checked={getSetting("alert_low_stock", "true") === "true"}
                        onChange={(e) => handleUpdate("alert_low_stock", e.target.checked ? "true" : "false")}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-900 block">Low Inventory Alerts</span>
                        <span className="text-xs text-gray-500 block mt-0.5">Show banner when items drop below minimum stock level.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-md bg-gray-50/50">
                      <input 
                        type="checkbox" 
                        checked={getSetting("alert_overdue_followups", "true") === "true"}
                        onChange={(e) => handleUpdate("alert_overdue_followups", e.target.checked ? "true" : "false")}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-900 block">Overdue Follow-ups</span>
                        <span className="text-xs text-gray-500 block mt-0.5">Highlight leads with missed follow-up dates in red.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "ui" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">User Interface Preferences</h2>
                  
                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default View on Login</label>
                      <select 
                        value={getSetting("default_view", "dashboard")}
                        onChange={(e) => handleUpdate("default_view", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="dashboard">Dashboard Overview</option>
                        <option value="leads">Leads Pipeline</option>
                        <option value="projects">Active Projects</option>
                        <option value="service">Service & Support</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
