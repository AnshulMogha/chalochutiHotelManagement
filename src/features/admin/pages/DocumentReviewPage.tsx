import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { adminService, type Document } from "../services/adminService";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApproveRejectModal } from "../components/ApproveRejectModal";
import { FileText, Eye, CheckCircle, XCircle, Building2, ExternalLink, X, Clock } from "lucide-react";

interface DocumentWithHotel extends Document {
  hotelId?: string;
  hotelName?: string;
  hotelCode?: string;
}

const DOCUMENT_TYPES: Record<string, string> = {
  GST_CERTIFICATE: "GST Certificate",
  PAN_CARD: "PAN Card",
  CANCELLED_CHEQUE: "Cancelled Cheque",
  BANK_STATEMENT: "Bank Statement",
  AGREEMENT: "Agreement",
  OTHER: "Other",
};

export default function DocumentReviewPage() {
  const { toast, showToast, hideToast } = useToast();
  const [searchParams] = useSearchParams();
  const selectedHotelId = searchParams.get("hotelId");
  const [loading, setLoading] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<DocumentWithHotel[]>([]);
  const [hotelDocuments, setHotelDocuments] = useState<Document[]>([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  useEffect(() => {
    if (selectedHotelId) {
      fetchHotelDocuments(selectedHotelId);
    } else {
      // Reset hotel documents when no hotel is selected
      setHotelDocuments([]);
      // Fetch all pending documents when no hotel is selected
      fetchPendingDocuments();
    }
  }, [selectedHotelId]);

  const fetchPendingDocuments = async () => {
    setLoading(true);
    try {
      const docs = await adminService.getPendingDocuments();
      setPendingDocuments(docs);
    } catch (error) {
      console.error("Error fetching pending documents:", error);
      showToast("Failed to load pending documents", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHotelDocuments = async (hotelId: string) => {
    setLoading(true);
    try {
      const docs = await adminService.getHotelDocuments(hotelId);
      console.log("Fetched hotel documents:", docs, "for hotel:", hotelId);
      setHotelDocuments(docs);
    } catch (error) {
      console.error("Error fetching hotel documents:", error);
      showToast("Failed to load hotel documents", "error");
      setHotelDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (remarks: string) => {
    if (!selectedDocument) return;
    setIsProcessing(true);
    try {
      await adminService.approveDocument(selectedDocument.id, remarks);
      showToast("Document approved successfully", "success");
      setShowApproveModal(false);
      setSelectedDocument(null);
      await fetchPendingDocuments();
      if (selectedHotelId) {
        await fetchHotelDocuments(selectedHotelId);
      }
    } catch (error) {
      console.error("Error approving document:", error);
      showToast("Failed to approve document", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (remarks: string) => {
    if (!selectedDocument) return;
    setIsProcessing(true);
    try {
      await adminService.rejectDocument(selectedDocument.id, remarks);
      showToast("Document rejected successfully", "success");
      setShowRejectModal(false);
      setSelectedDocument(null);
      await fetchPendingDocuments();
      if (selectedHotelId) {
        await fetchHotelDocuments(selectedHotelId);
      }
    } catch (error) {
      console.error("Error rejecting document:", error);
      showToast("Failed to reject document", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleView = (document: Document) => {
    setViewingDocument(document);
    setShowViewerModal(true);
  };

  const openApproveModal = (document: Document) => {
    setSelectedDocument(document);
    setShowApproveModal(true);
  };

  const openRejectModal = (document: Document) => {
    setSelectedDocument(document);
    setShowRejectModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getDocTypeLabel = (docType: string) => {
    return DOCUMENT_TYPES[docType] || docType;
  };

  const isImage = (contentType: string) => {
    return contentType.startsWith("image/");
  };

  const isPDF = (contentType: string) => {
    return contentType === "application/pdf";
  };

  // Filter documents: if hotel selected, show only that hotel's pending documents
  // Otherwise show all pending documents
  const documentsToShow = selectedHotelId 
    ? hotelDocuments.filter(doc => doc.status === "PENDING")
    : pendingDocuments;

  if (loading && !selectedHotelId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Document Review</h1>
          <p className="text-gray-500 mt-2">Review and approve/reject pending hotel documents</p>
          {selectedHotelId && (
            <p className="text-sm text-blue-600 mt-2">
              Showing documents for selected hotel
            </p>
          )}
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading && selectedHotelId ? (
            <div className="p-12 text-center">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading documents...</p>
            </div>
          ) : documentsToShow.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedHotelId ? "No pending documents for this hotel" : "No pending documents"}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedHotelId ? "This hotel has no pending documents to review" : "All documents have been reviewed"}
              </p>
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
                      Remarks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentsToShow.map((document) => (
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {formatDate(document.uploadedAt)}
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
                          <button
                            onClick={() => openApproveModal(document)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openRejectModal(document)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
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

        {/* Approve Modal */}
        <ApproveRejectModal
          isOpen={showApproveModal}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedDocument(null);
          }}
          onConfirm={handleApprove}
          type="approve"
          isLoading={isProcessing}
        />

        {/* Reject Modal */}
        <ApproveRejectModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedDocument(null);
          }}
          onConfirm={handleReject}
          type="reject"
          isLoading={isProcessing}
        />

        {/* Document Viewer Modal */}
        {showViewerModal && viewingDocument && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => {
              setShowViewerModal(false);
              setViewingDocument(null);
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
                      {getDocTypeLabel(viewingDocument.docType)}
                    </h3>
                    <p className="text-sm text-gray-500">{viewingDocument.fileName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={viewingDocument.fileUrl}
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
                      setViewingDocument(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Content */}
              <div className="flex-1 overflow-auto p-6 bg-gray-100 flex items-center justify-center">
                {isImage(viewingDocument.contentType) ? (
                  <div className="max-w-full max-h-[calc(90vh-120px)] flex items-center justify-center">
                    <img
                      src={viewingDocument.fileUrl}
                      alt={viewingDocument.fileName}
                      className="max-w-full max-h-full object-contain rounded-2xl shadow-lg"
                    />
                  </div>
                ) : isPDF(viewingDocument.contentType) ? (
                  <div className="w-full h-full min-h-[500px]">
                    <iframe
                      src={viewingDocument.fileUrl}
                      className="w-full h-full min-h-[500px] rounded-2xl border border-gray-300"
                      title={viewingDocument.fileName}
                    />
                  </div>
                ) : (
                  <div className="text-center p-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Preview not available
                    </h4>
                    <p className="text-sm text-gray-600 mb-6">
                      This file type ({viewingDocument.contentType}) cannot be previewed in the browser.
                    </p>
                    <a
                      href={viewingDocument.fileUrl}
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
                )}
              </div>

              {/* Footer Info */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">File Size:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {formatFileSize(viewingDocument.fileSize)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Content Type:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {viewingDocument.contentType}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Uploaded:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {formatDate(viewingDocument.uploadedAt)}
                    </span>
                  </div>
                </div>
                {viewingDocument.remarks && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-gray-500 text-sm">Remarks:</span>
                    <p className="text-gray-900 text-sm mt-1 italic">{viewingDocument.remarks}</p>
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
