import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateLead, useListUsers } from "@workspace/api-client-react";
import { ArrowLeft, X } from "lucide-react";
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

/* Shared field classes for consistency */
const fieldInput =
  "h-9 w-full border border-input bg-transparent rounded-md px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const fieldSelect =
  "h-9 w-full border border-input bg-white rounded-md px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

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

  const set = (field: keyof LeadForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.mobileNumber.trim()) {
      toast({ title: "Customer name and mobile number are required", variant: "destructive" });
      return;
    }
    createLead.mutate({
      data: {
        customerName: form.customerName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        alternateNumber: form.alternateNumber.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        email: form.email.trim() || undefined,
        leadSource: form.leadSource || undefined,
        stage: form.stage,
        assignedSalesPersonId: form.assignedSalesPersonId ? Number(form.assignedSalesPersonId) : undefined,
        followUpDate: form.followUpDate || undefined,
        remarks: form.remarks.trim() || undefined,
        followUpStatus: "pending",
      }
    }, {
      onSuccess: (lead) => {
        toast({ title: "Lead created successfully!" });
        setLocation(`/leads/${lead.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create lead", variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Back */}
      <button
        onClick={() => setLocation("/leads")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h1 className="text-lg font-bold text-gray-900">New Lead</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Add a potential customer to the pipeline</p>
          </div>
          <button
            onClick={() => setLocation("/leads")}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Information */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Customer Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer Name <span className="text-destructive">*</span>
                </label>
                <input type="text" required value={form.customerName} onChange={set("customerName")}
                  placeholder="Full name" className={fieldInput} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mobile Number <span className="text-destructive">*</span>
                </label>
                <input type="tel" required value={form.mobileNumber} onChange={set("mobileNumber")}
                  placeholder="Primary phone" className={fieldInput} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Alternate Number</label>
                <input type="tel" value={form.alternateNumber} onChange={set("alternateNumber")}
                  placeholder="Secondary phone" className={fieldInput} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={set("email")}
                  placeholder="customer@example.com" className={fieldInput} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input type="text" value={form.city} onChange={set("city")}
                  placeholder="City" className={fieldInput} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input type="text" value={form.address} onChange={set("address")}
                  placeholder="Full address" className={fieldInput} />
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Lead Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead Source</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial Stage</label>
                <select value={form.stage} onChange={set("stage")} className={fieldSelect}>
                  <option value="lead">New Lead</option>
                  <option value="tele_calling">Tele Calling</option>
                  <option value="site_visit">Site Visit</option>
                  <option value="quotation_sent">Quotation Sent</option>
                  <option value="negotiation">Negotiation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign Sales Person</label>
                <select value={form.assignedSalesPersonId} onChange={set("assignedSalesPersonId")} className={fieldSelect}>
                  <option value="">Unassigned</option>
                  {salesPersons?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Follow-up Date</label>
                <input type="date" value={form.followUpDate} onChange={set("followUpDate")} className={fieldInput} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={set("remarks")}
                  placeholder="Any notes about this lead…"
                  rows={3}
                  className="w-full border border-input bg-transparent rounded-md px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setLocation("/leads")}
              className="inline-flex items-center justify-center h-9 px-4 border border-input rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLead.isPending}
              className="inline-flex items-center justify-center h-9 px-5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {createLead.isPending ? "Creating…" : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
