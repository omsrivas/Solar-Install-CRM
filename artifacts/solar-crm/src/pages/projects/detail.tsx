import { useState } from "react";
import { useRoute, Link } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey,
  useUpdateProject, useListPayments, getListPaymentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, MapPin, Zap, User, Clock, CheckCircle2, IndianRupee, Truck, Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROJECT_STAGES = [
  { id: "order_punched", label: "Order Punched", icon: Clock },
  { id: "survey_done", label: "Survey Done", icon: MapPin },
  { id: "material_issued", label: "Material Issued", icon: Truck },
  { id: "installation_done", label: "Installation Done", icon: Wrench },
  { id: "handover_done", label: "Handover Done", icon: User },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

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
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading project details...</div>;
  }

  const handleStageChange = (newStage: string) => {
    updateProject.mutate({ id, data: { stage: newStage } }, {
      onSuccess: (updated) => {
        toast({ title: "Project stage updated" });
        queryClient.setQueryData(getGetProjectQueryKey(id), updated);
      }
    });
  };

  const totalAmount = Number(project.totalAmount || 0);
  const collectedAmount = payments?.filter(p => p.status === 'received').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const pendingAmount = totalAmount - collectedAmount;
  const paymentProgress = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 text-sm mb-4">
        <Link href="/projects" className="text-gray-500 hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">PRJ-{project.id.toString().padStart(4, '0')}</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
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

        {/* Linear Stage Progression */}
        <div className="p-8 bg-gray-50/50 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">Execution Progress</h2>
          <div className="relative">
            <div className="absolute top-5 left-6 right-6 h-1 bg-gray-200 rounded-full z-0"></div>
            
            <div className="flex justify-between relative z-10">
              {PROJECT_STAGES.map((stage, idx) => {
                const currentIndex = PROJECT_STAGES.findIndex(s => s.id === project.stage);
                const isCompleted = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                const Icon = stage.icon;
                
                return (
                  <div key={stage.id} className="flex flex-col items-center gap-3 w-32">
                    <button 
                      onClick={() => handleStageChange(stage.id)}
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isCompleted ? 'bg-green-500 text-white ring-4 ring-green-100' :
                        isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110' :
                        'bg-white text-gray-400 border border-gray-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                    <span className={`text-xs font-bold text-center ${
                      isCurrent ? 'text-primary' : 
                      isCompleted ? 'text-green-600' : 
                      'text-gray-500'
                    }`}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Engineering Details */}
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
                    {project.assignedEngineer?.name.charAt(0) || '?'}
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

          {/* Payment Summary */}
          <div className="p-6 space-y-6 bg-gray-50/30">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-gray-400" />
                Financial Overview
              </h3>
              <Link href="/finance/new" className="text-xs font-bold text-primary hover:underline">
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

              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
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
                          <p className="font-medium text-gray-900 capitalize">{payment.type.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">{payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM d, yyyy') : 'No date'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₹{Number(payment.amount).toLocaleString()}</p>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            payment.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                            payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
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
      </div>
    </div>
  );
}
