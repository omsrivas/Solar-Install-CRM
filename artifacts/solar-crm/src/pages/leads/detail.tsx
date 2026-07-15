import { useState } from "react";
import { useRoute, Link } from "wouter";
import { 
  useGetLead, getGetLeadQueryKey, 
  useUpdateLead, useConvertLead,
  useListLeadNotes, getListLeadNotesQueryKey, useCreateLeadNote,
  useGetLeadTimeline, getGetLeadTimelineQueryKey, useUpdateLeadFollowup
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, Phone, MapPin, Mail, User, Briefcase, 
  CalendarClock, Save, CheckCircle2, MessageSquare,
  Activity as ActivityIcon, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STAGES = [
  { id: "lead", label: "New Lead" },
  { id: "tele_calling", label: "Tele Calling" },
  { id: "site_visit", label: "Site Visit" },
  { id: "quotation_sent", label: "Quotation Sent" },
  { id: "negotiation", label: "Negotiation" },
  { id: "order_owned", label: "Order Won" },
];

export function LeadDetail() {
  const [, params] = useRoute("/leads/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newNote, setNewNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: lead, isLoading } = useGetLead(id, { 
    query: { enabled: !!id, queryKey: getGetLeadQueryKey(id) } 
  });
  const { data: notes } = useListLeadNotes(id, {
    query: { enabled: !!id, queryKey: getListLeadNotesQueryKey(id) }
  });
  const { data: timeline } = useGetLeadTimeline(id, {
    query: { enabled: !!id, queryKey: getGetLeadTimelineQueryKey(id) }
  });

  const updateLead = useUpdateLead();
  const convertLead = useConvertLead();
  const createNote = useCreateLeadNote();
  const updateFollowup = useUpdateLeadFollowup();

  if (isLoading || !lead) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading lead details...</div>;
  }

  const handleStageChange = (newStage: string) => {
    updateLead.mutate({ id, data: { stage: newStage } }, {
      onSuccess: (updated) => {
        toast({ title: "Stage updated successfully" });
        queryClient.setQueryData(getGetLeadQueryKey(id), updated);
      }
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createNote.mutate({ id, data: { note: newNote } }, {
      onSuccess: () => {
        setNewNote("");
        toast({ title: "Note added" });
        queryClient.invalidateQueries({ queryKey: [`/api/leads/${id}/notes`] });
      }
    });
  };

  const handleUpdateFollowup = (date: string, status: string) => {
    updateFollowup.mutate({ id, data: { followUpDate: date, followUpStatus: status } }, {
      onSuccess: () => {
        toast({ title: "Follow-up updated" });
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
      }
    });
  };

  const handleConvert = () => {
    if (confirm("Are you sure you want to convert this lead to a project?")) {
      convertLead.mutate({ id, data: {} }, {
        onSuccess: (project) => {
          toast({ title: "Lead converted to Project!" });
          queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 text-sm mb-4">
        <Link href="/leads" className="text-gray-500 hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{lead.customerName}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Details */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{lead.customerName}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-gray-400" /> {lead.mobileNumber}</span>
                  {lead.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4 text-gray-400" /> {lead.email}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {lead.convertedProjectId ? (
                  <Link 
                    href={`/projects/${lead.convertedProjectId}`}
                    className="bg-green-100 text-green-700 px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-green-200 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    View Project
                  </Link>
                ) : (
                  <button 
                    onClick={handleConvert}
                    disabled={lead.stage !== 'order_owned'}
                    className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors ${
                      lead.stage === 'order_owned' 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Briefcase className="h-4 w-4" />
                    Convert to Project
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-gray-50/50">
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Pipeline Stage</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((stage, idx) => {
                    const isCurrent = lead.stage === stage.id;
                    const isPast = STAGES.findIndex(s => s.id === lead.stage) > idx;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => handleStageChange(stage.id)}
                        disabled={!!lead.convertedProjectId}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                          isCurrent ? 'bg-primary text-primary-foreground border-primary' : 
                          isPast ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                          'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        } ${lead.convertedProjectId ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {stage.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Location</label>
                  <p className="text-gray-900 flex items-start gap-1">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>{lead.address || "No address"}<br/>{lead.city || ""}</span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Assigned Sales Rep</label>
                  <p className="text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {lead.assignedSalesPerson?.name || "Unassigned"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Lead Source</label>
                  <p className="text-gray-900">{lead.leadSource || "Direct"}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Follow-up Date</label>
                  <input 
                    type="date" 
                    value={lead.followUpDate ? lead.followUpDate.split('T')[0] : ''}
                    onChange={(e) => handleUpdateFollowup(new Date(e.target.value).toISOString(), lead.followUpStatus)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-800">Notes & Communication</h2>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-6">
                <input 
                  type="text"
                  placeholder="Add a note about this lead..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <button 
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || createNote.isPending}
                  className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>

              <div className="space-y-4">
                {notes?.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-900">{note.createdBy?.name || "System"}</span>
                      <span className="text-xs text-gray-500">{format(new Date(note.createdAt), "MMM d, h:mm a")}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
                  </div>
                ))}
                {notes?.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-4">No notes yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
              <ActivityIcon className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-800">Activity History</h2>
            </div>
            <div className="p-4">
              <div className="relative border-l border-gray-200 ml-3 space-y-6 py-2">
                {timeline?.map((activity) => (
                  <div key={activity.id} className="relative pl-6">
                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white border-2 border-primary"></span>
                    <p className="text-sm font-medium text-gray-900 capitalize">{activity.action.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{format(new Date(activity.createdAt), "MMM d, h:mm a")}</p>
                  </div>
                ))}
                {(!timeline || timeline.length === 0) && (
                  <p className="text-sm text-gray-500 pl-6">No activity recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
