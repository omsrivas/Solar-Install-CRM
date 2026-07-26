import {
  useGetSystemHealth,
  useListBackups,
  useCreateBackup,
  getGetSystemHealthQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  Server, Database, Cpu, HardDrive,
  DownloadCloud, RefreshCw, CheckCircle2, AlertTriangle,
  ShieldCheck, Clock, Tag, Wifi, WifiOff,
  Archive,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyTableState, TableSkeleton } from "@/components/table-state";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SystemSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6" aria-label="Loading system status">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded-md bg-gray-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-8 w-44 animate-pulse rounded-full bg-gray-100" />
      </div>
      {/* cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-gray-100 bg-white" />
        ))}
      </div>
      {/* table */}
      <div className="h-64 animate-pulse rounded-xl border border-gray-100 bg-white" />
    </div>
  );
}

// ─── Metric row inside a health card ──────────────────────────────────────────

function MetricRow({
  label,
  value,
  bar,
}: {
  label: string;
  value: React.ReactNode;
  bar?: { pct: number; color: string };
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className="text-gray-900 font-medium tabular-nums">{value}</span>
      </div>
      {bar && (
        <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${bar.color}`}
            style={{ width: `${Math.min(bar.pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Health card ──────────────────────────────────────────────────────────────

function HealthCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  children,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </span>
        <h3 className="text-sm font-semibold text-gray-800 tracking-tight">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      <span
        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
          ok ? "animate-ping bg-emerald-400" : "bg-red-400"
        }`}
      />
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${
          ok ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function System() {
  const { data: health, isLoading: healthLoading } = useGetSystemHealth({
    query: { refetchInterval: 30_000, queryKey: getGetSystemHealthQueryKey() },
  });

  const { data: backups, isLoading: backupsLoading } = useListBackups();
  const createBackup = useCreateBackup();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreateBackup = () => {
    createBackup.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Snapshot created successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/backup/list"] });
      },
      onError: () => {
        toast({ title: "Failed to create snapshot", variant: "destructive" });
      },
    });
  };

  if (healthLoading) return <SystemSkeleton />;

  // The backend returns a slightly different shape than the generated TypeScript
  // types (e.g. "ok"/"degraded" status, responseTime not responseMs, OS memory
  // bytes not Node heap MB).  Cast once here so the rest of the JSX stays readable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = health as any;
  const isHealthy = raw?.status === "ok";
  const dbMs = raw?.database?.responseTime ?? 0;
  const heapUsed = (raw?.memory?.used ?? 0) / (1024 * 1024);
  const heapTotal = (raw?.memory?.total ?? 1) / (1024 * 1024);
  const heapPct = Math.round((heapUsed / heapTotal) * 100);

  const dbBarColor =
    dbMs < 50 ? "bg-emerald-500" : dbMs < 150 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 tracking-tight">
            <Server className="h-5 w-5 text-primary shrink-0" />
            System Status
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Infrastructure health and data management
          </p>
        </div>

        {/* Overall health badge */}
        <div
          className={[
            "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide border",
            isHealthy
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200",
          ].join(" ")}
        >
          {isHealthy ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {isHealthy ? "All Systems Operational" : "Degraded Performance"}
        </div>
      </div>

      {/* ── Health cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Database */}
        <HealthCard
          icon={Database}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          title="Database"
        >
          <MetricRow
            label="Connection"
            value={
              <span
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  raw?.database?.status === "ok" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <StatusDot ok={raw?.database?.status === "ok"} />
                {raw?.database?.status === "ok" ? "Connected" : "Disconnected"}
              </span>
            }
          />
          <MetricRow
            label="Response time"
            value={
              <span className="font-mono text-xs">
                {dbMs}
                <span className="text-gray-400 font-sans"> ms</span>
              </span>
            }
            bar={{
              pct: (dbMs / 200) * 100,
              color: dbBarColor,
            }}
          />
        </HealthCard>

        {/* Memory */}
        <HealthCard
          icon={Cpu}
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          title="Memory"
        >
          <MetricRow
            label="Heap used"
            value={
              <span className="font-mono text-xs">
                {Math.round(heapUsed)}
                <span className="text-gray-400 font-sans"> / {Math.round(heapTotal)} MB</span>
              </span>
            }
            bar={{
              pct: heapPct,
              color:
                heapPct < 60 ? "bg-violet-500" : heapPct < 80 ? "bg-amber-500" : "bg-red-500",
            }}
          />
          <MetricRow
            label="OS used"
            value={
              <span className="font-mono text-xs">
                {raw?.memory?.percentage ?? 0}
                <span className="text-gray-400 font-sans"> %</span>
              </span>
            }
          />
          <div className="flex justify-end">
            <span
              className={[
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                heapPct < 60
                  ? "bg-emerald-50 text-emerald-700"
                  : heapPct < 80
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700",
              ].join(" ")}
            >
              {heapPct}% used
            </span>
          </div>
        </HealthCard>

        {/* Application */}
        <HealthCard
          icon={HardDrive}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          title="Application"
        >
          <MetricRow
            label="Uptime"
            value={
              <span className="flex items-center gap-1 text-xs font-mono">
                <Clock className="h-3 w-3 text-gray-400" />
                {health?.uptimeFormatted}
              </span>
            }
          />
          <MetricRow
            label="API version"
            value={
              <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
                <Tag className="h-2.5 w-2.5 text-gray-400" />
                v{health?.version}
              </span>
            }
          />
          <MetricRow
            label="Network"
            value={
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                {isHealthy ? (
                  <Wifi className="h-3.5 w-3.5" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-red-500" />
                )}
                {isHealthy ? "Reachable" : "Unreachable"}
              </span>
            }
          />
        </HealthCard>
      </div>

      {/* ── Backup table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Table header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-none">Database Backups</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {backups?.length ? `${backups.length} snapshot${backups.length !== 1 ? "s" : ""}` : "No snapshots yet"}
              </p>
            </div>
          </div>

          <button
            onClick={handleCreateBackup}
            disabled={createBackup.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-gray-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createBackup.isPending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <DownloadCloud className="h-3.5 w-3.5" />
            )}
            {createBackup.isPending ? "Creating…" : "Generate Snapshot"}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Filename
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">
                  Size
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Created
                </th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {backupsLoading ? (
                <TableSkeleton columns={4} rows={3} />
              ) : !backups?.length ? (
                <EmptyTableState
                  colSpan={4}
                  title="No snapshots yet"
                  description="Generate a snapshot to secure your CRM data."
                  action={
                    <button
                      onClick={handleCreateBackup}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                      <Archive className="h-3.5 w-3.5 text-gray-400" />
                      Create first snapshot
                    </button>
                  }
                />
              ) : (
                backups.map((backup) => (
                  <tr
                    key={backup.filename}
                    className="group transition-colors hover:bg-gray-50/60"
                  >
                    {/* Filename — truncated on narrow screens */}
                    <td className="px-5 py-3.5">
                      <span
                        className="block max-w-[200px] sm:max-w-xs truncate font-mono text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5"
                        title={backup.filename}
                      >
                        {backup.filename}
                      </span>
                    </td>

                    {/* Size — hidden on xs */}
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {backup.sizeFormatted}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(backup.createdAt), "MMM d, yyyy")}
                      <span className="text-gray-300 mx-1">·</span>
                      <span className="font-mono text-[11px]">
                        {format(new Date(backup.createdAt), "HH:mm")}
                      </span>
                    </td>

                    {/* Restore */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() =>
                          toast({
                            title: "Restore unavailable",
                            description:
                              "Restoring must be done by a system administrator via the server CLI.",
                            variant: "destructive",
                          })
                        }
                        className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 focus-visible:opacity-100"
                      >
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
