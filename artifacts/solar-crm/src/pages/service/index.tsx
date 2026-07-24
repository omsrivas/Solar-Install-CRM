import { useState } from "react";
import {
  useListServiceCalls, useGetServiceSummary,
  useCreateServiceCall, useUpdateServiceCall,
  useListUsers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, AlertCircle, CheckCircle2, Clock, Wrench, Phone, MapPin, Plus, X, User, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Log New Complaint</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Customer Name *</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.customerName} onChange={set("customerName")} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
              <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.customerPhone} onChange={set("customerPhone")} placeholder="Mobile number" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
            <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.address} onChange={set("address")} placeholder="Installation address" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Issue Description *</label>
            <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={3} value={form.issueDescription} onChange={set("issueDescription")} placeholder="Describe the issue in detail..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white" value={form.priority} onChange={set("priority")}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Scheduled Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.scheduledDate} onChange={set("scheduledDate")} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Engineer</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white" value={form.assignedEngineerId} onChange={set("assignedEngineerId")}>
              <option value="">Unassigned</option>
              {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!form.customerName || !form.customerPhone || !form.issueDescription || isPending}
            onClick={() => onSubmit(form)}
            className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Logging..." : "Log Complaint"}
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Update Ticket SRV-{callId.toString().padStart(4, "0")}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white" value={form.status} onChange={set("status")}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_complaint">Pending Complaint</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Engineer</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white" value={form.assignedEngineerId} onChange={set("assignedEngineerId")}>
              <option value="">Unassigned</option>
              {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Scheduled Date</label>
            <input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.scheduledDate} onChange={set("scheduledDate")} />
          </div>
          {isClosing && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">HSN Code <span className="text-gray-400">(for closure)</span></label>
                <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.hsnCode} onChange={set("hsnCode")} placeholder="e.g. 85076000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Closure Notes</label>
                <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={3} value={form.closureNotes} onChange={set("closureNotes")} placeholder="Describe work done and resolution..." />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            disabled={isPending}
            onClick={() => onSubmit(form)}
            className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Changes"}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Service & Maintenance</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer complaints and service requests</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Log Complaint
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Urgent</span>
          </div>
          <p className="text-3xl font-bold text-red-600 mt-2">{summary?.urgent || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Pending Complaint</span>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-2">{pendingComplaintCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Resolved</span>
          </div>
          <p className="text-3xl font-bold text-green-600 mt-2">{summary?.closed || 0}</p>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Service Tickets</h2>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_complaint">Pending Complaint</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-gray-50/30">
                <th className="px-6 py-4 font-semibold">Ticket / Customer</th>
                <th className="px-6 py-4 font-semibold">Issue</th>
                <th className="px-6 py-4 font-semibold">Engineer</th>
                <th className="px-6 py-4 font-semibold">Priority</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 animate-pulse">Loading service tickets...</td></tr>
              ) : calls?.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No tickets found.</td></tr>
              ) : (
                calls?.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-primary mb-1">SRV-{call.id.toString().padStart(4, "0")}</div>
                      <div className="font-semibold text-gray-900">{call.customerName}</div>
                      <div className="text-gray-500 flex flex-col gap-0.5 mt-1 text-xs">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {call.customerPhone}</span>
                        {call.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> <span className="truncate w-40">{call.address}</span></span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 max-w-[200px]">
                      <p className="line-clamp-2">{call.issueDescription}</p>
                      {call.hsnCode && (
                        <p className="text-xs text-gray-400 mt-1 font-mono">HSN: {call.hsnCode}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {call.assignedEngineer ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {call.assignedEngineer.name.charAt(0)}
                          </div>
                          <span className="text-gray-700 text-sm font-medium truncate">{call.assignedEngineer.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic flex items-center gap-1"><User className="h-3 w-3" />Unassigned</span>
                      )}
                      {call.scheduledDate && call.status !== "closed" && (
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(call.scheduledDate), "MMM d")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                        call.priority === "urgent" ? "bg-red-100 text-red-700" :
                        call.priority === "high" ? "bg-orange-100 text-orange-700" :
                        call.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {call.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex self-start items-center px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wider ${
                        call.status === "open" ? "border-amber-200 text-amber-700 bg-amber-50" :
                        call.status === "in_progress" ? "border-blue-200 text-blue-700 bg-blue-50" :
                        call.status === "pending_complaint" ? "border-orange-200 text-orange-700 bg-orange-50" :
                        "border-green-200 text-green-700 bg-green-50"
                      }`}>
                        {call.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setUpdateTarget(call.id)}
                        className="text-sm font-medium text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
