import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useListPayments,
  useGetPaymentsSummary,
  useUpdatePayment,
  getListPaymentsQueryKey,
  getGetPaymentsSummaryQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  Search,
  Receipt,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditForm {
  status: string;
  type: string;
  amount: string;
  paymentDate: string;
  paymentMode: string;
  referenceNumber: string;
  notes: string;
}

function EditPaymentModal({
  paymentId,
  initial,
  onClose,
  onSubmit,
  isPending,
}: {
  paymentId: number;
  initial: EditForm;
  onClose: () => void;
  onSubmit: (data: EditForm) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<EditForm>(initial);
  const set =
    (field: keyof EditForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            Edit Payment #{paymentId}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                value={form.status}
                onChange={set("status")}
              >
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                value={form.type}
                onChange={set("type")}
              >
                <option value="advance">Advance</option>
                <option value="partial">Partial</option>
                <option value="final">Final</option>
                <option value="subsidy">Subsidy</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.amount}
              onChange={set("amount")}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.paymentDate}
                onChange={set("paymentDate")}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Payment Mode
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                value={form.paymentMode}
                onChange={set("paymentMode")}
              >
                <option value="">— Select —</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
                <option value="dd">Demand Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Reference Number{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              value={form.referenceNumber}
              onChange={set("referenceNumber")}
              placeholder="Cheque no., UTR, etc."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Notes{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              value={form.notes}
              onChange={set("notes")}
              placeholder="Any remarks or notes..."
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 rounded-md py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={isPending || !form.amount}
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

export function Finance() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: summary } = useGetPaymentsSummary();
  const { data: payments, isLoading } = useListPayments({
    status: statusFilter || undefined,
  });

  const updatePayment = useUpdatePayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListPaymentsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetPaymentsSummaryQueryKey(),
        });
        setEditTarget(null);
        toast({ title: "Payment updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update payment", variant: "destructive" });
      },
    },
  });

  const filteredPayments = payments?.filter(
    (p) =>
      !search ||
      p.project?.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.amount.toString().includes(search)
  );

  const editTargetPayment = payments?.find((p) => p.id === editTarget);

  const handleSubmit = (form: EditForm) => {
    if (!editTarget) return;
    updatePayment.mutate({
      id: editTarget,
      data: {
        status: form.status as "pending" | "received" | "overdue",
        type: form.type as "advance" | "partial" | "final" | "subsidy",
        amount: Number(form.amount),
        paymentDate: form.paymentDate || undefined,
        paymentMode: form.paymentMode || undefined,
        referenceNumber: form.referenceNumber || undefined,
        notes: form.notes || undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Financial Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track collections and outstanding payments
          </p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Total Collected
              </p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">
                ₹{(summary?.totalCollected || 0).toLocaleString()}
              </h2>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
              <ArrowDownRight className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm relative z-10">
            <span className="text-gray-500">This Month</span>
            <span className="font-semibold text-emerald-600">
              +₹{(summary?.monthlyCollected || 0).toLocaleString()}
            </span>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Total Pending
              </p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">
                ₹{(summary?.totalPending || 0).toLocaleString()}
              </h2>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm relative z-10">
            <span className="text-gray-500">Advance Expected</span>
            <span className="font-semibold text-gray-900">
              ₹{(summary?.advanceReceived || 0).toLocaleString()}
            </span>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Overdue
              </p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">
                ₹{(summary?.totalOverdue || 0).toLocaleString()}
              </h2>
            </div>
            <div className="p-3 bg-red-100 rounded-lg text-red-600">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm relative z-10">
            <span className="text-gray-500">Immediate Action Required</span>
            <span className="font-semibold text-red-600">Urgent</span>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">
              Transaction Register
            </h2>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
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
              <option value="received">Received</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-gray-50/30">
                <th className="px-6 py-4 font-semibold">Transaction Details</th>
                <th className="px-6 py-4 font-semibold">Project / Client</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500 animate-pulse"
                  >
                    Loading financial records...
                  </td>
                </tr>
              ) : filteredPayments?.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments?.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 capitalize">
                        {payment.type.replace("_", " ")}
                      </div>
                      <div className="text-gray-500 font-mono text-xs mt-1">
                        {payment.referenceNumber || "No Ref"} •{" "}
                        {payment.paymentMode || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/projects/${payment.projectId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        PRJ-{payment.projectId.toString().padStart(4, "0")}
                      </Link>
                      <div className="text-gray-600 mt-0.5 text-xs">
                        {payment.project?.customerName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 text-base">
                        ₹{Number(payment.amount).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          payment.status === "received"
                            ? "bg-emerald-100 text-emerald-700"
                            : payment.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {payment.paymentDate
                        ? format(
                            new Date(payment.paymentDate),
                            "MMM dd, yyyy"
                          )
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditTarget(payment.id)}
                        className="text-sm font-medium text-gray-500 hover:text-gray-900 underline decoration-gray-300 underline-offset-4"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget !== null && editTargetPayment && (
        <EditPaymentModal
          paymentId={editTarget}
          initial={{
            status: editTargetPayment.status,
            type: editTargetPayment.type,
            amount: editTargetPayment.amount,
            paymentDate: editTargetPayment.paymentDate ?? "",
            paymentMode: editTargetPayment.paymentMode ?? "",
            referenceNumber: editTargetPayment.referenceNumber ?? "",
            notes: editTargetPayment.notes ?? "",
          }}
          onClose={() => setEditTarget(null)}
          onSubmit={handleSubmit}
          isPending={updatePayment.isPending}
        />
      )}
    </div>
  );
}
