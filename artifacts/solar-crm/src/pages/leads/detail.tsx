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
  CalendarClock, CheckCircle2, MessageSquare,
  Activity as ActivityIcon, X, Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STAGES = [
  { id: "lead",           label: "New Lead" },
  { id: "tele_calling",   label: "Tele Calling" },
  { id: "site_visit",     label: "Site Visit" },
  { id: "quotation_sent", label: "Quotation Sent" },
  { id: "negotiation",    label: "Negotiation" },
  { id: "order_owned",    label: "Order Won" },
];

// ─── Shared form input classes ─────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const selectCls =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

// ─── Convert Modal ────────────────────────────────────────────────────────────

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

  const set =
    (field: keyof ConvertForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal header */}
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-900">Punch Order</h2>
            <p className="mt-0.5 text-xs text-gray-500">Confirm advance payment to create project</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Modal body */}
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">System Capacity (kW)</label>
              <input
                type="number"
                className={inputCls}
                value={form.systemCapacityKw}
                onChange={set("systemCapacityKw")}
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Total Project Value (₹)</label>
              <input
                type="number"
                className={inputCls}
                value={form.totalAmount}
                onChange={set("totalAmount")}
                placeholder="e.g. 250000"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Advance Payment</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">Amount (₹) *</label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.advancePaymentAmount}
                  onChange={set("advancePaymentAmount")}
                  placeholder="e.g. 50000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">Payment Mode</label>
                <select className={selectCls} value={form.advancePaymentMode} onChange={set("advancePaymentMode")}>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">Assign Engineer</label>
            <select className={selectCls} value={form.assignedEngineerId} onChange={set("assignedEngineerId")}>
              <option value="">Unassigned</option>
              {engineers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex gap-3 border-t border-gray-100 p-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!form.advancePaymentAmount || isPending}
            onClick={() => onSubmit(form)}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Punch Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Info field ───────────────────────────────────────────────────────────────

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
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
    query: { enabled: !!id, queryKey: getGetLeadQueryKey(id) },
  });
  const { data: notes } = useListLeadNotes(id, {
    query: { enabled: !!id, queryKey: getListLeadNotesQueryKey(id) },
  });
  const { data: timeline } = useGetLeadTimeline(id, {
    query: { enabled: !!id, queryKey: getGetLeadTimelineQueryKey(id) },
  });
  const { data: engineerList } = useListUsers({ role: "engineer" });
  const engineers = engineerList ?? [];

  const updateLead   = useUpdateLead();
  const convertLead  = useConvertLead();
  const createNote   = useCreateLeadNote();
  const updateFollowup = useUpdateLeadFollowup();

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading || !lead) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse" aria-label="Loading lead details">
        <div className="h-5 w-36 rounded-lg bg-gray-200" />
        <div className="h-9 w-64 rounded-lg bg-gray-200" />
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex-1 space-y-5">
            <div className="h-52 rounded-xl border border-gray-100 bg-white" />
            <div className="h-40 rounded-xl border border-gray-100 bg-white" />
          </div>
          <div className="w-full lg:w-80">
            <div className="h-64 rounded-xl border border-gray-100 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  const isAdmin   = user?.role === "admin";
  const canConvert = lead.stage === "order_owned" && !lead.convertedProjectId;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStageChange = (newStage: string) => {
    updateLead.mutate({ id, data: { stage: newStage } }, {
      onSuccess: (updated) => {
        toast({ title: "Stage updated successfully" });
        queryClient.setQueryData(getGetLeadQueryKey(id), updated);
      },
      onError: () => toast({ title: "Failed to update stage", variant: "destructive" }),
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
      onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
    });
  };

  const handleUpdateFollowup = (date: string, status: string) => {
    updateFollowup.mutate({ id, data: { followUpDate: date, followUpStatus: status } }, {
      onSuccess: () => {
        toast({ title: "Follow-up updated" });
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
      },
      onError: () => toast({ title: "Failed to update follow-up", variant: "destructive" }),
    });
  };

  const handleConvert = (form: ConvertForm) => {
    convertLead.mutate({
      id,
      data: {
        systemCapacityKw:      form.systemCapacityKw ? Number(form.systemCapacityKw) : undefined,
        totalAmount:           form.totalAmount ? Number(form.totalAmount) : undefined,
        assignedEngineerId:    form.assignedEngineerId ? Number(form.assignedEngineerId) : undefined,
        advancePaymentAmount:  form.advancePaymentAmount ? Number(form.advancePaymentAmount) : undefined,
        advancePaymentMode:    form.advancePaymentMode || undefined,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Order punched — project created!" });
        setShowConvertModal(false);
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? "Conversion failed";
        toast({ title: msg, variant: "destructive" });
      },
    });
  };

  const currentStageIdx = STAGES.findIndex((s) => s.id === lead.stage);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/leads"
          className="flex items-center gap-1.5 text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leads
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">{lead.customerName}</span>
      </nav>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── Left column ─────────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-5">

          {/* Main card */}
          <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
            {/* Card header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
                  {lead.customerName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {lead.mobileNumber}
                  </span>
                  {lead.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      {lead.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Action badge */}
              <div className="flex-shrink-0">
                {lead.convertedProjectId ? (
                  <Link
                    href={`/projects/${lead.convertedProjectId}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-200"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    View Project
                  </Link>
                ) : canConvert && isAdmin ? (
                  <button
                    onClick={() => setShowConvertModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Briefcase className="h-4 w-4" />
                    Punch Order
                  </button>
                ) : canConvert && !isAdmin ? (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                    <Lock className="h-4 w-4" />
                    Awaiting Admin Approval
                  </div>
                ) : (
                  <div className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400">
                    <Briefcase className="h-4 w-4" />
                    Convert to Project
                  </div>
                )}
              </div>
            </div>

            {/* Stage stepper */}
            <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-5 sm:px-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Pipeline Stage
              </p>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((stage, idx) => {
                  const isCurrent = lead.stage === stage.id;
                  const isPast    = currentStageIdx > idx;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                      disabled={!!lead.convertedProjectId}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : isPast
                          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      } ${lead.convertedProjectId ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          isCurrent ? "bg-white/20 text-white" : "bg-current/10"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      {stage.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-5 px-5 py-5 sm:grid-cols-4 sm:px-6">
              <InfoField label="Location">
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  <span>
                    {lead.address || "No address"}
                    {lead.city && <><br />{lead.city}</>}
                  </span>
                </div>
              </InfoField>

              <InfoField label="Assigned Sales Rep">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  {lead.assignedSalesPerson?.name || (
                    <span className="italic text-gray-400">Unassigned</span>
                  )}
                </div>
              </InfoField>

              <InfoField label="Lead Source">
                <span className="capitalize">{lead.leadSource || "Direct"}</span>
              </InfoField>

              <InfoField label="Follow-up Date">
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  <input
                    type="date"
                    value={lead.followUpDate ? lead.followUpDate.split("T")[0] : ""}
                    onChange={(e) =>
                      handleUpdateFollowup(
                        new Date(e.target.value).toISOString(),
                        lead.followUpStatus
                      )
                    }
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </InfoField>
            </div>
          </div>

          {/* Notes card */}
          <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800">Notes &amp; Communication</h2>
            </div>

            <div className="p-5">
              {/* Add note */}
              <div className="mb-5 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a note about this lead…"
                  className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || createNote.isPending}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-sidebar px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sidebar/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </button>
              </div>

              {/* Note list */}
              <div className="space-y-3">
                {notes?.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold uppercase text-primary">
                          {(note.createdBy?.name || "S").charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-900">
                          {note.createdBy?.name || "System"}
                        </span>
                      </div>
                      <span className="flex-shrink-0 text-xs text-gray-400">
                        {format(new Date(note.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-gray-700">{note.note}</p>
                  </div>
                ))}
                {notes?.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-400">
                    No notes yet. Add the first one above.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column: Timeline ─────────────────────────────────────────── */}
        <div className="w-full lg:w-80">
          <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
              <ActivityIcon className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800">Activity History</h2>
            </div>

            <div className="p-5">
              {(!timeline || timeline.length === 0) ? (
                <p className="py-6 text-center text-sm text-gray-400">No activity recorded.</p>
              ) : (
                <ol className="relative space-y-5 border-l-2 border-gray-100 pl-5">
                  {timeline.map((activity) => (
                    <li key={activity.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[1.45rem] top-[3px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-white" />
                      <p className="text-sm font-semibold capitalize text-gray-900">
                        {activity.action.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-600">{activity.description}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Convert modal */}
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
