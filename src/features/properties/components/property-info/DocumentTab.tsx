import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { adminService, type Document, type DocumentType } from "@/features/admin/services/adminService";
import { Upload, FileText, Eye, X, CheckCircle, Clock, XCircle, Maximize2, ExternalLink } from "lucide-react";

interface DocumentTabProps {
  hotelId: string;
}

const DOCUMENT_TYPES: Array<{ value: DocumentType; label: string }> = [
  { value: "GST_CERTIFICATE", label: "GST Certificate" },
  { value: "PAN_CARD", label: "PAN Card" },
  { value: "CANCELLED_CHEQUE", label: "Cancelled Cheque" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
  { value: "AGREEMENT", label: "Agreement" },
  { value: "OTHER", label: "Other" },
];

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
    if (file) {
      setSelectedFile(file);
    }
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
    setSelectedDocument(document);
    setShowViewerModal(true);
  };

  const isImage = (contentType: string) => {
    return contentType.startsWith("image/");
  };

  const isPDF = (contentType: string) => {
    return contentType === "application/pdf";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
      },
      APPROVED: {
        label: "Approved",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
      REJECTED: {
        label: "Rejected",
        className: "bg-red-100 text-red-800 border-red-200",
        icon: XCircle,
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const availableDocTypes = getAvailableDocTypes();

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage and upload hotel documents
            </p>
          </div>
          {availableDocTypes.length > 0 && (
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          )}
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {documents.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No documents uploaded
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Upload your first document to get started
              </p>
              {availableDocTypes.length > 0 && (
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Upload Document
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verified Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {getDocTypeLabel(document.docType)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(document.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {formatDate(document.uploadedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {formatDateTime(document.verifiedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {document.remarks || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(document)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Upload Document
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setSelectedDocType("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
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
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
                    className="bg-blue-500 hover:bg-blue-600 text-white"
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
                    href={selectedDocument.documentUrl || selectedDocument.fileUrl}
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
                  const documentUrl = selectedDocument.documentUrl || selectedDocument.fileUrl;
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
                  } else if (isPDF(selectedDocument.contentType)) {
                    return (
                      <div className="w-full h-full min-h-[500px]">
                        <iframe
                          src={documentUrl}
                          className="w-full h-full min-h-[500px] rounded-2xl border border-gray-300"
                          title={selectedDocument.fileName}
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center p-12">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          Preview not available
                        </h4>
                        <p className="text-sm text-gray-600 mb-6">
                          This file type ({selectedDocument.contentType}) cannot be previewed in the browser.
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
                  }
                })()}
              </div>

              {/* Footer Info */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2">
                      {getStatusBadge(selectedDocument.status)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Uploaded:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {formatDate(selectedDocument.uploadedAt)}
                    </span>
                  </div>
                </div>
                {selectedDocument.remarks && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-gray-500 text-sm">Remarks:</span>
                    <p className="text-gray-900 text-sm mt-1 italic">{selectedDocument.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
