import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { adminService, type Document, type DocumentType } from "@/features/admin/services/adminService";
import { Upload, FileText, Eye, X, ExternalLink, Loader2, FolderOpen } from "lucide-react";

interface DocumentTabProps {
  hotelId: string;
}

const DOCUMENT_TYPES: Array<{ value: DocumentType; label: string }> = [
  { value: "GST_CERTIFICATE", label: "GST Certificate" },
  { value: "PAN_CARD", label: "PAN Card" },
  { value: "CANCELLED_CHEQUE", label: "Cancelled Cheque" },
  { value: "HOTEL_REGISTRATION", label: "Hotel Registration" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
  { value: "AGREEMENT", label: "Agreement" },
  { value: "OTHER", label: "Other" },
];

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isAllowedDocumentFile(file: File) {
  const lower = file.name.toLowerCase();
  const hasAllowedExt =
    lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx");
  return ALLOWED_DOCUMENT_MIME_TYPES.has(file.type) || hasAllowedExt;
}

function getDocumentUrl(document: Document) {
  return document.documentUrl || document.fileUrl || "";
}

function isPdfDocument(document: Document) {
  const url = getDocumentUrl(document).toLowerCase();
  const fileName = (document.fileName || "").toLowerCase();
  return (
    document.contentType === "application/pdf" ||
    fileName.endsWith(".pdf") ||
    url.endsWith(".pdf") ||
    url.includes(".pdf?") ||
    url.includes(".pdf#")
  );
}

export function DocumentTab({ hotelId }: DocumentTabProps) {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | "">("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hotelId) {
      fetchDocuments();
    }
  }, [hotelId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const docs = await adminService.getDocuments(hotelId);
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      showToast("Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  };

  const getAvailableDocTypes = (): Array<{ value: DocumentType; label: string }> => {
    const uploadedTypes = new Set(documents.map((doc) => doc.docType));
    return DOCUMENT_TYPES.filter((type) => !uploadedTypes.has(type.value));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAllowedDocumentFile(file)) {
      setValidationError("Only pdf, doc, docx files are allowed.");
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setValidationError("Document size must be 5 MB or less.");
      setSelectedFile(null);
      return;
    }
    setValidationError(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast("Please select a file", "error");
      return;
    }

    if (!selectedDocType) {
      showToast("Please select a document type", "error");
      return;
    }

    setUploading(true);
    try {
      await adminService.uploadDocument(hotelId, selectedFile, selectedDocType as DocumentType);
      showToast("Document uploaded successfully", "success");
      setShowUploadModal(false);
      setSelectedFile(null);
      setSelectedDocType("");
      setValidationError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      showToast("Failed to upload document", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleView = (document: Document) => {
    const url = getDocumentUrl(document);
    if (!url) {
      showToast("Document URL not available", "error");
      return;
    }

    if (isPdfDocument(document)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    setSelectedDocument(document);
    setShowViewerModal(true);
  };

  const isImage = (contentType: string) => {
    return contentType.startsWith("image/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getDocTypeLabel = (docType: DocumentType) => {
    return DOCUMENT_TYPES.find((type) => type.value === docType)?.label || docType;
  };

  const availableDocTypes = getAvailableDocTypes();
  const canUpload = availableDocTypes.length > 0;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#2f3d95]/20 bg-gradient-to-br from-white via-[#f8faff] to-[#eef2ff]/40 shadow-[0_8px_30px_rgba(47,61,149,0.1)] ring-1 ring-[#2f3d95]/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2f3d95]/10 bg-gradient-to-r from-[#eef2ff] via-[#f5f3ff] to-sky-50/70 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f3d95] text-white shadow-sm">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Documents</p>
              <p className="text-xs text-slate-500">
                GST, PAN, registration & other hotel files
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#2f3d95]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2f3d95]">
              {documents.length} uploaded
            </span>
            {canUpload ? (
              <Button
                onClick={() => setShowUploadModal(true)}
                size="sm"
                className="gap-1.5 bg-[#2f3d95] hover:bg-[#263578]"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </Button>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#2f3d95]" />
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[#2f3d95]/25 bg-[#eef2ff]/30 px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2f3d95] to-indigo-500 text-white shadow-lg shadow-[#2f3d95]/20">
                <FileText className="h-6 w-6" />
              </div>
              <p className="font-medium text-slate-800">No documents yet</p>
              <p className="mt-1 text-sm text-slate-500">
                {canUpload
                  ? "Use Upload above to add GST certificate, PAN, and other files."
                  : "All required document types have been uploaded."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              <div className="hidden px-4 py-2 sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_auto] sm:items-center sm:gap-3 sm:bg-slate-50/80">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Document
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Uploaded
                </span>
                <span className="text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Actions
                </span>
              </div>
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_auto] sm:items-center sm:gap-3 hover:bg-slate-50/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2f3d95] ring-1 ring-[#2f3d95]/10">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {getDocTypeLabel(document.docType)}
                      </p>
                      {document.fileName ? (
                        <p className="truncate text-xs text-slate-500">
                          {document.fileName}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:hidden">
                      Uploaded
                    </p>
                    <p className="text-sm text-slate-700">
                      {formatDate(document.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={() => handleView(document)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#2f3d95] transition-colors hover:border-[#2f3d95]/30 hover:bg-[#eef2ff]"
                      title={
                        isPdfDocument(document)
                          ? "Open PDF in new tab"
                          : "View document"
                      }
                    >
                      {isPdfDocument(document) ? (
                        <ExternalLink className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#2f3d95]/10 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#2f3d95]/10 bg-gradient-to-r from-[#eef2ff] to-white px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">
                  Upload document
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setSelectedDocType("");
                    setValidationError(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <Select
                  label="Document Type"
                  value={selectedDocType}
                  onChange={(e) =>
                    setSelectedDocType(e.target.value as DocumentType)
                  }
                  options={availableDocTypes.map((type) => ({
                    value: type.value,
                    label: type.label,
                  }))}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx"
                    />
                    <label
                      htmlFor="file-upload"
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#2f3d95]/30 bg-[#eef2ff]/30 px-4 py-3 transition-colors hover:bg-[#eef2ff]/60"
                    >
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : "Choose file"}
                      </span>
                    </label>
                  </div>
                  {selectedFile && (
                    <p className="mt-2 text-xs text-gray-500">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                  {validationError && (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {validationError}
                    </div>
                  )}
                  <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    <span className="text-red-600">*</span> Allowed document formats: pdf, doc, docx.
                    <span className="ml-1 text-red-600">*</span> Max file size: 5 MB.
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setSelectedDocType("");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    variant="outline"
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile || !selectedDocType}
                    className="bg-[#2f3d95] hover:bg-[#263578]"
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {showViewerModal && selectedDocument && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => {
              setShowViewerModal(false);
              setSelectedDocument(null);
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getDocTypeLabel(selectedDocument.docType)}
                    </h3>
                    <p className="text-sm text-gray-500">{selectedDocument.fileName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getDocumentUrl(selectedDocument)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button
                    onClick={() => {
                      setShowViewerModal(false);
                      setSelectedDocument(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Content */}
              <div className="flex-1 overflow-auto p-6 bg-gray-100 flex items-center justify-center">
                {(() => {
                  const documentUrl = getDocumentUrl(selectedDocument);
                  if (!documentUrl) {
                    return (
                      <div className="text-center p-12">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          Document URL not available
                        </h4>
                      </div>
                    );
                  }

                  if (isImage(selectedDocument.contentType)) {
                    return (
                      <div className="max-w-full max-h-[calc(90vh-120px)] flex items-center justify-center">
                        <img
                          src={documentUrl}
                          alt={selectedDocument.fileName}
                          className="max-w-full max-h-full object-contain rounded-2xl shadow-lg"
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="text-center p-12">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Preview not available
                      </h4>
                      <p className="text-sm text-gray-600 mb-6">
                        This file type ({selectedDocument.contentType}) cannot be
                        previewed in the browser.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open in New Tab
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer Info */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">File Size:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {formatFileSize(selectedDocument.fileSize)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Content Type:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {selectedDocument.contentType}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Uploaded:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {formatDate(selectedDocument.uploadedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
