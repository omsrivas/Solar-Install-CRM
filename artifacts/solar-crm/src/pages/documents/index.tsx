import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDocuments,
  useDeleteDocument,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  FileText, Search, FileImage, FileCode, FileSpreadsheet,
  Download, Trash2, UploadCloud, Folder, X, Loader2,
} from "lucide-react";
import { getAuthToken } from "../../lib/tokenStore";
import { useToast } from "@/hooks/use-toast";
import { EmptyTableState, PaginationBar, TableSkeleton } from "@/components/table-state";

// ── Types ─────────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  { value: "aadhaar",            label: "Aadhaar Card" },
  { value: "pan",                label: "PAN Card" },
  { value: "electricity_bill",   label: "Electricity Bill" },
  { value: "quotation",          label: "Quotation" },
  { value: "agreement",          label: "Agreement" },
  { value: "installation_photo", label: "Installation Photo" },
  { value: "subsidy",            label: "Subsidy Document" },
  { value: "handover",           label: "Handover Certificate" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFileIcon(fileType: string) {
  if (fileType.includes("image"))
    return <FileImage className="h-5 w-5 text-blue-500" />;
  if (fileType.includes("pdf"))
    return <FileText className="h-5 w-5 text-red-500" />;
  if (
    fileType.includes("excel") ||
    fileType.includes("spreadsheet") ||
    fileType.includes("csv")
  )
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  if (fileType.includes("json") || fileType.includes("code"))
    return <FileCode className="h-5 w-5 text-gray-500" />;
  return <FileText className="h-5 w-5 text-gray-400" />;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function authedFetch(url: string, init?: RequestInit) {
  const token = await getAuthToken();
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  file: File;
  onClose: () => void;
  onSuccess: () => void;
}

function UploadModal({ file, onClose, onSuccess }: UploadModalProps) {
  const [docType, setDocType] = useState<string>("");
  const [notes, setNotes]     = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!docType) { setError("Please select a document type."); return; }

    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", docType);
      if (notes.trim()) fd.append("notes", notes.trim());

      const res = await authedFetch("/api/documents/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Upload Document</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {getFileIcon(file.type)}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
          </div>

          {/* Document type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              disabled={uploading}
              aria-invalid={Boolean(error && !docType)}
              aria-describedby={error && !docType ? "document-type-error" : undefined}
              className={`w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${error && !docType ? "border-red-400 ring-2 ring-red-100" : "border-input"}`}
            >
              <option value="">Select type…</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
              rows={2}
              placeholder="Any relevant notes about this document…"
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p id="document-type-error" role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Documents() {
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState<string>("");
  const [pendingFile,  setPendingFile]  = useState<File | null>(null);
  const [deletingId,   setDeletingId]   = useState<number | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient  = useQueryClient();
  const { toast }    = useToast();

  const { data: documents, isLoading } = useListDocuments({
    documentType: typeFilter || undefined,
  });

  const deleteMutation = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        toast({ title: "Document deleted" });
      },
      onError: () => {
        toast({ title: "Failed to delete document", variant: "destructive" });
      },
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    // Reset so the same file can be picked again after cancel
    e.target.value = "";
  }

  async function handleDownload(id: number, originalName: string) {
    setDownloadingIds((prev) => new Set(prev).add(id));
    try {
      const res = await authedFetch(`/api/documents/${id}/download`);
      if (!res.ok) throw new Error("Could not retrieve download link.");
      const { url } = await res.json() as { url: string };
      // Open in new tab — browser handles Content-Disposition: attachment
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch (err) {
      console.error("Download error:", err);
      toast({ title: "Download failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function handleDeleteClick(id: number) {
    setDeletingId(id);
  }

  function confirmDelete() {
    if (deletingId === null) return;
    deleteMutation.mutate(
      { id: deletingId },
      { onSettled: () => setDeletingId(null) },
    );
  }

  // ── Filtering ────────────────────────────────────────────────────────────────

  const filteredDocs = documents?.filter(
    (d) =>
      !search ||
      d.originalName.toLowerCase().includes(search.toLowerCase()) ||
      d.fileName.toLowerCase().includes(search.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil((filteredDocs?.length ?? 0) / pageSize));
  const visibleDocs = filteredDocs?.slice((page - 1) * pageSize, page * pageSize) ?? [];

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Upload file input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
      />

      {/* Upload modal */}
      {pendingFile && (
        <UploadModal
          file={pendingFile}
          onClose={() => setPendingFile(null)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() })
          }
        />
      )}

      {/* Delete confirmation modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Delete Document</h2>
            <p className="text-sm text-gray-600">
              This will permanently delete the file from storage. This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Document Repository
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage project drawings, invoices, and customer documents
          </p>
        </div>
        <button
          onClick={handleUploadClick}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <UploadCloud className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        {/* Toolbar */}
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
                aria-label="Search documents"
                placeholder="Search files..."
                className="h-10 w-full rounded-md border border-input bg-white pl-9 pr-4 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter documents by type"
              className="h-10 rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
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
                <TableSkeleton columns={7} />
              ) : filteredDocs?.length === 0 ? (
                <EmptyTableState
                  colSpan={7}
                  title="No documents found"
                  description={search || typeFilter ? "Try clearing a filter or searching for another file." : "Upload a document to keep project files in one place."}
                  action={search || typeFilter ? (
                    <button
                      type="button"
                      onClick={() => { setSearch(""); setTypeFilter(""); }}
                      className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      Upload your first document
                    </button>
                  )}
                />
              ) : (
                visibleDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    <td className="px-6 py-4 text-center">
                      {getFileIcon(doc.fileType)}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="font-medium text-gray-900 line-clamp-1"
                        title={doc.originalName}
                      >
                        {doc.originalName}
                      </div>
                      {doc.notes && (
                        <div
                          className="text-gray-500 text-xs mt-0.5 line-clamp-1"
                          title={doc.notes}
                        >
                          {doc.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                        {doc.documentType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {doc.projectId ? (
                        <span className="text-primary font-medium text-xs bg-primary/10 px-2 py-1 rounded">
                          PRJ-{doc.projectId.toString().padStart(4, "0")}
                        </span>
                      ) : doc.leadId ? (
                        <span className="text-indigo-600 font-medium text-xs bg-indigo-50 px-2 py-1 rounded">
                          LEAD-{doc.leadId}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">General</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 font-mono text-xs">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 text-xs">
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownload(doc.id, doc.originalName)}
                          disabled={downloadingIds.has(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download"
                          aria-label={`Download ${doc.originalName}`}
                        >
                          {downloadingIds.has(doc.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                          aria-label={`Delete ${doc.originalName}`}
                        >
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
        <PaginationBar
          page={page}
          pageCount={pageCount}
          total={filteredDocs?.length ?? 0}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
