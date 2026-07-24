import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetProject, getGetProjectQueryKey,
  useUpdateProject, useListPayments, getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, MapPin, Zap, User, Clock, CheckCircle2, IndianRupee,
  Truck, Wrench, FileText, Activity, Settings, Send, Search, Package,
  ClipboardList, Save, Lock, AlertCircle, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Stage definitions ─────────────────────────────────────────────────────────

const PROJECT_STAGES = [
  { id: "order_punched",     label: "Order Punched",     icon: Clock },
  { id: "pmsgy_registered",  label: "PMSGY Registered",  icon: FileText },
  { id: "discom_change",     label: "Discom Change",     icon: Activity },
  { id: "net_metering",      label: "Net Metering",      icon: Zap },
  { id: "material_supplied", label: "Material Supplied", icon: Package },
  { id: "ic_done",           label: "I&C Done",          icon: Wrench },
  { id: "quality_check",     label: "Quality Check",     icon: Search },
  { id: "meter_configured",  label: "Meter Configured",  icon: Settings },
  { id: "subsidy_submitted", label: "Subsidy Submitted", icon: Send },
  { id: "handover_done",     label: "Handover Done",     icon: Truck },
  { id: "completed",         label: "Completed",         icon: CheckCircle2 },
];

// ─── Shared classes ────────────────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-gray-50/80 disabled:text-gray-400";

// ─── Info field ────────────────────────────────────────────────────────────────

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

// ─── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Workflow Tracking ─────────────────────────────────────────────────────────

type TrackingFields = {
  pmsgyRegistrationNo: string;
  pmsgyRegistrationDate: string;
  discomChangeRefNo: string;
  discomChangeDate: string;
  netMeteringRefNo: string;
  netMeteringDate: string;
  meterSerialNo: string;
  subsidySubmissionRefNo: string;
  subsidySubmissionDate: string;
  documentHandoverDate: string;
  customerAcknowledgement: string;
};

const TRACKING_GROUPS: Array<{
  title: string;
  stage: string;
  accent: string;
  completedAccent: string;
  dotColor: string;
  fields: Array<{ label: string; key: keyof TrackingFields; type?: string; placeholder?: string }>;
}> = [
  {
    title: "PMSGY Registration",
    stage: "pmsgy_registered",
    accent: "border-sky-200/80 bg-sky-50/50",
    completedAccent: "border-emerald-200/80 bg-emerald-50/50",
    dotColor: "bg-sky-400",
    fields: [
      { label: "Registration No.",  key: "pmsgyRegistrationNo",   placeholder: "e.g. PMSGY-2024-XXXX" },
      { label: "Registration Date", key: "pmsgyRegistrationDate",  type: "date" },
    ],
  },
  {
    title: "Discom Change",
    stage: "discom_change",
    accent: "border-cyan-200/80 bg-cyan-50/50",
    completedAccent: "border-emerald-200/80 bg-emerald-50/50",
    dotColor: "bg-cyan-400",
    fields: [
      { label: "Reference No.", key: "discomChangeRefNo", placeholder: "e.g. DCC-XXXX" },
      { label: "Date",          key: "discomChangeDate",  type: "date" },
    ],
  },
  {
    title: "Net Metering",
    stage: "net_metering",
    accent: "border-teal-200/80 bg-teal-50/50",
    completedAccent: "border-emerald-200/80 bg-emerald-50/50",
    dotColor: "bg-teal-400",
    fields: [
      { label: "Reference No.", key: "netMeteringRefNo", placeholder: "e.g. NM-XXXX" },
      { label: "Date",          key: "netMeteringDate",  type: "date" },
    ],
  },
  {
    title: "Meter Configuration",
    stage: "meter_configured",
    accent: "border-violet-200/80 bg-violet-50/50",
    completedAccent: "border-emerald-200/80 bg-emerald-50/50",
    dotColor: "bg-violet-400",
    fields: [
      { label: "Meter Serial No.", key: "meterSerialNo", placeholder: "e.g. MTR-XXXXXXXX" },
    ],
  },
  {
    title: "Subsidy Submission",
    stage: "subsidy_submitted",
    accent: "border-indigo-200/80 bg-indigo-50/50",
    completedAccent: "border-emerald-200/80 bg-emerald-50/50",
    dotColor: "bg-indigo-400",
    fields: [
      { label: "Submission Ref. No.", key: "subsidySubmissionRefNo", placeholder: "e.g. SUB-XXXX" },
      { label: "Submission Date",     key: "subsidySubmissionDate",  type: "date" },
    ],
  },
  {
    title: "Document Handover",
    stage: "handover_done",
    accent: "border-purple-200/80 bg-purple-50/50",
    completedAccent: "border-emerald-200/80 bg-emerald-50/50",
    dotColor: "bg-purple-400",
    fields: [
      { label: "Handover Date", key: "documentHandoverDate", type: "date" },
    ],
  },
  {
    title: "Customer Acknowledgement",
    stage: "completed",
    accent: "border-rose-200/80 bg-rose-50/50",
    completedAccent: "border-emerald-200/80 bg-emerald-50/50",
    dotColor: "bg-rose-400",
    fields: [
      { label: "Acknowledgement / Signature Note", key: "customerAcknowledgement", placeholder: "Note or reference" },
    ],
  },
];

function WorkflowTracking({
  project,
  onSave,
  isSaving,
}: {
  project: Record<string, unknown>;
  onSave: (data: Partial<TrackingFields>) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<TrackingFields>({
    pmsgyRegistrationNo:    (project.pmsgyRegistrationNo    as string) ?? "",
    pmsgyRegistrationDate:  (project.pmsgyRegistrationDate  as string) ?? "",
    discomChangeRefNo:      (project.discomChangeRefNo      as string) ?? "",
    discomChangeDate:       (project.discomChangeDate       as string) ?? "",
    netMeteringRefNo:       (project.netMeteringRefNo       as string) ?? "",
    netMeteringDate:        (project.netMeteringDate        as string) ?? "",
    meterSerialNo:          (project.meterSerialNo          as string) ?? "",
    subsidySubmissionRefNo: (project.subsidySubmissionRefNo as string) ?? "",
    subsidySubmissionDate:  (project.subsidySubmissionDate  as string) ?? "",
    documentHandoverDate:   (project.documentHandoverDate   as string) ?? "",
    customerAcknowledgement:(project.customerAcknowledgement as string) ?? "",
  });

  const set = (field: keyof TrackingFields) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const currentIdx = PROJECT_STAGES.findIndex((s) => s.id === (project.stage as string));

  // Count complete groups
  const completedGroups = TRACKING_GROUPS.filter((g) =>
    g.fields.every((f) => !!form[f.key])
  ).length;
  const reachedGroups = TRACKING_GROUPS.filter((g) => {
    const stageIdx = PROJECT_STAGES.findIndex((s) => s.id === g.stage);
    return stageIdx <= currentIdx;
  }).length;

  return (
    <div className="p-5 sm:p-6">
      {/* Section header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-800">Workflow Tracking</h2>
          {/* Completion summary */}
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-500">
            {completedGroups} / {TRACKING_GROUPS.length} complete
          </span>
        </div>

        {/* Save — top shortcut (desktop) */}
        <button
          onClick={() => onSave(form)}
          disabled={isSaving}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "Saving…" : "Save Tracking"}
        </button>
      </div>

      {/* Reached-stage context */}
      {reachedGroups < TRACKING_GROUPS.length && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">{TRACKING_GROUPS.length - reachedGroups} sections</span>{" "}
            are locked — they unlock automatically as the project advances through workflow stages.
          </p>
        </div>
      )}

      {/* Tracking group grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TRACKING_GROUPS.map((group) => {
          const stageIdx  = PROJECT_STAGES.findIndex((s) => s.id === group.stage);
          const isReached = stageIdx <= currentIdx;
          const complete  = group.fields.every((f) => !!form[f.key]);

          // Pick border/bg based on state
          const cardCls = isReached
            ? complete
              ? "border-emerald-200/80 bg-emerald-50/40"
              : group.accent
            : "border-gray-200/60 bg-gray-50/40";

          return (
            <div
              key={group.title}
              className={`space-y-3.5 rounded-xl border p-4 transition-all ${cardCls} ${
                isReached ? "opacity-100" : "opacity-50"
              }`}
            >
              {/* Group header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Color dot */}
                  <span
                    className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
                      isReached ? group.dotColor : "bg-gray-300"
                    }`}
                  />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 leading-tight">
                    {group.title}
                  </p>
                </div>

                {/* Status indicator */}
                {!isReached ? (
                  <span className="flex flex-shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                ) : complete ? (
                  <span className="flex flex-shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Done
                  </span>
                ) : (
                  <span className="flex flex-shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600">
                    <AlertCircle className="h-2.5 w-2.5" />
                    Pending
                  </span>
                )}
              </div>

              {/* Fields */}
              <div className={`space-y-3 ${group.fields.length > 1 ? "" : ""}`}>
                {group.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {field.label}
                    </label>
                    <input
                      type={field.type ?? "text"}
                      value={form[field.key]}
                      onChange={set(field.key)}
                      disabled={!isReached}
                      className={inputCls}
                      placeholder={
                        !isReached
                          ? "Stage not yet reached"
                          : (field.placeholder ?? `Enter ${field.label.toLowerCase()}`)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save — bottom bar (always visible on mobile, also on desktop) */}
      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
        <p className="text-xs text-gray-500">
          {completedGroups === TRACKING_GROUPS.length
            ? "All tracking sections complete ✓"
            : `${completedGroups} of ${TRACKING_GROUPS.length} sections filled`}
        </p>
        <button
          onClick={() => onSave(form)}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving…" : "Save Tracking"}
        </button>
      </div>
    </div>
  );
}

// ─── Payment status badge ──────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: string }) {
  const cls =
    status === "received"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200/60"
      : status === "pending"
      ? "bg-amber-100 text-amber-700 ring-amber-200/60"
      : "bg-red-100 text-red-700 ring-red-200/60";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${cls}`}
    >
      {status}
    </span>
  );
}

// ─── Project Detail ────────────────────────────────────────────────────────────

export function ProjectDetail() {
  const [, params]  = useRoute("/projects/:id");
  const id          = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const { data: project, isLoading } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) },
  });
  const { data: payments } = useListPayments({ projectId: id }, {
    query: { enabled: !!id, queryKey: getListPaymentsQueryKey({ projectId: id }) },
  });

  const updateProject = useUpdateProject();

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading || !project) {
    return (
      <div className="mx-auto max-w-6xl animate-pulse space-y-5 pb-12">
        {/* Breadcrumb */}
        <div className="h-4 w-32 rounded-full bg-gray-200" />
        {/* Main card */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          {/* Header */}
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-7 w-56 rounded-lg bg-gray-200" />
                <div className="h-4 w-40 rounded-full bg-gray-100" />
              </div>
              <div className="h-8 w-24 rounded-lg bg-gray-100" />
            </div>
          </div>
          {/* Stage stepper */}
          <div className="border-b border-gray-100 bg-gray-50/60 p-6">
            <div className="mb-3 h-3 w-32 rounded-full bg-gray-200" />
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="h-[52px] rounded-xl bg-gray-100" />
              ))}
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-gray-200" />
          </div>
          {/* Technical + Financial */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-4 p-6">
              <div className="h-3 w-24 rounded-full bg-gray-200" />
              <div className="h-12 w-full rounded-xl bg-gray-100" />
              <div className="h-12 w-full rounded-xl bg-gray-100" />
              <div className="h-20 w-full rounded-xl bg-gray-100" />
            </div>
            <div className="space-y-4 border-t border-gray-100 p-6 md:border-l md:border-t-0">
              <div className="h-3 w-28 rounded-full bg-gray-200" />
              <div className="h-2 w-full rounded-full bg-gray-200" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 rounded-xl bg-gray-100" />
                <div className="h-20 rounded-xl bg-gray-100" />
              </div>
              <div className="h-40 rounded-xl bg-gray-100" />
            </div>
          </div>
          {/* Workflow */}
          <div className="border-t border-gray-100 p-6">
            <div className="mb-4 h-4 w-40 rounded-full bg-gray-200" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStageChange = (newStage: string) => {
    updateProject.mutate({ id, data: { stage: newStage } }, {
      onSuccess: (updated) => {
        toast({ title: "Project stage updated" });
        queryClient.setQueryData(getGetProjectQueryKey(id), updated);
      },
      onError: () => toast({ title: "Failed to update stage", variant: "destructive" }),
    });
  };

  const handleTrackingSave = (data: Partial<TrackingFields>) => {
    updateProject.mutate({ id, data: data as Record<string, string> }, {
      onSuccess: (updated) => {
        toast({ title: "Workflow tracking saved" });
        queryClient.setQueryData(getGetProjectQueryKey(id), updated);
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const totalAmount     = Number(project.totalAmount || 0);
  const collectedAmount = payments
    ?.filter((p) => p.status === "received")
    .reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const pendingAmount   = totalAmount - collectedAmount;
  const paymentProgress = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;
  const currentIndex    = PROJECT_STAGES.findIndex((s) => s.id === project.stage);
  const stageProgress   = ((currentIndex + 1) / PROJECT_STAGES.length) * 100;
  const projectRef      = `PRJ-${project.id.toString().padStart(4, "0")}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-mono text-xs font-semibold text-gray-500">{projectRef}</span>
        <ChevronRight className="h-3 w-3 text-gray-300" />
        <span className="max-w-[180px] truncate font-medium text-gray-900">
          {project.customerName as string}
        </span>
      </nav>

      {/* ── Main card ──────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">

        {/* ── Card header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-[1.6rem] font-bold tracking-tight text-gray-900 leading-tight">
                {project.customerName as string}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200/60">
                <Zap className="h-3 w-3" />
                {project.systemCapacityKw as string} kW
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              {[project.address, project.city].filter(Boolean).join(", ")}
            </p>
          </div>

          {/* Total value */}
          <div className="flex-shrink-0 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-2.5 text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Value
            </p>
            <p className="mt-0.5 font-heading text-xl font-bold tracking-tight text-gray-900">
              ₹{totalAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Stage stepper ────────────────────────────────────────────────────── */}
        <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-5 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Workflow Progress
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-500">
                Step {currentIndex + 1} of {PROJECT_STAGES.length}
              </span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary ring-1 ring-primary/20">
                {Math.round(stageProgress)}%
              </span>
            </div>
          </div>

          {/* Stage grid — 2 col → 3 col on large screens */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {PROJECT_STAGES.map((stage, idx) => {
              const isCompleted = idx < currentIndex;
              const isCurrent   = idx === currentIndex;
              const StageIcon   = stage.icon;

              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageChange(stage.id)}
                  className={[
                    "group flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all",
                    isCurrent
                      ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20 hover:bg-primary/8"
                      : isCompleted
                      ? "border-emerald-200/80 bg-emerald-50/70 hover:bg-emerald-100/60"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {/* Icon circle */}
                  <div
                    className={[
                      "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-400 group-hover:bg-gray-200",
                    ].join(" ")}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <StageIcon className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        "text-[9px] font-bold uppercase tracking-wider",
                        isCurrent
                          ? "text-primary"
                          : isCompleted
                          ? "text-emerald-600"
                          : "text-gray-400",
                      ].join(" ")}
                    >
                      Step {idx + 1}
                    </p>
                    <p
                      className={[
                        "truncate text-xs font-semibold leading-tight",
                        isCurrent
                          ? "text-gray-900"
                          : isCompleted
                          ? "text-emerald-800"
                          : "text-gray-500",
                      ].join(" ")}
                    >
                      {stage.label}
                    </p>
                  </div>

                  {isCurrent && (
                    <span className="ml-auto flex-shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-primary-foreground">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${stageProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Technical  +  Financial ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">

          {/* Technical */}
          <div className="space-y-5 p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Wrench className="h-4 w-4 text-gray-400" />
              Technical Assignment
            </h3>

            <InfoField label="Assigned Engineer">
              {project.assignedEngineer ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {(project.assignedEngineer as { name: string }).name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">
                    {(project.assignedEngineer as { name: string }).name}
                  </span>
                </div>
              ) : (
                <span className="flex items-center gap-1.5 italic text-gray-400">
                  <User className="h-3.5 w-3.5" />
                  Unassigned
                </span>
              )}
            </InfoField>

            <InfoField label="System Capacity">
              <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                <Zap className="h-4 w-4 text-amber-500" />
                {project.systemCapacityKw as string} kW
              </span>
            </InfoField>

            <InfoField label="Lead Reference">
              {project.leadId ? (
                <Link
                  href={`/leads/${project.leadId as number}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View Source Lead
                  <ChevronRight className="h-3 w-3" />
                </Link>
              ) : (
                <span className="italic text-gray-400">—</span>
              )}
            </InfoField>

            <InfoField label="Remarks / Instructions">
              <div className="mt-0.5 min-h-[64px] rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 text-sm leading-relaxed text-gray-700">
                {project.remarks ? (
                  <span className="whitespace-pre-wrap">{project.remarks as string}</span>
                ) : (
                  <span className="italic text-gray-400">No instructions provided.</span>
                )}
              </div>
            </InfoField>
          </div>

          {/* Financial */}
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <IndianRupee className="h-4 w-4 text-gray-400" />
                Financial Overview
              </h3>
              <Link
                href="/finance"
                className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98]"
              >
                + Record Payment
              </Link>
            </div>

            {/* Collection progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-500">Collection Progress</span>
                <span className="font-bold tabular-nums text-gray-900">
                  {Math.round(paymentProgress)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>₹0</span>
                <span>₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Collected / Pending tiles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200/60 bg-white p-3.5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  Collected
                </p>
                <p className="mt-1.5 font-heading text-lg font-bold leading-none text-emerald-600">
                  ₹{collectedAmount.toLocaleString()}
                </p>
                {totalAmount > 0 && (
                  <p className="mt-1 text-[10px] text-emerald-400">
                    {Math.round(paymentProgress)}% of total
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-amber-200/60 bg-white p-3.5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Pending
                </p>
                <p className="mt-1.5 font-heading text-lg font-bold leading-none text-amber-600">
                  ₹{pendingAmount.toLocaleString()}
                </p>
                {totalAmount > 0 && (
                  <p className="mt-1 text-[10px] text-amber-400">
                    {Math.round(100 - paymentProgress)}% remaining
                  </p>
                )}
              </div>
            </div>

            {/* Recent payments list */}
            <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white">
              <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Recent Payments
                  </p>
                  {payments && payments.length > 0 && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-semibold text-gray-500">
                      {payments.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-52 divide-y divide-gray-50 overflow-y-auto overscroll-contain">
                {!payments || payments.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
                    <IndianRupee className="h-5 w-5 text-gray-300" />
                    <p className="text-sm font-medium text-gray-400">No payments recorded</p>
                    <p className="text-xs text-gray-400">Use "Record Payment" to add one.</p>
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-blue-50/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium capitalize text-gray-900">
                          {payment.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {payment.paymentDate
                            ? format(new Date(payment.paymentDate), "MMM d, yyyy")
                            : "No date"}
                          {payment.paymentDate && (
                            <span className="ml-1 text-gray-300">
                              · {formatDistanceToNow(new Date(payment.paymentDate), { addSuffix: true })}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="ml-3 flex flex-shrink-0 flex-col items-end gap-1">
                        <p className="text-sm font-bold tabular-nums text-gray-900">
                          ₹{Number(payment.amount).toLocaleString()}
                        </p>
                        <PaymentBadge status={payment.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Workflow Tracking section ─────────────────────────────────────────── */}
        <div className="border-t border-gray-100">
          <WorkflowTracking
            project={project as unknown as Record<string, unknown>}
            onSave={handleTrackingSave}
            isSaving={updateProject.isPending}
          />
        </div>
      </div>
    </div>
  );
}
