import { useState } from "react";
import { useListActivities } from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  Activity as ActivityIcon, User, Briefcase, Zap, 
  IndianRupee, Package, AlertTriangle, FileText 
} from "lucide-react";

export function Activities() {
  const [entityFilter, setEntityFilter] = useState<string>("");
  
  const { data: activities, isLoading } = useListActivities({
    entityType: entityFilter || undefined,
    limit: 50
  });

  const getIconForEntity = (type: string) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4 text-blue-500" />;
      case 'lead': return <Users className="h-4 w-4 text-indigo-500" />;
      case 'project': return <Briefcase className="h-4 w-4 text-purple-500" />;
      case 'payment': return <IndianRupee className="h-4 w-4 text-emerald-500" />;
      case 'inventory': return <Package className="h-4 w-4 text-amber-500" />;
      case 'service': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'document': return <FileText className="h-4 w-4 text-cyan-500" />;
      default: return <Zap className="h-4 w-4 text-gray-500" />;
    }
  };
  
  // Need Users import for the switch
  const Users = ({className}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ActivityIcon className="h-6 w-6 text-primary" /> 
            Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">System-wide chronological activity stream</p>
        </div>
        
        <select
          className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <option value="">All Modules</option>
          <option value="lead">Leads</option>
          <option value="project">Projects</option>
          <option value="payment">Payments</option>
          <option value="inventory">Inventory</option>
          <option value="service">Service</option>
          <option value="user">Users</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative">
        {isLoading ? (
          <div className="space-y-8 animate-pulse relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-100 p-4 rounded-xl border border-slate-200 h-24"></div>
              </div>
            ))}
          </div>
        ) : activities?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No activity found for the selected criteria.
          </div>
        ) : (
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-200">
            {activities?.map((activity, index) => (
              <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gray-50 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${index === 0 ? 'ring-2 ring-primary/20' : ''}`}>
                  {getIconForEntity(activity.entityType)}
                </div>
                
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow group-hover:border-primary/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {activity.entityType}
                    </span>
                    <time className="text-xs text-gray-500 font-mono">
                      {format(new Date(activity.createdAt), 'MMM d, HH:mm')}
                    </time>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-900 font-medium">
                    <span className="capitalize">{activity.action.replace(/_/g, ' ')}</span>
                  </div>
                  
                  <div className="mt-1 text-sm text-gray-600">
                    {activity.description}
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <div className="h-5 w-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold">
                      {activity.performedBy?.name?.charAt(0) || '?'}
                    </div>
                    {activity.performedBy?.name || 'System User'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
