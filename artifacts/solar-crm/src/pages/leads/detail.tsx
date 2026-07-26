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
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Phone, MapPin, Mail, User, Briefcase,
  CalendarClock, CheckCircle2, MessageSquare,
  Activity as ActivityIcon, X, Lock, Clock,
  Send, ArrowRightLeft, Zap, StickyNote, Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Stage definitions ────────────────────────────────────────────────────────

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
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none";

// ─── Avatar color helper ───────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.toUpperCase().charCodeAt(0) - 65) % AVATAR_COLORS.length];
}

// ─── Timeline action → icon / color ──────────────────────────────────────────

type ActionMeta = { icon: React.ElementType; dotCls: string; trackCls: string; labelCls: string };

function getActionMeta(action: string): ActionMeta {
  const a = action.toLowerCase();
  if (a.includes("creat") || a === "lead_created")
    return { icon: Zap, dotCls: "border-emerald-400 bg-emerald-50", trackCls: "text-emerald-700 bg-emerald-50 ring-emerald-200/60", labelCls: "text-emerald-700" };
  if (a.includes("stage") || a.includes("status"))
    return { icon: ArrowRightLeft, dotCls: "border-amber-400 bg-amber-50", trackCls: "text-amber-700 bg-amber-50 ring-amber-200/60", labelCls: "text-amber-700" };
  if (a.includes("note"))
    return { icon: StickyNote, dotCls: "border-blue-400 bg-blue-50", trackCls: "text-blue-700 bg-blue-50 ring-blue-200/60", labelCls: "text-blue-700" };
  if (a.includes("convert") || a.includes("order") || a.includes("won"))
    return { icon: Star, dotCls: "border-primary bg-primary/10", trackCls: "text-primary bg-primary/5 ring-primary/20", labelCls: "text-primary" };
  if (a.includes("followup") || a.includes("follow_up") || a.includes("follow-up"))
    return { icon: CalendarClock, dotCls: "border-purple-400 bg-purple-50", trackCls: "text-purple-700 bg-purple-50 ring-purple-200/60", labelCls: "text-purple-700" };
  return { icon: Clock, dotCls: "border-gray-300 bg-gray-50", trackCls: "text-gray-600 bg-gray-50 ring-gray-200/60", labelCls: "text-gray-600" };
}

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

  const canSubmit = !!form.advancePaymentAmount && !isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-900">Punch Order</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Confirm advance payment to create the project
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          {/* Project details */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Project Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">
                  Capacity (kW)
                </label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.systemCapacityKw}
                  onChange={set("systemCapacityKw")}
                  placeholder="e.g. 5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">
                  Total Value (₹)
                </label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.totalAmount}
                  onChange={set("totalAmount")}
                  placeholder="e.g. 250000"
                />
              </div>
            </div>
          </div>

          {/* Advance payment */}
          <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
              Advance Payment <span className="normal-case font-normal text-amber-500">*required</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">Amount (₹)</label>
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
                <select
                  className={selectCls}
                  value={form.advancePaymentMode}
                  onChange={set("advancePaymentMode")}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
            </div>
          </div>

          {/* Engineer */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">Assign Engineer</label>
            <select
              className={selectCls}
              value={form.assignedEngineerId}
              onChange={set("assignedEngineerId")}
            >
              <option value="">— Unassigned —</option>
              {engineers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onSubmit(form)}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

  const updateLead    = useUpdateLead();
  const convertLead   = useConvertLead();
  const createNote    = useCreateLeadNote();
  const updateFollowup = useUpdateLeadFollowup();

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading || !lead) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse pb-12">
        {/* Breadcrumb */}
        <div className="h-4 w-28 rounded-full bg-gray-200" />
        {/* Title */}
        <div className="h-8 w-56 rounded-lg bg-gray-200" />
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            {/* Main card */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <div className="border-b border-gray-100 p-5">
                <div className="h-6 w-48 rounded-lg bg-gray-200" />
                <div className="mt-3 flex gap-4">
                  <div className="h-4 w-24 rounded-full bg-gray-100" />
                  <div className="h-4 w-32 rounded-full bg-gray-100" />
                </div>
              </div>
              <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-5">
                <div className="flex gap-2">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-8 w-24 rounded-full bg-gray-200" />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-16 rounded-full bg-gray-200" />
                    <div className="h-4 w-24 rounded-full bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>
            {/* Notes card */}
            <div className="h-48 rounded-xl border border-gray-100 bg-white" />
          </div>
          <div className="w-full lg:w-80">
            <div className="h-72 rounded-xl border border-gray-100 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  const isAdmin    = user?.role === "admin";
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
        systemCapacityKw:     form.systemCapacityKw ? Number(form.systemCapacityKw) : undefined,
        totalAmount:          form.totalAmount ? Number(form.totalAmount) : undefined,
        assignedEngineerId:   form.assignedEngineerId ? Number(form.assignedEngineerId) : undefined,
        advancePaymentAmount: form.advancePaymentAmount ? Number(form.advancePaymentAmount) : undefined,
        advancePaymentMode:   form.advancePaymentMode || undefined,
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
    <div className="mx-auto max-w-6xl space-y-5 pb-12">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/leads"
          className="flex items-center gap-1.5 text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leads
        </Link>
        <span className="text-gray-300">/</span>
        <span className="max-w-[200px] truncate font-medium text-gray-900">
          {lead.customerName}
        </span>
      </nav>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">

          {/* ── Main info card ──────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">

            {/* Card header: name + action CTA */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <h1 className="font-heading text-[1.6rem] font-bold tracking-tight text-gray-900 leading-tight">
                  {lead.customerName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-600">
                  <a
                    href={`tel:${lead.mobileNumber}`}
                    className="flex items-center gap-1.5 transition-colors hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {lead.mobileNumber}
                  </a>
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 transition-colors hover:text-primary"
                    >
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      {lead.email}
                    </a>
                  )}
                  {lead.city && (
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {lead.city}
                    </span>
                  )}
                </div>
              </div>

              {/* Action button / badge */}
              <div className="flex-shrink-0">
                {lead.convertedProjectId ? (
                  <Link
                    href={`/projects/${lead.convertedProjectId}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200/60 transition-colors hover:bg-emerald-200 active:scale-[0.98]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    View Project
                  </Link>
                ) : canConvert && isAdmin ? (
                  <button
                    onClick={() => setShowConvertModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
                  >
                    <Briefcase className="h-4 w-4" />
                    Punch Order
                  </button>
                ) : canConvert && !isAdmin ? (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 ring-1 ring-amber-200/40">
                    <Lock className="h-4 w-4" />
                    Awaiting Admin
                  </div>
                ) : (
                  <div className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400">
                    <Briefcase className="h-4 w-4" />
                    Convert to Project
                  </div>
                )}
              </div>
            </div>

            {/* Stage stepper */}
            <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-4 sm:px-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Pipeline Stage
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((stage, idx) => {
                  const isCurrent = lead.stage === stage.id;
                  const isPast    = currentStageIdx > idx;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                      disabled={!!lead.convertedProjectId}
                      title={stage.label}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : isPast
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50",
                        lead.convertedProjectId
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                      ].join(" ")}
                    >
                      {/* Step circle */}
                      <span
                        className={[
                          "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                          isCurrent
                            ? "bg-white/20 text-white"
                            : isPast
                            ? "bg-emerald-200/60 text-emerald-700"
                            : "bg-gray-100 text-gray-500",
                        ].join(" ")}
                      >
                        {isPast ? <CheckCircle2 className="h-2.5 w-2.5" /> : idx + 1}
                      </span>
                      {stage.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-5 px-5 py-5 sm:grid-cols-4 sm:px-6">
              <InfoField label="Lead Source">
                <span className="capitalize">{lead.leadSource?.replace(/_/g, " ") || "Direct"}</span>
              </InfoField>

              <InfoField label="Assigned Sales Rep">
                {lead.assignedSalesPerson?.name ? (
                  <div className="flex items-center gap-2">
                    <div
                      className={[
                        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                        avatarColor(lead.assignedSalesPerson.name),
                      ].join(" ")}
                    >
                      {lead.assignedSalesPerson.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{lead.assignedSalesPerson.name}</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 italic text-gray-400">
                    <User className="h-3.5 w-3.5" />
                    Unassigned
                  </span>
                )}
              </InfoField>

              <InfoField label="Address">
                {lead.address ? (
                  <span className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <span>{lead.address}{lead.city ? `, ${lead.city}` : ""}</span>
                  </span>
                ) : (
                  <span className="italic text-gray-400">Not provided</span>
                )}
              </InfoField>

              <InfoField label="Added">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  {lead.createdAt
                    ? format(new Date(lead.createdAt), "MMM d, yyyy")
                    : "—"}
                </span>
              </InfoField>
            </div>
          </div>

          {/* ── Follow-up card ─────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
              <CalendarClock className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800">Follow-up</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={lead.followUpDate ? lead.followUpDate.split("T")[0] : ""}
                  onChange={(e) =>
                    handleUpdateFollowup(
                      new Date(e.target.value).toISOString(),
                      lead.followUpStatus ?? "pending"
                    )
                  }
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Follow-up Status
                </label>
                <select
                  className={selectCls}
                  value={lead.followUpStatus ?? "pending"}
                  onChange={(e) =>
                    handleUpdateFollowup(
                      lead.followUpDate ?? new Date().toISOString(),
                      e.target.value
                    )
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="done">Done</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="not_reachable">Not Reachable</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Notes & Communication card ─────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800">Notes &amp; Communication</h2>
              {notes && notes.length > 0 && (
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {notes.length}
                </span>
              )}
            </div>

            <div className="p-5">
              {/* Compose area */}
              <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50/40 p-3 focus-within:border-primary/40 focus-within:bg-white/80 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <textarea
                  rows={3}
                  placeholder="Add a note about this lead…"
                  className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleAddNote();
                  }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    ⌘ + Enter to save
                  </span>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || createNote.isPending}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sidebar px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-sidebar/90 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    {createNote.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {/* Note list */}
              {notes && notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => {
                    const authorName = note.createdBy?.name || "System";
                    const initials   = authorName.charAt(0).toUpperCase();
                    const color      = avatarColor(authorName);
                    return (
                      <div
                        key={note.id}
                        className="group relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm transition-colors hover:border-gray-200 hover:bg-white"
                      >
                        {/* Left accent bar */}
                        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />

                        <div className="mb-2 flex items-center justify-between gap-3 pl-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={[
                                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                                color,
                              ].join(" ")}
                            >
                              {initials}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900 leading-tight">
                                {authorName}
                              </p>
                              <p className="text-[10px] text-gray-400 leading-tight">
                                {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <time
                            className="flex-shrink-0 text-[10px] text-gray-400"
                            title={format(new Date(note.createdAt), "PPpp")}
                          >
                            {format(new Date(note.createdAt), "MMM d, h:mm a")}
                          </time>
                        </div>
                        <p className="whitespace-pre-wrap pl-2 leading-relaxed text-gray-700">
                          {note.note}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No notes yet</p>
                  <p className="text-xs text-gray-400">Add the first note above.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column: Timeline ───────────────────────────────────────── */}
        <div className="w-full lg:w-[22rem] lg:flex-shrink-0">
          {/* Sticky wrapper on desktop */}
          <div className="lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
                <ActivityIcon className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800">Activity History</h2>
                {timeline && timeline.length > 0 && (
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                    {timeline.length}
                  </span>
                )}
              </div>

              {/* Timeline body — scrollable if many items */}
              <div className="max-h-[560px] overflow-y-auto overscroll-contain p-5">
                {(!timeline || timeline.length === 0) ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <ActivityIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No activity yet</p>
                    <p className="text-xs text-gray-400">Actions on this lead will appear here.</p>
                  </div>
                ) : (
                  <ol className="relative space-y-0 border-l-2 border-gray-100 pl-5">
                    {timeline.map((activity, i) => {
                      const meta = getActionMeta(activity.action);
                      const Icon = meta.icon;
                      const isLast = i === timeline.length - 1;
                      return (
                        <li key={activity.id} className={["relative", isLast ? "pb-0" : "pb-5"].join(" ")}>
                          {/* Dot */}
                          <span
                            className={[
                              "absolute -left-[1.55rem] top-[2px] flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded-full border-2",
                              meta.dotCls,
                            ].join(" ")}
                          >
                            <Icon className="h-2.5 w-2.5" style={{ color: "currentColor" }} />
                          </span>

                          {/* Action label badge */}
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                              meta.trackCls,
                            ].join(" ")}
                          >
                            {activity.action.replace(/_/g, " ")}
                          </span>

                          {/* Description */}
                          {activity.description && (
                            <p className="mt-1 text-[13px] leading-snug text-gray-700">
                              {activity.description}
                            </p>
                          )}

                          {/* Timestamp */}
                          <p className="mt-1 text-[10px] text-gray-400">
                            <time
                              title={format(new Date(activity.createdAt), "PPpp")}
                            >
                              {formatDistanceToNow(new Date(activity.createdAt), {
                                addSuffix: true,
                              })}
                            </time>
                            {" · "}
                            {format(new Date(activity.createdAt), "MMM d")}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
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
