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
  Download, Trash2, UploadCloud, CloudUpload, FileCheck2, Folder,
  FolderOpen, X, Loader2, ShieldCheck,
  type LucideIcon,
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
  const { Icon, iconClass } = getFileVisual(fileType);
  return <Icon className={`h-5 w-5 ${iconClass}`} />;
}

function getFileVisual(fileType: string): {
  Icon: LucideIcon;
  iconClass: string;
  surfaceClass: string;
  label: string;
} {
  if (fileType.includes("image")) {
    return {
      Icon: FileImage,
      iconClass: "text-blue-600",
      surfaceClass: "bg-blue-50 ring-blue-100",
      label: "Image",
    };
  }
  if (fileType.includes("pdf")) {
    return {
      Icon: FileText,
      iconClass: "text-red-600",
      surfaceClass: "bg-red-50 ring-red-100",
      label: "PDF",
    };
  }
  if (
    fileType.includes("excel") ||
    fileType.includes("spreadsheet") ||
    fileType.includes("csv")
  ) {
    return {
      Icon: FileSpreadsheet,
      iconClass: "text-emerald-600",
      surfaceClass: "bg-emerald-50 ring-emerald-100",
      label: "Spreadsheet",
    };
  }
  if (fileType.includes("json") || fileType.includes("code")) {
    return {
      Icon: FileCode,
      iconClass: "text-slate-600",
      surfaceClass: "bg-slate-100 ring-slate-200",
      label: "Code",
    };
  }
  return {
    Icon: FileText,
    iconClass: "text-slate-500",
    surfaceClass: "bg-slate-100 ring-slate-200",
    label: "Document",
  };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6">
      <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">File intake</p>
            <h2 className="mt-1 font-heading text-xl font-bold tracking-tight text-slate-900">Upload document</h2>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="Close upload dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {/* File info */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${getFileVisual(file.type).surfaceClass}`}>
              {getFileIcon(file.type)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{getFileVisual(file.type).label} · {formatFileSize(file.size)}</p>
            </div>
            <FileCheck2 className="ml-auto h-5 w-5 shrink-0 text-emerald-500" />
          </div>

          {/* Document type */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              disabled={uploading}
              aria-invalid={Boolean(error && !docType)}
              aria-describedby={error && !docType ? "document-type-error" : undefined}
              className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${error && !docType ? "border-red-400 ring-2 ring-red-100" : "border-input"}`}
            >
              <option value="">Choose a document type…</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
              rows={3}
              placeholder="Any relevant notes about this document…"
              className="w-full resize-none rounded-lg border border-input px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>

          {/* Error */}
          {error && (
            <p id="document-type-error" role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:min-w-28"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60 sm:min-w-36"
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
  const [dragActive,   setDragActive]   = useState(false);
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

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setPendingFile(file);
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
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">
              Document repository
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {documents?.length ?? 0} {documents?.length === 1 ? "file" : "files"} securely stored
            </p>
          </div>
        </div>
        <button
          onClick={handleUploadClick}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:w-auto"
        >
          <UploadCloud className="h-4 w-4" />
          Upload document
        </button>
      </div>

      {/* Upload dropzone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragActive(false);
        }}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-2xl border transition-all ${
          dragActive
            ? "border-primary bg-primary/[0.07] shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
            : "border-slate-200 bg-gradient-to-br from-white via-white to-amber-50/55 shadow-sm"
        }`}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3.5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition-colors ${
              dragActive ? "bg-primary text-primary-foreground ring-primary/20" : "bg-amber-50 text-primary ring-amber-100"
            }`}>
              <CloudUpload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {dragActive ? "Drop your file to begin" : "Add a document to your repository"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Drag and drop a file here, or browse from your device. You’ll choose its type next.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUploadClick}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:w-auto"
          >
            <Folder className="h-4 w-4 text-primary" />
            Browse files
          </button>
        </div>
        <div className="relative flex items-center gap-2 border-t border-slate-100/80 bg-white/60 px-5 py-2.5 text-[11px] text-slate-500 sm:px-6">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Files are uploaded securely and organized by document type.
        </div>
      </div>

      {/* File library */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
              <Folder className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">All files</h2>
              <p className="text-xs text-slate-500">Browse, download, or remove stored documents</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2.5 sm:flex-row lg:w-auto">
            <div className="relative min-w-0 flex-1 sm:min-w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Search documents"
                placeholder="Search files..."
                className="h-10 w-full rounded-lg border border-input bg-white pl-9 pr-4 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter documents by type"
              className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-44"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* File cards */}
        {isLoading ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-52 animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="h-11 w-11 rounded-xl bg-slate-200" />
                  <div className="h-8 w-16 rounded-lg bg-slate-200" />
                </div>
                <div className="mt-5 h-4 w-4/5 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-2/5 rounded bg-slate-100" />
                <div className="mt-8 h-px bg-slate-100" />
                <div className="mt-4 h-3 w-3/5 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filteredDocs?.length === 0 ? (
          <div className="px-5 py-16 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FolderOpen className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900">No documents found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {search || typeFilter ? "Try clearing a filter or searching for another file." : "Upload a document to keep project files in one place."}
            </p>
            <div className="mt-4">
              {search || typeFilter ? (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setTypeFilter(""); }}
                  className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload your first document
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {visibleDocs.map((doc) => {
              const visual = getFileVisual(doc.fileType);
              const relatedEntity = doc.projectId
                ? `PRJ-${doc.projectId.toString().padStart(4, "0")}`
                : doc.leadId
                  ? `LEAD-${doc.leadId}`
                  : "General";

              return (
                <article
                  key={doc.id}
                  className="group flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${visual.surfaceClass}`}>
                      <visual.Icon className={`h-5 w-5 ${visual.iconClass}`} />
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                      {visual.label}
                    </span>
                  </div>
                  <div className="mt-4 min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900" title={doc.originalName}>
                      {doc.originalName}
                    </h3>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
                      {formatFileSize(doc.fileSize)} · {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  {doc.notes ? (
                    <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500" title={doc.notes}>
                      {doc.notes}
                    </p>
                  ) : (
                    <div className="min-h-10" />
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className={`max-w-[58%] truncate rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                      doc.projectId ? "bg-primary/10 text-amber-700" : doc.leadId ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"
                    }`} title={relatedEntity}>
                      {relatedEntity}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => handleDownload(doc.id, doc.originalName)}
                        disabled={downloadingIds.has(doc.id)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Download"
                        aria-label={`Download ${doc.originalName}`}
                      >
                        {downloadingIds.has(doc.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">Download</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(doc.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        title="Delete"
                        aria-label={`Delete ${doc.originalName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
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
