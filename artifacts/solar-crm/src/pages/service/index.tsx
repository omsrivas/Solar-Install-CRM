import { useEffect, useState } from "react";
import {
  useListServiceCalls, useGetServiceSummary,
  useCreateServiceCall, useUpdateServiceCall,
  useListUsers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Phone,
  MapPin,
  Plus,
  X,
  User,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  UserRoundCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { EmptyTableState, PaginationBar, TableSkeleton } from "@/components/table-state";

type TicketStatus = "open" | "in_progress" | "pending_complaint" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

const STATUS_META: Record<TicketStatus, { label: string; badge: string; dot: string }> = {
  open: {
    label: "Open",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15",
    dot: "bg-amber-500",
  },
  in_progress: {
    label: "In progress",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/15",
    dot: "bg-blue-500",
  },
  pending_complaint: {
    label: "Pending complaint",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/15",
    dot: "bg-orange-500",
  },
  closed: {
    label: "Closed",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
};

const PRIORITY_META: Record<TicketPriority, { label: string; badge: string; dot: string }> = {
  urgent: {
    label: "Urgent",
    badge: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/15",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    badge: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/15",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Low",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    dot: "bg-slate-400",
  },
};

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  iconClass,
  iconBackground,
  valueClass = "text-gray-950",
}: {
  label: string;
  value: number;
  helper: React.ReactNode;
  icon: React.ElementType;
  iconClass: string;
  iconBackground: string;
  valueClass?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</p>
          <p className={`mt-2 font-heading text-[1.7rem] font-bold tracking-tight ${valueClass}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBackground}`}>
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
      </div>
      <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
        {helper}
      </div>
      <div className={`absolute -bottom-12 -right-12 h-32 w-32 rounded-full blur-2xl transition-transform duration-300 group-hover:scale-125 ${iconBackground}`} />
    </div>
  );
}

// ─── Log Complaint Modal ───────────────────────────────────────────────────────

type LogComplaintForm = {
  customerName: string;
  customerPhone: string;
  address: string;
  issueDescription: string;
  priority: string;
  scheduledDate: string;
  assignedEngineerId: string;
};

function LogComplaintModal({
  engineers,
  onClose,
  onSubmit,
  isPending,
}: {
  engineers: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (data: LogComplaintForm) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<LogComplaintForm>({
    customerName: "",
    customerPhone: "",
    address: "",
    issueDescription: "",
    priority: "medium",
    scheduledDate: "",
    assignedEngineerId: "",
  });

  const set = (field: keyof LogComplaintForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Service desk</p>
            <h2 className="mt-1 font-heading text-xl font-bold text-gray-950">Log new complaint</h2>
          </div>
          <button aria-label="Close complaint form" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Customer name *</label>
              <input className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.customerName} onChange={set("customerName")} placeholder="Full name" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Phone *</label>
              <input className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.customerPhone} onChange={set("customerPhone")} placeholder="Mobile number" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Address</label>
            <input className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.address} onChange={set("address")} placeholder="Installation address" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Issue description *</label>
            <textarea className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" rows={3} value={form.issueDescription} onChange={set("issueDescription")} placeholder="Describe the issue in detail..." />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Priority</label>
              <select className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.priority} onChange={set("priority")}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Scheduled date</label>
              <input type="date" className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.scheduledDate} onChange={set("scheduledDate")} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Assign engineer</label>
            <select className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.assignedEngineerId} onChange={set("assignedEngineerId")}>
              <option value="">Unassigned</option>
              {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 border-t border-gray-100 bg-gray-50/50 p-5">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!form.customerName || !form.customerPhone || !form.issueDescription || isPending}
            onClick={() => onSubmit(form)}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Logging…" : "Log complaint"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Update Ticket Modal ───────────────────────────────────────────────────────

type UpdateForm = {
  status: string;
  assignedEngineerId: string;
  hsnCode: string;
  closureNotes: string;
  scheduledDate: string;
};

function UpdateModal({
  callId,
  initial,
  engineers,
  onClose,
  onSubmit,
  isPending,
}: {
  callId: number;
  initial: { status: string; assignedEngineerId?: number | null; hsnCode?: string | null; closureNotes?: string | null; scheduledDate?: string | null };
  engineers: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (data: UpdateForm) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<UpdateForm>({
    status: initial.status || "open",
    assignedEngineerId: initial.assignedEngineerId ? String(initial.assignedEngineerId) : "",
    hsnCode: initial.hsnCode || "",
    closureNotes: initial.closureNotes || "",
    scheduledDate: initial.scheduledDate || "",
  });

  const set = (field: keyof UpdateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const isClosing = form.status === "closed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Ticket update</p>
            <h2 className="mt-1 font-heading text-xl font-bold text-gray-950">SRV-{callId.toString().padStart(4, "0")}</h2>
          </div>
          <button aria-label="Close ticket update" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Status</label>
            <select className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.status} onChange={set("status")}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_complaint">Pending Complaint</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Assigned engineer</label>
            <select className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.assignedEngineerId} onChange={set("assignedEngineerId")}>
              <option value="">Unassigned</option>
              {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Scheduled date</label>
            <input type="date" className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.scheduledDate} onChange={set("scheduledDate")} />
          </div>
          {isClosing && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">HSN code <span className="text-gray-400">(for closure)</span></label>
                <input className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={form.hsnCode} onChange={set("hsnCode")} placeholder="e.g. 85076000" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Closure notes</label>
                <textarea className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" rows={3} value={form.closureNotes} onChange={set("closureNotes")} placeholder="Describe work done and resolution..." />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-3 border-t border-gray-100 bg-gray-50/50 p-5">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={isPending}
            onClick={() => onSubmit(form)}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Service Page ─────────────────────────────────────────────────────────

export function Service() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showLogModal, setShowLogModal] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: summary } = useGetServiceSummary();
  const { data: calls, isLoading } = useListServiceCalls({
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const { data: engineerList } = useListUsers({ role: "engineer" });
  const engineers = engineerList ?? [];

  const createCall = useCreateServiceCall();
  const updateCall = useUpdateServiceCall();

  const handleLog = (form: LogComplaintForm) => {
    createCall.mutate({
      data: {
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        address: form.address || undefined,
        issueDescription: form.issueDescription,
        priority: form.priority,
        status: "open",
        scheduledDate: form.scheduledDate || undefined,
        assignedEngineerId: form.assignedEngineerId ? Number(form.assignedEngineerId) : undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Complaint logged successfully" });
        setShowLogModal(false);
        queryClient.invalidateQueries({ queryKey: ["/api/service"] });
        queryClient.invalidateQueries({ queryKey: ["/api/service/summary"] });
      },
      onError: () => toast({ title: "Failed to log complaint", variant: "destructive" }),
    });
  };

  const handleUpdate = (form: UpdateForm) => {
    if (!updateTarget) return;
    updateCall.mutate({
      id: updateTarget,
      data: {
        status: form.status,
        assignedEngineerId: form.assignedEngineerId ? Number(form.assignedEngineerId) : null,
        hsnCode: form.hsnCode || undefined,
        closureNotes: form.closureNotes || undefined,
        scheduledDate: form.scheduledDate || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Ticket updated" });
        setUpdateTarget(null);
        queryClient.invalidateQueries({ queryKey: ["/api/service"] });
        queryClient.invalidateQueries({ queryKey: ["/api/service/summary"] });
      },
      onError: () => toast({ title: "Failed to update ticket", variant: "destructive" }),
    });
  };

  const updateTargetCall = calls?.find(c => c.id === updateTarget);
  const pendingComplaintCount = calls?.filter(c => c.status === "pending_complaint").length ?? 0;
  const pageCount = Math.max(1, Math.ceil((calls?.length ?? 0) / pageSize));
  const visibleCalls = calls?.slice((page - 1) * pageSize, page * pageSize) ?? [];

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const hasFilters = Boolean(search || statusFilter);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Wrench className="h-3.5 w-3.5" />
            Service / Maintenance
          </div>
          <h1 className="font-heading text-[1.7rem] font-bold tracking-tight text-gray-950">Service desk</h1>
          <p className="mt-1 text-sm text-gray-500">Track customer complaints, field work, and service resolutions.</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Log complaint
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total tickets"
          value={summary?.total || 0}
          helper={<><AlertCircle className="h-3.5 w-3.5 text-slate-500" /><span>All service requests</span></>}
          icon={AlertCircle}
          iconClass="text-slate-600"
          iconBackground="bg-slate-100"
        />
        <SummaryCard
          label="Urgent tickets"
          value={summary?.urgent || 0}
          helper={<><AlertCircle className="h-3.5 w-3.5 text-red-600" /><span>Priority attention needed</span></>}
          icon={AlertCircle}
          iconClass="text-red-600"
          iconBackground="bg-red-50"
          valueClass="text-red-700"
        />
        <SummaryCard
          label="Pending complaint"
          value={pendingComplaintCount}
          helper={<><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /><span>Awaiting customer response</span></>}
          icon={AlertTriangle}
          iconClass="text-amber-600"
          iconBackground="bg-amber-50"
          valueClass="text-amber-700"
        />
        <SummaryCard
          label="Resolved"
          value={summary?.closed || 0}
          helper={<><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /><span>Successfully closed</span></>}
          icon={CheckCircle2}
          iconClass="text-emerald-600"
          iconBackground="bg-emerald-50"
          valueClass="text-emerald-700"
        />
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-base font-bold text-gray-950">Service tickets</h2>
                  <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{calls?.length ?? 0} tickets</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">Review ownership, priority, status, and next scheduled visit</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {hasFilters ? "Filtered tickets" : "All tickets"}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Search service tickets"
                placeholder="Search customer, ticket, phone, or issue…"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <select
                aria-label="Filter service tickets by status"
                className="h-10 w-full min-w-44 appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="pending_complaint">Pending complaint</option>
                <option value="closed">Closed</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌄</span>
            </div>
            <button
              type="button"
              onClick={() => { setSearch(""); setStatusFilter(""); }}
              disabled={!hasFilters}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                <th className="px-5 py-3.5">Ticket / Customer</th>
                <th className="px-5 py-3.5">Issue</th>
                <th className="px-5 py-3.5">Engineer</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <TableSkeleton columns={6} />
              ) : calls?.length === 0 ? (
                <EmptyTableState
                  colSpan={6}
                  title="No service tickets found"
                  description={hasFilters ? "Try clearing a filter or searching for another ticket." : "New customer complaints and service requests will appear here."}
                  action={hasFilters ? <button type="button" onClick={() => { setSearch(""); setStatusFilter(""); }} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
                />
              ) : (
                visibleCalls.map((call) => {
                  const status = STATUS_META[call.status as TicketStatus] ?? STATUS_META.open;
                  const priority = PRIORITY_META[call.priority as TicketPriority] ?? PRIORITY_META.medium;
                  return (
                    <tr key={call.id} className="group transition-colors hover:bg-amber-50/20">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Wrench className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-[11px] font-bold tracking-wide text-primary">SRV-{call.id.toString().padStart(4, "0")}</p>
                            <p className="mt-1 font-semibold text-gray-950">{call.customerName}</p>
                            <div className="mt-1.5 flex max-w-[220px] flex-col gap-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{call.customerPhone}</span>
                              {call.address && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{call.address}</span></span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[230px] px-5 py-4">
                        <p className="line-clamp-2 font-medium leading-5 text-gray-700">{call.issueDescription}</p>
                        {call.hsnCode && <p className="mt-2 font-mono text-[11px] text-gray-400">HSN: {call.hsnCode}</p>}
                      </td>
                      <td className="px-5 py-4">
                        {call.assignedEngineer ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{call.assignedEngineer.name.charAt(0)}</div>
                            <span className="max-w-[125px] truncate text-sm font-medium text-gray-700">{call.assignedEngineer.name}</span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs italic text-gray-400"><User className="h-3.5 w-3.5" />Unassigned</span>
                        )}
                        {call.scheduledDate && call.status !== "closed" && (
                          <span className="mt-2 flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays className="h-3.5 w-3.5 text-gray-400" />{format(new Date(call.scheduledDate), "MMM d, yyyy")}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priority.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />{priority.label}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={() => setUpdateTarget(call.id)} className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:border-gray-200 hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                          Update <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-100 md:hidden">
          {isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-xl bg-gray-100" />)}</div>
          ) : calls?.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">{hasFilters ? "No tickets match these filters." : "No service tickets yet."}</div>
          ) : (
            visibleCalls.map((call) => {
              const status = STATUS_META[call.status as TicketStatus] ?? STATUS_META.open;
              const priority = PRIORITY_META[call.priority as TicketPriority] ?? PRIORITY_META.medium;
              return (
                <div key={call.id} className="space-y-4 p-4 transition-colors hover:bg-amber-50/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Wrench className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] font-bold tracking-wide text-primary">SRV-{call.id.toString().padStart(4, "0")}</p>
                        <p className="mt-1 truncate font-semibold text-gray-950">{call.customerName}</p>
                      </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
                  </div>
                  <div className="rounded-lg bg-gray-50/80 p-3">
                    <p className="line-clamp-3 text-sm font-medium leading-5 text-gray-700">{call.issueDescription}</p>
                    {call.hsnCode && <p className="mt-2 font-mono text-[11px] text-gray-400">HSN: {call.hsnCode}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Priority</p><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priority.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />{priority.label}</span></div>
                    <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Engineer</p><p className="flex items-center gap-1.5 truncate text-gray-600">{call.assignedEngineer ? <><UserRoundCheck className="h-3.5 w-3.5 text-indigo-500" />{call.assignedEngineer.name}</> : <><User className="h-3.5 w-3.5 text-gray-400" />Unassigned</>}</p></div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                    <div className="min-w-0 space-y-1">
                      <span className="flex items-center gap-1.5 truncate"><Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />{call.customerPhone}</span>
                      {call.scheduledDate && call.status !== "closed" && <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-gray-400" />{format(new Date(call.scheduledDate), "MMM d, yyyy")}</span>}
                    </div>
                    <button type="button" onClick={() => setUpdateTarget(call.id)} className="ml-3 inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline">Update <ChevronRight className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <PaginationBar
          page={page}
          pageCount={pageCount}
          total={calls?.length ?? 0}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Modals */}
      {showLogModal && (
        <LogComplaintModal
          engineers={engineers}
          onClose={() => setShowLogModal(false)}
          onSubmit={handleLog}
          isPending={createCall.isPending}
        />
      )}
      {updateTarget !== null && updateTargetCall && (
        <UpdateModal
          callId={updateTarget}
          initial={{
            status: updateTargetCall.status,
            assignedEngineerId: updateTargetCall.assignedEngineerId,
            hsnCode: updateTargetCall.hsnCode,
            closureNotes: updateTargetCall.closureNotes,
            scheduledDate: updateTargetCall.scheduledDate,
          }}
          engineers={engineers}
          onClose={() => setUpdateTarget(null)}
          onSubmit={handleUpdate}
          isPending={updateCall.isPending}
        />
      )}
    </div>
  );
}
