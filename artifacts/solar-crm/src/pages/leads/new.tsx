import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateLead, useListUsers } from "@workspace/api-client-react";
import { ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LeadForm = {
  customerName: string;
  mobileNumber: string;
  alternateNumber: string;
  address: string;
  city: string;
  email: string;
  leadSource: string;
  stage: string;
  assignedSalesPersonId: string;
  followUpDate: string;
  remarks: string;
};

/* Shared input/select classes */
const fieldInput =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const fieldSelect =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const fieldError =
  "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20";

/* Section label with left accent */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="h-4 w-0.5 rounded-full bg-primary" />
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
        {children}
      </p>
    </div>
  );
}

export function NewLead() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createLead = useCreateLead();
  const { data: salesPersons } = useListUsers({ role: "sales" });

  const [form, setForm] = useState<LeadForm>({
    customerName: "",
    mobileNumber: "",
    alternateNumber: "",
    address: "",
    city: "",
    email: "",
    leadSource: "",
    stage: "lead",
    assignedSalesPersonId: "",
    followUpDate: "",
    remarks: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<"customerName" | "mobileNumber" | "email", string>>
  >({});

  const set =
    (field: keyof LeadForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (field in errors) setErrors((c) => ({ ...c, [field]: undefined }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<"customerName" | "mobileNumber" | "email", string>> = {};
    if (!form.customerName.trim())
      nextErrors.customerName = "Enter the customer name.";
    if (!form.mobileNumber.trim())
      nextErrors.mobileNumber = "Enter a mobile number.";
    else if (!/^[+()\d\s-]{7,}$/.test(form.mobileNumber.trim()))
      nextErrors.mobileNumber = "Enter a valid mobile number.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      nextErrors.email = "Enter a valid email address.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast({ title: "Review the highlighted fields", variant: "destructive" });
      return;
    }
    createLead.mutate(
      {
        data: {
          customerName:        form.customerName.trim(),
          mobileNumber:        form.mobileNumber.trim(),
          alternateNumber:     form.alternateNumber.trim() || undefined,
          address:             form.address.trim() || undefined,
          city:                form.city.trim() || undefined,
          email:               form.email.trim() || undefined,
          leadSource:          form.leadSource || undefined,
          stage:               form.stage,
          assignedSalesPersonId: form.assignedSalesPersonId
            ? Number(form.assignedSalesPersonId)
            : undefined,
          followUpDate:        form.followUpDate || undefined,
          remarks:             form.remarks.trim() || undefined,
          followUpStatus:      "pending",
        },
      },
      {
        onSuccess: (lead) => {
          toast({ title: "Lead created successfully!" });
          setLocation(`/leads/${lead.id}`);
        },
        onError: () =>
          toast({ title: "Failed to create lead", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Back nav */}
      <button
        onClick={() => setLocation("/leads")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </button>

      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
        {/* Form header */}
        <div className="border-b border-gray-100 bg-gray-50/60 px-6 py-5">
          <h1 className="font-heading text-lg font-bold text-gray-900">New Lead</h1>
          <p className="mt-0.5 text-sm text-gray-500">Add a potential customer to the pipeline</p>
        </div>

        <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
          {/* ── Customer Information ─────────────────────────────────────────── */}
          <div className="px-6 py-6">
            <SectionLabel>Customer Information</SectionLabel>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              {/* Customer Name – full width */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={set("customerName")}
                  aria-invalid={Boolean(errors.customerName)}
                  aria-describedby={errors.customerName ? "customer-name-error" : undefined}
                  placeholder="Full name"
                  className={`${fieldInput} ${errors.customerName ? fieldError : ""}`}
                />
                {errors.customerName && (
                  <p id="customer-name-error" className="text-xs text-rose-600">
                    {errors.customerName}
                  </p>
                )}
              </div>

              {/* Mobile */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.mobileNumber}
                  onChange={set("mobileNumber")}
                  aria-invalid={Boolean(errors.mobileNumber)}
                  aria-describedby={errors.mobileNumber ? "mobile-number-error" : undefined}
                  placeholder="Primary phone"
                  className={`${fieldInput} ${errors.mobileNumber ? fieldError : ""}`}
                />
                {errors.mobileNumber && (
                  <p id="mobile-number-error" className="text-xs text-rose-600">
                    {errors.mobileNumber}
                  </p>
                )}
              </div>

              {/* Alternate */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Alternate Number</label>
                <input
                  type="tel"
                  value={form.alternateNumber}
                  onChange={set("alternateNumber")}
                  placeholder="Secondary phone"
                  className={fieldInput}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  placeholder="customer@example.com"
                  className={`${fieldInput} ${errors.email ? fieldError : ""}`}
                />
                {errors.email && (
                  <p id="email-error" className="text-xs text-rose-600">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={set("city")}
                  placeholder="City"
                  className={fieldInput}
                />
              </div>

              {/* Address – full width */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={set("address")}
                  placeholder="Full address"
                  className={fieldInput}
                />
              </div>
            </div>
          </div>

          {/* ── Lead Details ──────────────────────────────────────────────────── */}
          <div className="px-6 py-6">
            <SectionLabel>Lead Details</SectionLabel>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
              {/* Source */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Lead Source</label>
                <select value={form.leadSource} onChange={set("leadSource")} className={fieldSelect}>
                  <option value="">Select source</option>
                  <option value="referral">Referral</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="online">Online</option>
                  <option value="cold_call">Cold Call</option>
                  <option value="exhibition">Exhibition</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Initial stage */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Initial Stage</label>
                <select value={form.stage} onChange={set("stage")} className={fieldSelect}>
                  <option value="lead">New Lead</option>
                  <option value="tele_calling">Tele Calling</option>
                  <option value="site_visit">Site Visit</option>
                  <option value="quotation_sent">Quotation Sent</option>
                  <option value="negotiation">Negotiation</option>
                </select>
              </div>

              {/* Sales person */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Assign Sales Person</label>
                <select
                  value={form.assignedSalesPersonId}
                  onChange={set("assignedSalesPersonId")}
                  className={fieldSelect}
                >
                  <option value="">Unassigned</option>
                  {salesPersons?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Follow-up date */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Follow-up Date</label>
                <input
                  type="date"
                  value={form.followUpDate}
                  onChange={set("followUpDate")}
                  className={fieldInput}
                />
              </div>

              {/* Remarks – full width */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={set("remarks")}
                  placeholder="Any notes about this lead…"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* ── Actions ────────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 bg-gray-50/60 px-6 py-4">
            <button
              type="button"
              onClick={() => setLocation("/leads")}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLead.isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              {createLead.isPending ? "Creating…" : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
