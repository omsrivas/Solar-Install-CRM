import { useEffect, useMemo, useState } from "react";
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
  CheckCircle2,
  CalendarDays,
  Clock,
  Filter,
  Search,
  Receipt,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmptyTableState, PaginationBar, TableSkeleton } from "@/components/table-state";

interface EditForm {
  status: string;
  type: string;
  amount: string;
  paymentDate: string;
  paymentMode: string;
  referenceNumber: string;
  notes: string;
}

type PaymentStatus = "pending" | "received" | "overdue";

const PAYMENT_TYPES = [
  { value: "advance", label: "Advance" },
  { value: "partial", label: "Partial" },
  { value: "final", label: "Final" },
  { value: "subsidy", label: "Subsidy" },
] as const;

const STATUS_META: Record<
  PaymentStatus,
  { label: string; badge: string; dot: string }
> = {
  received: {
    label: "Received",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  pending: {
    label: "Pending",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15",
    dot: "bg-amber-500",
  },
  overdue: {
    label: "Overdue",
    badge: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15",
    dot: "bg-red-500",
  },
};

function formatCurrency(value: number | string | null | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not specified";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
  value: string;
  helper: React.ReactNode;
  icon: React.ElementType;
  iconClass: string;
  iconBackground: string;
  valueClass?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            {label}
          </p>
          <p className={`mt-2 font-heading text-[1.7rem] font-bold tracking-tight ${valueClass}`}>
            {value}
          </p>
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
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Transaction editor
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold text-gray-950">
              Edit payment #{paymentId}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close payment editor"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
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

        <div className="flex gap-3 border-t border-gray-100 bg-gray-50/50 p-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={isPending || !form.amount}
            onClick={() => onSubmit(form)}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

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

  const filteredPayments = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return payments?.filter((payment) => {
      const searchableText = [
        payment.project?.customerName,
        payment.referenceNumber,
        payment.amount,
        payment.projectId,
        payment.type,
        payment.paymentMode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!searchTerm || searchableText.includes(searchTerm)) &&
        (!typeFilter || payment.type === typeFilter)
      );
    });
  }, [payments, search, typeFilter]);
  const pageCount = Math.max(1, Math.ceil((filteredPayments?.length ?? 0) / pageSize));
  const visiblePayments = filteredPayments?.slice((page - 1) * pageSize, page * pageSize) ?? [];
  const hasFilters = Boolean(search || statusFilter || typeFilter);
  const activeFilterCount = [search, statusFilter, typeFilter].filter(Boolean).length;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

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
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <WalletCards className="h-3.5 w-3.5" />
            Finance / Collections
          </div>
          <h1 className="font-heading text-[1.7rem] font-bold tracking-tight text-gray-950">
            Financial control
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track collections, outstanding balances, and payment activity.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm sm:self-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Register up to date
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total collected"
          value={formatCurrency(summary?.totalCollected)}
          helper={
            <>
              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
              <span>This month</span>
              <span className="ml-auto font-semibold text-emerald-700">
                +{formatCurrency(summary?.monthlyCollected)}
              </span>
            </>
          }
          icon={CheckCircle2}
          iconClass="text-emerald-600"
          iconBackground="bg-emerald-50"
        />
        <SummaryCard
          label="Total pending"
          value={formatCurrency(summary?.totalPending)}
          helper={
            <>
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Advance received</span>
              <span className="ml-auto font-semibold text-gray-700">
                {formatCurrency(summary?.advanceReceived)}
              </span>
            </>
          }
          icon={Clock}
          iconClass="text-amber-600"
          iconBackground="bg-amber-50"
        />
        <SummaryCard
          label="Overdue"
          value={formatCurrency(summary?.totalOverdue)}
          helper={
            <>
              <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
              <span>Needs follow-up</span>
              <span className="ml-auto font-semibold text-red-700">Urgent</span>
            </>
          }
          icon={ArrowUpRight}
          iconClass="text-red-600"
          iconBackground="bg-red-50"
          valueClass="text-red-700"
        />
        <SummaryCard
          label="Advance received"
          value={formatCurrency(summary?.advanceReceived)}
          helper={
            <>
              <IndianRupee className="h-3.5 w-3.5 text-blue-600" />
              <span>Across active projects</span>
              <span className="ml-auto font-semibold text-blue-700">Collected</span>
            </>
          }
          icon={IndianRupee}
          iconClass="text-blue-600"
          iconBackground="bg-blue-50"
          valueClass="text-blue-700"
        />
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-base font-bold text-gray-950">
                    Transaction register
                  </h2>
                  <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                    {filteredPayments?.length ?? 0} records
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Review and update collection activity
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeFilterCount ? `${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}` : "All transactions"}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Search financial transactions"
                placeholder="Search customer, reference, amount…"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <select
                aria-label="Filter payments by type"
                className="h-10 w-full min-w-36 appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                {PAYMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌄</span>
            </div>
            <select
              aria-label="Filter payments by status"
              className="h-10 w-full min-w-36 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="received">Received</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            <button
              type="button"
              onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); }}
              disabled={!hasFilters}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Project / Client</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Payment date</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <TableSkeleton columns={6} />
              ) : filteredPayments?.length === 0 ? (
                <EmptyTableState
                  colSpan={6}
                  title="No transactions found"
                  description={hasFilters ? "Try clearing a filter or searching for a different transaction." : "Recorded payments will appear here."}
                  action={hasFilters ? (
                    <button
                      type="button"
                      onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); }}
                      className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      Clear filters
                    </button>
                  ) : undefined}
                />
              ) : (
                visiblePayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="group transition-colors hover:bg-amber-50/20"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold capitalize text-gray-900">
                        {formatLabel(payment.type)}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                        <span className="font-mono">{payment.referenceNumber || "No reference"}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatLabel(payment.paymentMode)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/projects/${payment.projectId}`}
                        className="rounded font-semibold text-gray-900 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        PRJ-{payment.projectId.toString().padStart(4, "0")}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500">
                        {payment.project?.customerName || "Customer not available"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-heading text-base font-bold text-gray-950">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-400">INR</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_META[payment.status as PaymentStatus]?.badge ?? STATUS_META.pending.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[payment.status as PaymentStatus]?.dot ?? STATUS_META.pending.dot}`} />
                        {STATUS_META[payment.status as PaymentStatus]?.label ?? formatLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                        {payment.paymentDate ? format(new Date(payment.paymentDate), "MMM dd, yyyy") : "Not scheduled"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setEditTarget(payment.id)}
                        className="rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:border-gray-200 hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
        <div className="divide-y divide-gray-100 md:hidden">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : filteredPayments?.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">
              {hasFilters ? "No transactions match these filters." : "No transactions yet."}
            </div>
          ) : (
            visiblePayments.map((payment) => {
              const status = STATUS_META[payment.status as PaymentStatus] ?? STATUS_META.pending;
              return (
                <div key={payment.id} className="space-y-3 p-4 transition-colors hover:bg-amber-50/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize text-gray-950">{formatLabel(payment.type)}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {payment.referenceNumber || "No reference"} · {formatLabel(payment.paymentMode)}
                      </p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <Link href={`/projects/${payment.projectId}`} className="text-sm font-semibold text-gray-900 hover:text-primary">
                        PRJ-{payment.projectId.toString().padStart(4, "0")}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">{payment.project?.customerName || "Customer not available"}</p>
                    </div>
                    <p className="font-heading text-lg font-bold text-gray-950">{formatCurrency(payment.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                      {payment.paymentDate ? format(new Date(payment.paymentDate), "MMM dd, yyyy") : "Not scheduled"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditTarget(payment.id)}
                      className="font-semibold text-primary hover:underline"
                    >
                      Edit payment
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <PaginationBar
          page={page}
          pageCount={pageCount}
          total={filteredPayments?.length ?? 0}
          pageSize={pageSize}
          onPageChange={setPage}
        />
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
