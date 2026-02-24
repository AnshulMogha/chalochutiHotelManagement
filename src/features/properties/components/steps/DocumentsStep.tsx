import { useState, useEffect, useRef } from "react";
import { useSearchParams, useOutletContext } from "react-router";
import { propertyService } from "../../services/propertyService";
import type {
  OnboardingDocument,
  OnboardingDocumentType,
} from "../../services/api.types";
import { Button } from "@/components/ui";
import {
  Upload,
  FileText,
  Eye,
  FileCheck2,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES: Array<{ value: OnboardingDocumentType; label: string }> = [
  { value: "GST_CERTIFICATE", label: "GST Certificate" },
  { value: "PAN_CARD", label: "PAN Card" },
  { value: "CANCELLED_CHEQUE", label: "Cancelled Cheque" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
  { value: "AGREEMENT", label: "Agreement" },
  { value: "OTHER", label: "Other" },
];

function getDocTypeLabel(docType: string) {
  return DOCUMENT_TYPES.find((t) => t.value === docType)?.label ?? docType;
}

function formatDate(dateString?: string) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes?: number) {
  if (bytes == null || bytes === 0) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function isImage(contentType?: string) {
  return !!contentType?.startsWith("image/");
}
function isPDF(contentType?: string, fileName?: string) {
  // Check contentType first
  if (contentType === "application/pdf") return true;
  
  // Check file extension as fallback
  if (fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'pdf') return true;
  }
  
  // Check URL extension as additional fallback
  return false;
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const config: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" },
    APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
  };
  const c = config[status] ?? config.PENDING;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        c.className
      )}
    >
      {c.label}
    </span>
  );
}

type OutletContext = { readOnly?: boolean };

export function DocumentsStep() {
  const [searchParams] = useSearchParams();
  const outletContext = useOutletContext<OutletContext>();
  const readOnly = outletContext?.readOnly ?? false;
  const hotelId = searchParams.get("draftId");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<OnboardingDocumentType | "">("");
  const [dragActive, setDragActive] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<OnboardingDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hotelId) {
      setLoading(false);
      return;
    }
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const list = await propertyService.getOnboardingDocuments(hotelId);
        setDocuments(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Error fetching documents:", error);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [hotelId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleUpload = async (asDraft: boolean) => {
    if (!hotelId || !selectedFile || !selectedDocType) return;
    setUploading(true);
    try {
      await propertyService.uploadOnboardingDocument(hotelId, {
        file: selectedFile,
        docType: selectedDocType as OnboardingDocumentType,
        draft: asDraft,
      });
      const list = await propertyService.getOnboardingDocuments(hotelId);
      setDocuments(Array.isArray(list) ? list : []);
      setSelectedFile(null);
      setSelectedDocType("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setUploading(false);
    }
  };

  const documentUrl = (doc: OnboardingDocument) =>
    doc.documentUrl ?? doc.fileUrl ?? "";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500">Loading documents…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-linear-to-br from-slate-50 to-blue-50/50 px-6 py-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Documents</h2>
              <p className="mt-1 text-sm text-gray-600">
                Upload GST, PAN, cancelled cheque, bank statement, agreement or other documents. One file at a time; save as draft, then continue to the next step when done.
              </p>
            </div>
          </div>
        </div>

        {/* Upload card – hidden in view/read-only mode */}
        {!readOnly && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-gray-500" />
              Upload a document
            </h3>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "rounded-xl border-2 border-dashed transition-colors",
                dragActive ? "border-blue-400 bg-blue-50/50" : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <div className="p-6 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-x-4 gap-y-4 sm:gap-y-3">
                <div className="grid grid-rows-[auto_minmax(40px,1fr)] gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Document type
                  </label>
                  <select
                    value={selectedDocType}
                    onChange={(e) =>
                      setSelectedDocType(e.target.value as OnboardingDocumentType)
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select document type</option>
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-rows-[auto_minmax(40px,1fr)] gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="doc-file-upload"
                    accept="image/*,.pdf"
                  />
                  <label
                    htmlFor="doc-file-upload"
                    className={cn(
                      "flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-2.5 transition-colors",
                      selectedFile
                        ? "border-blue-200 bg-blue-50/30 text-blue-800"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100">
                      <FileText className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {selectedFile ? selectedFile.name : "Choose file or drag here"}
                      </span>
                      {selectedFile && (
                        <span className="text-xs text-gray-500">
                          {formatFileSize(selectedFile.size)}
                        </span>
                      )}
                    </div>
                    <Upload className="h-4 w-4 shrink-0 text-gray-400" />
                  </label>
                </div>
                <div className="grid grid-rows-[auto_minmax(40px,1fr)] gap-1.5 sm:flex sm:flex-col sm:justify-center">
                  <span className="hidden text-sm font-medium text-gray-700 sm:block sm:invisible">
                    Action
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleUpload(true)}
                    disabled={uploading || !selectedFile || !selectedDocType}
                    className="h-[40px] shrink-0 gap-2 px-4"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Save as draft
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-900">
            Uploaded documents
            {documents.length > 0 && (
              <span className="ml-2 font-normal text-gray-500">
                ({documents.length})
              </span>
            )}
          </h3>
        </div>
        <div className="p-6">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/30">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-gray-700">No documents yet</p>
              <p className="mt-1 text-sm text-gray-500 text-center max-w-xs">
                Select a document type and file above, then click Save as draft to add your first document.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.id ?? doc.docType}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/30 px-4 py-3 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {getDocTypeLabel(doc.docType)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {doc.fileName ?? "—"} · {formatDate(doc.uploadedAt)}
                      {doc.fileSize != null && formatFileSize(doc.fileSize) && (
                        <> · {formatFileSize(doc.fileSize)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {doc.status && <StatusBadge status={doc.status} />}
                    {documentUrl(doc) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowViewerModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Document viewer popup */}
      {showViewerModal && selectedDocument && (() => {
        const url = documentUrl(selectedDocument);
        // Enhanced PDF detection: check contentType, fileName, and URL
        const urlIsPDF = url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf?') || url.toLowerCase().includes('.pdf#');
        const isPDFDoc = isPDF(selectedDocument.contentType, selectedDocument.fileName) || urlIsPDF;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => {
              setShowViewerModal(false);
              setSelectedDocument(null);
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-gray-600" />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {getDocTypeLabel(selectedDocument.docType)}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {selectedDocument.fileName ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowViewerModal(false);
                      setSelectedDocument(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6 bg-gray-100 flex items-center justify-center min-h-[320px]">
                {!url ? (
                  <div className="text-center p-8">
                    <FileText className="h-14 w-14 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">Document URL not available</p>
                  </div>
                ) : isPDFDoc ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-8 text-center bg-gray-50 rounded-xl">
                    <FileText className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      PDF Document Ready
                    </p>
                    <p className="text-xs text-gray-500 mb-6 max-w-md">
                      Due to security restrictions, PDFs cannot be embedded in this viewer. Click the button below to open and view the PDF in a new tab.
                    </p>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="primary" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Open PDF in New Tab
                      </Button>
                    </a>
                    <p className="text-xs text-gray-400 mt-4">
                      File: {selectedDocument.fileName ?? "Document"}
                    </p>
                  </div>
                ) : isImage(selectedDocument.contentType) ? (
                  <div className="max-w-full max-h-[calc(90vh-140px)] flex items-center justify-center">
                    <img
                      src={url}
                      alt={selectedDocument.fileName ?? "Document"}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <FileText className="h-14 w-14 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview not available</p>
                    <p className="text-xs text-gray-500 mb-4">
                      Open in a new tab to view this file.
                    </p>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Open in new tab
                      </Button>
                    </a>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-4 text-sm shrink-0">
                {selectedDocument.fileSize != null && selectedDocument.fileSize > 0 && (
                  <span className="text-gray-600">
                    Size: <span className="font-medium text-gray-900">{formatFileSize(selectedDocument.fileSize)}</span>
                  </span>
                )}
                <span className="text-gray-600">
                  Uploaded: <span className="font-medium text-gray-900">{formatDate(selectedDocument.uploadedAt)}</span>
                </span>
                {selectedDocument.status && (
                  <StatusBadge status={selectedDocument.status} />
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
