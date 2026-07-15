import { useState } from "react";
import { useListDocuments } from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  FileText, Search, FileImage, FileCode, FileSpreadsheet, 
  Download, Trash2, UploadCloud, Folder 
} from "lucide-react";

export function Documents() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  
  const { data: documents, isLoading } = useListDocuments({
    documentType: typeFilter || undefined
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("image")) return <FileImage className="h-5 w-5 text-blue-500" />;
    if (fileType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes("excel") || fileType.includes("spreadsheet") || fileType.includes("csv")) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    if (fileType.includes("json") || fileType.includes("code")) return <FileCode className="h-5 w-5 text-gray-500" />;
    return <FileText className="h-5 w-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocs = documents?.filter(d => 
    !search || 
    d.originalName.toLowerCase().includes(search.toLowerCase()) ||
    d.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Document Repository</h1>
          <p className="text-sm text-gray-500 mt-1">Manage project drawings, invoices, and customer documents</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm shadow-sm">
          <UploadCloud className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">All Files</h2>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="contract">Contracts</option>
              <option value="drawing">Drawings</option>
              <option value="invoice">Invoices</option>
              <option value="photo">Site Photos</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 bg-gray-50/30">
                <th className="px-6 py-4 font-semibold w-12"></th>
                <th className="px-6 py-4 font-semibold">File Name</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Related Entity</th>
                <th className="px-6 py-4 font-semibold text-right">Size</th>
                <th className="px-6 py-4 font-semibold text-right">Uploaded</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 animate-pulse">Loading documents...</td>
                </tr>
              ) : filteredDocs?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No documents found matching criteria.</td>
                </tr>
              ) : (
                filteredDocs?.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      {getFileIcon(doc.fileType)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 line-clamp-1" title={doc.originalName}>
                        {doc.originalName}
                      </div>
                      {doc.notes && (
                        <div className="text-gray-500 text-xs mt-0.5 line-clamp-1" title={doc.notes}>
                          {doc.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {doc.projectId ? (
                        <span className="text-primary font-medium text-xs bg-primary/10 px-2 py-1 rounded">PRJ-{doc.projectId.toString().padStart(4, '0')}</span>
                      ) : doc.leadId ? (
                        <span className="text-indigo-600 font-medium text-xs bg-indigo-50 px-2 py-1 rounded">LEAD-{doc.leadId}</span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">General</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 font-mono text-xs">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 text-xs">
                      {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Download">
                          <Download className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
