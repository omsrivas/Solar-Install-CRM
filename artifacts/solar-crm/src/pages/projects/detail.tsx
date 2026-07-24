import { useState } from "react";
import { useRoute, Link } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey,
  useUpdateProject, useListPayments, getListPaymentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, MapPin, Zap, User, Clock, CheckCircle2, IndianRupee, 
  Truck, Wrench, FileText, Activity, Settings, Send, Search, Package,
  ClipboardList, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROJECT_STAGES = [
  { id: "order_punched",     label: "Order Punched",     icon: Clock },
  { id: "pmsgy_registered",  label: "PMSGY Registered",  icon: FileText },
  { id: "discom_change",     label: "Discom Change",      icon: Activity },
  { id: "net_metering",      label: "Net Metering",       icon: Zap },
  { id: "material_supplied", label: "Material Supplied",  icon: Package },
  { id: "ic_done",           label: "I&C Done",           icon: Wrench },
  { id: "quality_check",     label: "Quality Check",      icon: Search },
  { id: "meter_configured",  label: "Meter Configured",   icon: Settings },
  { id: "subsidy_submitted", label: "Subsidy Submitted",  icon: Send },
  { id: "handover_done",     label: "Handover Done",      icon: Truck },
  { id: "completed",         label: "Completed",          icon: CheckCircle2 },
];

// ─── Workflow Tracking Form ────────────────────────────────────────────────────

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
    pmsgyRegistrationNo:   (project.pmsgyRegistrationNo   as string) ?? "",
    pmsgyRegistrationDate: (project.pmsgyRegistrationDate as string) ?? "",
    discomChangeRefNo:     (project.discomChangeRefNo     as string) ?? "",
    discomChangeDate:      (project.discomChangeDate      as string) ?? "",
    netMeteringRefNo:      (project.netMeteringRefNo      as string) ?? "",
    netMeteringDate:       (project.netMeteringDate       as string) ?? "",
    meterSerialNo:         (project.meterSerialNo         as string) ?? "",
    subsidySubmissionRefNo:(project.subsidySubmissionRefNo as string) ?? "",
    subsidySubmissionDate: (project.subsidySubmissionDate as string) ?? "",
    documentHandoverDate:  (project.documentHandoverDate  as string) ?? "",
    customerAcknowledgement:(project.customerAcknowledgement as string) ?? "",
  });

  const set = (field: keyof TrackingFields) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const groups: Array<{
    title: string;
    stage: string;
    color: string;
    fields: Array<{ label: string; key: keyof TrackingFields; type?: string }>;
  }> = [
    {
      title: "PMSGY Registration",
      stage: "pmsgy_registered",
      color: "border-sky-200 bg-sky-50",
      fields: [
        { label: "Registration No.", key: "pmsgyRegistrationNo" },
        { label: "Registration Date", key: "pmsgyRegistrationDate", type: "date" },
      ],
    },
    {
      title: "Discom Change",
      stage: "discom_change",
      color: "border-cyan-200 bg-cyan-50",
      fields: [
        { label: "Reference No.", key: "discomChangeRefNo" },
        { label: "Date", key: "discomChangeDate", type: "date" },
      ],
    },
    {
      title: "Net Metering",
      stage: "net_metering",
      color: "border-teal-200 bg-teal-50",
      fields: [
        { label: "Reference No.", key: "netMeteringRefNo" },
        { label: "Date", key: "netMeteringDate", type: "date" },
      ],
    },
    {
      title: "Meter Configuration",
      stage: "meter_configured",
      color: "border-violet-200 bg-violet-50",
      fields: [
        { label: "Meter Serial No.", key: "meterSerialNo" },
      ],
    },
    {
      title: "Subsidy Submission",
      stage: "subsidy_submitted",
      color: "border-indigo-200 bg-indigo-50",
      fields: [
        { label: "Submission Ref. No.", key: "subsidySubmissionRefNo" },
        { label: "Submission Date", key: "subsidySubmissionDate", type: "date" },
      ],
    },
    {
      title: "Document Handover",
      stage: "handover_done",
      color: "border-purple-200 bg-purple-50",
      fields: [
        { label: "Handover Date", key: "documentHandoverDate", type: "date" },
      ],
    },
    {
      title: "Customer Acknowledgement",
      stage: "completed",
      color: "border-green-200 bg-green-50",
      fields: [
        { label: "Acknowledgement / Signature Note", key: "customerAcknowledgement" },
      ],
    },
  ];

  const currentIdx = PROJECT_STAGES.findIndex(s => s.id === (project.stage as string));

  const isGroupComplete = (g: typeof groups[0]) => {
    return g.fields.every(f => !!form[f.key]);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gray-400" />
          Workflow Tracking
        </h2>
        <button
          onClick={() => onSave(form)}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Tracking"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((group) => {
          const stageIdx = PROJECT_STAGES.findIndex(s => s.id === group.stage);
          const isReached = stageIdx <= currentIdx;
          const complete = isGroupComplete(group);

          return (
            <div
              key={group.title}
              className={`rounded-lg border p-4 space-y-3 transition-opacity ${group.color} ${isReached ? "opacity-100" : "opacity-50"}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600">{group.title}</p>
                {complete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}
              </div>
              {group.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
                  <input
                    type={field.type ?? "text"}
                    value={form[field.key]}
                    onChange={set(field.key)}
                    disabled={!isReached}
                    className="h-9 w-full border border-input bg-white rounded-md px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:bg-muted disabled:cursor-not-allowed"
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

// ─── Main Project Detail ───────────────────────────────────────────────────────

export function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading } = useGetProject(id, { 
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } 
  });
  
  const { data: payments } = useListPayments({ projectId: id }, {
    query: { enabled: !!id, queryKey: getListPaymentsQueryKey({ projectId: id }) }
  });

  const updateProject = useUpdateProject();

  if (isLoading || !project) {
    return (
      <div className="space-y-6" aria-label="Loading project details">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border border-slate-100 bg-white" />)}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-slate-100 bg-white" />
      </div>
    );
  }

  const handleStageChange = (newStage: string) => {
    updateProject.mutate({ id, data: { stage: newStage } }, {
      onSuccess: (updated) => {
        toast({ title: "Project stage updated" });
        queryClient.setQueryData(getGetProjectQueryKey(id), updated);
      }
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

  const totalAmount = Number(project.totalAmount || 0);
  const collectedAmount = payments?.filter(p => p.status === "received").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const pendingAmount = totalAmount - collectedAmount;
  const paymentProgress = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;
  const currentIndex = PROJECT_STAGES.findIndex(s => s.id === project.stage);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 text-sm mb-4">
        <Link href="/projects" className="text-gray-500 hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">PRJ-{project.id.toString().padStart(4, "0")}</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.customerName}</h1>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm font-bold flex items-center gap-1">
                <Zap className="h-4 w-4" /> {project.systemCapacityKw} kW
              </span>
            </div>
            <p className="text-gray-500 mt-1">{project.address}, {project.city}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* 11-Stage Grid Stepper */}
        <div className="p-6 bg-gray-50/50 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5">Hitech Workflow Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROJECT_STAGES.map((stage, idx) => {
              const isCompleted = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const Icon = stage.icon;
              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageChange(stage.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                      : isCompleted
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCurrent ? "bg-primary text-primary-foreground" :
                    isCompleted ? "bg-green-500 text-white" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${
                      isCurrent ? "text-primary" : isCompleted ? "text-green-700" : "text-gray-400"
                    }`}>Step {idx + 1}</p>
                    <p className={`text-sm font-medium truncate ${
                      isCurrent ? "text-gray-900" : isCompleted ? "text-green-800" : "text-gray-500"
                    }`}>{stage.label}</p>
                  </div>
                  {isCurrent && (
                    <span className="ml-auto text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                      Current
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(((currentIndex + 1) / PROJECT_STAGES.length) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${((currentIndex + 1) / PROJECT_STAGES.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Technical + Financial */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-6 space-y-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-gray-400" />
              Technical Assignment
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Assigned Engineer</label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    {project.assignedEngineer?.name.charAt(0) || "?"}
                  </div>
                  <span className="font-medium text-gray-900">{project.assignedEngineer?.name || "Unassigned"}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">System Capacity</label>
                <p className="mt-1 text-gray-900 font-medium">{project.systemCapacityKw} kW</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Remarks / Instructions</label>
                <p className="mt-1 text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100 min-h-[80px]">
                  {project.remarks || "No specific instructions provided."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-gray-50/30">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-gray-400" />
                Financial Overview
              </h3>
              <Link href="/finance" className="text-xs font-bold text-primary hover:underline">
                + Record Payment
              </Link>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Collection Progress</span>
                  <span className="font-bold text-gray-900">{Math.round(paymentProgress)}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${paymentProgress}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase font-bold">Collected</span>
                  <p className="text-lg font-bold text-emerald-600 mt-1">₹{collectedAmount.toLocaleString()}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase font-bold">Pending</span>
                  <p className="text-lg font-bold text-amber-600 mt-1">₹{pendingAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase">
                  Recent Payments
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {payments?.length === 0 ? (
                    <p className="p-4 text-center text-sm text-gray-500">No payments recorded</p>
                  ) : (
                    payments?.map(payment => (
                      <div key={payment.id} className="p-3 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{payment.type.replace("_", " ")}</p>
                          <p className="text-xs text-gray-500">{payment.paymentDate ? format(new Date(payment.paymentDate), "MMM d, yyyy") : "No date"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₹{Number(payment.amount).toLocaleString()}</p>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            payment.status === "received" ? "bg-emerald-100 text-emerald-700" :
                            payment.status === "pending" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>{payment.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Tracking */}
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
