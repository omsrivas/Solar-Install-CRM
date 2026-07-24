import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetProject, getGetProjectQueryKey,
  useUpdateProject, useListPayments, getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft, MapPin, Zap, User, Clock, CheckCircle2, IndianRupee,
  Truck, Wrench, FileText, Activity, Settings, Send, Search, Package,
  ClipboardList, Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROJECT_STAGES = [
  { id: "order_punched",     label: "Order Punched",    icon: Clock },
  { id: "pmsgy_registered",  label: "PMSGY Registered", icon: FileText },
  { id: "discom_change",     label: "Discom Change",    icon: Activity },
  { id: "net_metering",      label: "Net Metering",     icon: Zap },
  { id: "material_supplied", label: "Material Supplied",icon: Package },
  { id: "ic_done",           label: "I&C Done",         icon: Wrench },
  { id: "quality_check",     label: "Quality Check",    icon: Search },
  { id: "meter_configured",  label: "Meter Configured", icon: Settings },
  { id: "subsidy_submitted", label: "Subsidy Submitted",icon: Send },
  { id: "handover_done",     label: "Handover Done",    icon: Truck },
  { id: "completed",         label: "Completed",        icon: CheckCircle2 },
];

// ─── Shared classes ────────────────────────────────────────────────────────────

const inputCls =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

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
    <div className={`overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm ${className}`}>
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
  fields: Array<{ label: string; key: keyof TrackingFields; type?: string }>;
}> = [
  {
    title: "PMSGY Registration",
    stage: "pmsgy_registered",
    accent: "border-sky-200 bg-sky-50/60",
    fields: [
      { label: "Registration No.",   key: "pmsgyRegistrationNo" },
      { label: "Registration Date",  key: "pmsgyRegistrationDate",  type: "date" },
    ],
  },
  {
    title: "Discom Change",
    stage: "discom_change",
    accent: "border-cyan-200 bg-cyan-50/60",
    fields: [
      { label: "Reference No.", key: "discomChangeRefNo" },
      { label: "Date",          key: "discomChangeDate", type: "date" },
    ],
  },
  {
    title: "Net Metering",
    stage: "net_metering",
    accent: "border-teal-200 bg-teal-50/60",
    fields: [
      { label: "Reference No.", key: "netMeteringRefNo" },
      { label: "Date",          key: "netMeteringDate", type: "date" },
    ],
  },
  {
    title: "Meter Configuration",
    stage: "meter_configured",
    accent: "border-violet-200 bg-violet-50/60",
    fields: [
      { label: "Meter Serial No.", key: "meterSerialNo" },
    ],
  },
  {
    title: "Subsidy Submission",
    stage: "subsidy_submitted",
    accent: "border-indigo-200 bg-indigo-50/60",
    fields: [
      { label: "Submission Ref. No.", key: "subsidySubmissionRefNo" },
      { label: "Submission Date",     key: "subsidySubmissionDate", type: "date" },
    ],
  },
  {
    title: "Document Handover",
    stage: "handover_done",
    accent: "border-purple-200 bg-purple-50/60",
    fields: [
      { label: "Handover Date", key: "documentHandoverDate", type: "date" },
    ],
  },
  {
    title: "Customer Acknowledgement",
    stage: "completed",
    accent: "border-green-200 bg-green-50/60",
    fields: [
      { label: "Acknowledgement / Signature Note", key: "customerAcknowledgement" },
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
      setForm(f => ({ ...f, [field]: e.target.value }));

  const currentIdx = PROJECT_STAGES.findIndex(s => s.id === (project.stage as string));

  return (
    <div className="p-5 sm:p-6">
      {/* Sub-header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <ClipboardList className="h-4 w-4 text-gray-400" />
          Workflow Tracking
        </h2>
        <button
          onClick={() => onSave(form)}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving…" : "Save Tracking"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TRACKING_GROUPS.map((group) => {
          const stageIdx  = PROJECT_STAGES.findIndex(s => s.id === group.stage);
          const isReached = stageIdx <= currentIdx;
          const complete  = group.fields.every(f => !!form[f.key]);

          return (
            <div
              key={group.title}
              className={`space-y-3 rounded-xl border p-4 transition-opacity ${group.accent} ${isReached ? "opacity-100" : "opacity-40"}`}
            >
              {/* Group header */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  {group.title}
                </p>
                {complete ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-gray-300" />
                )}
              </div>

              {/* Fields */}
              {group.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-500">{field.label}</label>
                  <input
                    type={field.type ?? "text"}
                    value={form[field.key]}
                    onChange={set(field.key)}
                    disabled={!isReached}
                    className={inputCls}
                    placeholder={field.type === "date" ? "" : `Enter ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Project Detail ────────────────────────────────────────────────────────────

export function ProjectDetail() {
  const [, params]     = useRoute("/projects/:id");
  const id             = Number(params?.id);
  const queryClient    = useQueryClient();
  const { toast }      = useToast();

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
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse pb-12" aria-label="Loading project">
        <div className="h-5 w-32 rounded-lg bg-gray-200" />
        <div className="h-9 w-72 rounded-lg bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-xl border border-gray-100 bg-white" />
          ))}
        </div>
        <div className="h-72 rounded-xl border border-gray-100 bg-white" />
        <div className="h-64 rounded-xl border border-gray-100 bg-white" />
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
    ?.filter(p => p.status === "received")
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const pendingAmount   = totalAmount - collectedAmount;
  const paymentProgress = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;
  const currentIndex    = PROJECT_STAGES.findIndex(s => s.id === project.stage);
  const stageProgress   = ((currentIndex + 1) / PROJECT_STAGES.length) * 100;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">PRJ-{project.id.toString().padStart(4, "0")}</span>
      </nav>

      {/* ── Main card ─────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">

        {/* Card header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">
                {project.customerName}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                <Zap className="h-3.5 w-3.5" />
                {project.systemCapacityKw} kW
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {project.address}, {project.city}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Value</p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-gray-900">
              ₹{totalAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Stage stepper ──────────────────────────────────────────────────── */}
        <div className="border-b border-gray-100 bg-gray-50/60 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Hitech Workflow Progress
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {Math.round(stageProgress)}% complete
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROJECT_STAGES.map((stage, idx) => {
              const isCompleted = idx < currentIndex;
              const isCurrent   = idx === currentIndex;
              const StageIcon   = stage.icon;

              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageChange(stage.id)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    isCurrent
                      ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : isCompleted
                      ? "border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100/60"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {/* Step icon */}
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}>
                    {isCompleted
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <StageIcon className="h-4 w-4" />
                    }
                  </div>

                  {/* Step label */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${
                      isCurrent ? "text-primary" : isCompleted ? "text-emerald-600" : "text-gray-400"
                    }`}>
                      Step {idx + 1}
                    </p>
                    <p className={`truncate text-sm font-medium ${
                      isCurrent ? "text-gray-900" : isCompleted ? "text-emerald-800" : "text-gray-500"
                    }`}>
                      {stage.label}
                    </p>
                  </div>

                  {isCurrent && (
                    <span className="ml-auto flex-shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Overall progress bar */}
          <div className="mt-4 space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${stageProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Technical + Financial ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">

          {/* Technical */}
          <div className="space-y-5 p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Wrench className="h-4 w-4 text-gray-400" />
              Technical Assignment
            </h3>
            <div className="space-y-5">
              <InfoField label="Assigned Engineer">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {project.assignedEngineer?.name.charAt(0) || <User className="h-4 w-4" />}
                  </div>
                  <span className="font-medium text-gray-900">
                    {project.assignedEngineer?.name || (
                      <span className="italic text-gray-400">Unassigned</span>
                    )}
                  </span>
                </div>
              </InfoField>

              <InfoField label="System Capacity">
                <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                  <Zap className="h-4 w-4 text-amber-500" />
                  {project.systemCapacityKw} kW
                </div>
              </InfoField>

              <InfoField label="Remarks / Instructions">
                <div className="mt-1 min-h-[72px] rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-sm text-gray-700">
                  {project.remarks || (
                    <span className="italic text-gray-400">No specific instructions provided.</span>
                  )}
                </div>
              </InfoField>
            </div>
          </div>

          {/* Financial */}
          <div className="space-y-5 bg-gray-50/30 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <IndianRupee className="h-4 w-4 text-gray-400" />
                Financial Overview
              </h3>
              <Link
                href="/finance"
                className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                + Record Payment
              </Link>
            </div>

            <div className="space-y-5">
              {/* Collection progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-500">Collection Progress</span>
                  <span className="font-bold text-gray-900">{Math.round(paymentProgress)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${paymentProgress}%` }}
                  />
                </div>
              </div>

              {/* Collected / Pending */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200/60 bg-white p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Collected</p>
                  <p className="mt-1 font-heading text-lg font-bold text-emerald-600">
                    ₹{collectedAmount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200/60 bg-white p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Pending</p>
                  <p className="mt-1 font-heading text-lg font-bold text-amber-600">
                    ₹{pendingAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Recent payments */}
              <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white">
                <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Recent Payments</p>
                </div>
                <div className="max-h-48 divide-y divide-gray-50 overflow-y-auto">
                  {payments?.length === 0 ? (
                    <p className="px-4 py-5 text-center text-sm text-gray-400">No payments recorded</p>
                  ) : (
                    payments?.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium capitalize text-gray-900">
                            {payment.type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-400">
                            {payment.paymentDate
                              ? format(new Date(payment.paymentDate), "MMM d, yyyy")
                              : "No date"
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            ₹{Number(payment.amount).toLocaleString()}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            payment.status === "received"
                              ? "bg-emerald-100 text-emerald-700"
                              : payment.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Workflow Tracking ──────────────────────────────────────────────── */}
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
