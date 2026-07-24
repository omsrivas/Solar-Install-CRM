import { useState } from "react";
import { useRoute, Link } from "wouter";
import { 
  useGetLead, getGetLeadQueryKey, 
  useUpdateLead, useConvertLead,
  useListLeadNotes, getListLeadNotesQueryKey, useCreateLeadNote,
  useGetLeadTimeline, getGetLeadTimelineQueryKey, useUpdateLeadFollowup,
  useGetMe, getGetMeQueryKey, useListUsers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, Phone, MapPin, Mail, User, Briefcase, 
  CalendarClock, Save, CheckCircle2, MessageSquare,
  Activity as ActivityIcon, X, Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STAGES = [
  { id: "lead", label: "New Lead" },
  { id: "tele_calling", label: "Tele Calling" },
  { id: "site_visit", label: "Site Visit" },
  { id: "quotation_sent", label: "Quotation Sent" },
  { id: "negotiation", label: "Negotiation" },
  { id: "order_owned", label: "Order Won" },
];

// ─── Convert Modal (Admin only) ───────────────────────────────────────────────

type ConvertForm = {
  systemCapacityKw: string;
  totalAmount: string;
  advancePaymentAmount: string;
  advancePaymentMode: string;
  assignedEngineerId: string;
};

function ConvertModal({
  engineers,
  onClose,
  onSubmit,
  isPending,
}: {
  engineers: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (form: ConvertForm) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<ConvertForm>({
    systemCapacityKw: "",
    totalAmount: "",
    advancePaymentAmount: "",
    advancePaymentMode: "Cash",
    assignedEngineerId: "",
  });

  const set = (field: keyof ConvertForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Punch Order</h2>
            <p className="text-xs text-gray-500 mt-0.5">Confirm advance payment to create project</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">System Capacity (kW)</label>
              <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.systemCapacityKw} onChange={set("systemCapacityKw")} placeholder="e.g. 5" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Total Project Value (₹)</label>
              <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.totalAmount} onChange={set("totalAmount")} placeholder="e.g. 250000" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Advance Payment</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₹) *</label>
                <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.advancePaymentAmount} onChange={set("advancePaymentAmount")} placeholder="e.g. 50000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Mode</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white" value={form.advancePaymentMode} onChange={set("advancePaymentMode")}>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
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
            disabled={!form.advancePaymentAmount || isPending}
            onClick={() => onSubmit(form)}
            className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Punch Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Lead Detail ─────────────────────────────────────────────────────────

export function LeadDetail() {
  const [, params] = useRoute("/leads/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newNote, setNewNote] = useState("");
  const [showConvertModal, setShowConvertModal] = useState(false);

  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: lead, isLoading } = useGetLead(id, { 
    query: { enabled: !!id, queryKey: getGetLeadQueryKey(id) } 
  });
  const { data: notes } = useListLeadNotes(id, {
    query: { enabled: !!id, queryKey: getListLeadNotesQueryKey(id) }
  });
  const { data: timeline } = useGetLeadTimeline(id, {
    query: { enabled: !!id, queryKey: getGetLeadTimelineQueryKey(id) }
  });
  const { data: engineerList } = useListUsers({ role: "engineer" });
  const engineers = engineerList ?? [];

  const updateLead = useUpdateLead();
  const convertLead = useConvertLead();
  const createNote = useCreateLeadNote();
  const updateFollowup = useUpdateLeadFollowup();

  if (isLoading || !lead) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading lead details...</div>;
  }

  const isAdmin = user?.role === "admin";
  const canConvert = lead.stage === "order_owned" && !lead.convertedProjectId;

  const handleStageChange = (newStage: string) => {
    updateLead.mutate({ id, data: { stage: newStage } }, {
      onSuccess: (updated) => {
        toast({ title: "Stage updated successfully" });
        queryClient.setQueryData(getGetLeadQueryKey(id), updated);
      },
      onError: () => {
        toast({ title: "Failed to update stage", variant: "destructive" });
      },
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createNote.mutate({ id, data: { note: newNote } }, {
      onSuccess: () => {
        setNewNote("");
        toast({ title: "Note added" });
        queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}/notes`] });
      },
      onError: () => {
        toast({ title: "Failed to add note", variant: "destructive" });
      },
    });
  };

  const handleUpdateFollowup = (date: string, status: string) => {
    updateFollowup.mutate({ id, data: { followUpDate: date, followUpStatus: status } }, {
      onSuccess: () => {
        toast({ title: "Follow-up updated" });
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Failed to update follow-up", variant: "destructive" });
      },
    });
  };

  const handleConvert = (form: ConvertForm) => {
    convertLead.mutate({
      id,
      data: {
        systemCapacityKw: form.systemCapacityKw ? Number(form.systemCapacityKw) : undefined,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
        assignedEngineerId: form.assignedEngineerId ? Number(form.assignedEngineerId) : undefined,
        advancePaymentAmount: form.advancePaymentAmount ? Number(form.advancePaymentAmount) : undefined,
        advancePaymentMode: form.advancePaymentMode || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Order punched — project created!" });
        setShowConvertModal(false);
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? "Conversion failed";
        toast({ title: msg, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 text-sm mb-4">
        <Link href="/leads" className="text-gray-500 hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{lead.customerName}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Details */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{lead.customerName}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-gray-400" /> {lead.mobileNumber}</span>
                  {lead.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4 text-gray-400" /> {lead.email}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {lead.convertedProjectId ? (
                  <Link 
                    href={`/projects/${lead.convertedProjectId}`}
                    className="bg-green-100 text-green-700 px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-green-200 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    View Project
                  </Link>
                ) : canConvert && isAdmin ? (
                  <button 
                    onClick={() => setShowConvertModal(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
                  >
                    <Briefcase className="h-4 w-4" />
                    Punch Order
                  </button>
                ) : canConvert && !isAdmin ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-md text-sm flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Awaiting Admin Approval
                  </div>
                ) : (
                  <div className="bg-gray-100 text-gray-400 px-4 py-2 rounded-md text-sm flex items-center gap-2 cursor-not-allowed">
                    <Briefcase className="h-4 w-4" />
                    Convert to Project
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-gray-50/50">
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Pipeline Stage</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((stage, idx) => {
                    const isCurrent = lead.stage === stage.id;
                    const isPast = STAGES.findIndex(s => s.id === lead.stage) > idx;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => handleStageChange(stage.id)}
                        disabled={!!lead.convertedProjectId}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                          isCurrent ? "bg-primary text-primary-foreground border-primary" : 
                          isPast ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" :
                          "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        } ${lead.convertedProjectId ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {stage.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Location</label>
                  <p className="text-gray-900 flex items-start gap-1">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>{lead.address || "No address"}<br/>{lead.city || ""}</span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Assigned Sales Rep</label>
                  <p className="text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {lead.assignedSalesPerson?.name || "Unassigned"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Lead Source</label>
                  <p className="text-gray-900">{lead.leadSource || "Direct"}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Follow-up Date</label>
                  <input 
                    type="date" 
                    value={lead.followUpDate ? lead.followUpDate.split("T")[0] : ""}
                    onChange={(e) => handleUpdateFollowup(new Date(e.target.value).toISOString(), lead.followUpStatus)}
                    className="h-9 border border-input bg-white rounded-md px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-800">Notes & Communication</h2>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-6">
                <input 
                  type="text"
                  placeholder="Add a note about this lead..."
                  className="flex-1 h-9 border border-input bg-white rounded-md px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                />
                <button 
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || createNote.isPending}
                  className="inline-flex items-center justify-center h-9 px-4 bg-sidebar hover:bg-sidebar/90 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                >
                  Save Note
                </button>
              </div>

              <div className="space-y-4">
                {notes?.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-900">{note.createdBy?.name || "System"}</span>
                      <span className="text-xs text-gray-500">{format(new Date(note.createdAt), "MMM d, h:mm a")}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
                  </div>
                ))}
                {notes?.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-4">No notes yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
              <ActivityIcon className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-800">Activity History</h2>
            </div>
            <div className="p-4">
              <div className="relative border-l border-gray-200 ml-3 space-y-6 py-2">
                {timeline?.map((activity) => (
                  <div key={activity.id} className="relative pl-6">
                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white border-2 border-primary"></span>
                    <p className="text-sm font-medium text-gray-900 capitalize">{activity.action.replace(/_/g, " ")}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{format(new Date(activity.createdAt), "MMM d, h:mm a")}</p>
                  </div>
                ))}
                {(!timeline || timeline.length === 0) && (
                  <p className="text-sm text-gray-500 pl-6">No activity recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && (
        <ConvertModal
          engineers={engineers}
          onClose={() => setShowConvertModal(false)}
          onSubmit={handleConvert}
          isPending={convertLead.isPending}
        />
      )}
    </div>
  );
}
