import { useGetSystemHealth, useListBackups, useCreateBackup } from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  Server, Database, HardDrive, Cpu, 
  DownloadCloud, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function System() {
  const { data: health, isLoading: healthLoading } = useGetSystemHealth({
    query: { refetchInterval: 30000 } // Refetch every 30s
  });
  
  const { data: backups, isLoading: backupsLoading } = useListBackups();
  const createBackup = useCreateBackup();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreateBackup = () => {
    createBackup.mutate({ data: {} }, {
      onSuccess: () => {
        toast({ title: "Backup created successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/system/backups"] });
      },
      onError: () => {
        toast({ title: "Failed to create backup", variant: "destructive" });
      }
    });
  };

  if (healthLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Checking system vitals...</div>;
  }

  const isHealthy = health?.status === "healthy";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" />
            System Status
          </h1>
          <p className="text-sm text-gray-500 mt-1">Infrastructure health and data management</p>
        </div>
        
        <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${
          isHealthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {isHealthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {isHealthy ? "All Systems Operational" : "Degraded Performance"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-gray-800 mb-4">
            <Database className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-lg">Database</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Connection Status</span>
                <span className={health?.database.connected ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {health?.database.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Response Time</span>
                <span className="font-mono text-gray-900">{health?.database.responseMs}ms</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    (health?.database.responseMs || 0) < 50 ? 'bg-green-500' : 
                    (health?.database.responseMs || 0) < 150 ? 'bg-amber-500' : 'bg-red-500'
                  }`} 
                  style={{ width: `${Math.min(((health?.database.responseMs || 0) / 200) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-gray-800 mb-4">
            <Cpu className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-lg">Memory Usage</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Heap Used</span>
                <span className="font-mono text-gray-900">{Math.round(health?.memory.heapUsedMb || 0)} MB</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full" 
                  style={{ width: `${((health?.memory.heapUsedMb || 0) / (health?.memory.heapTotalMb || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">RSS / Total</span>
                <span className="font-mono text-gray-900">{Math.round(health?.memory.rssMb || 0)} MB</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-gray-800 mb-4">
            <HardDrive className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-lg">Application</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Uptime</span>
                <span className="font-medium text-gray-900">{health?.uptimeFormatted}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">API Version</span>
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700">v{health?.version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Database Backups</h2>
          </div>
          <button 
            onClick={handleCreateBackup}
            disabled={createBackup.isPending}
            className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-1.5 px-3 rounded-md transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {createBackup.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
            Generate Snapshot
          </button>
        </div>
        
        <div className="p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-white">
                <th className="px-6 py-3 font-semibold">Filename</th>
                <th className="px-6 py-3 font-semibold">Size</th>
                <th className="px-6 py-3 font-semibold">Created At</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {backupsLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading backups...</td>
                </tr>
              ) : backups?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-gray-500">No backups found. Generate a snapshot to secure data.</td>
                </tr>
              ) : (
                backups?.map((backup) => (
                  <tr key={backup.filename} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-700">{backup.filename}</td>
                    <td className="px-6 py-4 text-gray-500">{backup.sizeFormatted}</td>
                    <td className="px-6 py-4 text-gray-500">{format(new Date(backup.createdAt), "MMM d, yyyy HH:mm")}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-red-600 hover:text-red-800 font-medium text-xs uppercase tracking-wide">
                        Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
