import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileText, FileWarning, Loader2, X } from "lucide-react";
import {
  getDocumentId,
  getStoredDocumentUrl,
  usesSignedDocumentDownloadUrls,
} from "@/features/admin/services/documentDownloadUrl";
import { propertyService } from "../../services/propertyService";
import type { OnboardingDocument } from "../../services/api.types";

interface OnboardingDocumentViewModalProps {
  open: boolean;
  onClose: () => void;
  hotelId: string;
  document: OnboardingDocument;
  title: string;
}

function isPdfDocument(document: OnboardingDocument, url = "") {
  const fileName = String(document.fileName || "").toLowerCase();
  const contentType = String(document.contentType || "").toLowerCase();
  const lowerUrl = url.toLowerCase();
  return (
    contentType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    lowerUrl.includes(".pdf")
  );
}

function isImageDocument(document: OnboardingDocument) {
  return String(document.contentType || "").startsWith("image/");
}

async function resolveDocumentSourceUrl(
  hotelId: string,
  document: OnboardingDocument,
): Promise<string> {
  if (usesSignedDocumentDownloadUrls()) {
    const docId = getDocumentId(document);
    if (docId == null) {
      throw new Error("Document id missing");
    }
    const data = await propertyService.getOnboardingDocumentDownloadUrl(
      hotelId,
      docId,
    );
    return String(data.downloadUrl || "").trim();
  }
  return getStoredDocumentUrl(document);
}

async function fetchDocumentBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) {
    throw new Error(`Failed to load document (${response.status})`);
  }
  return response.blob();
}

/**
 * Full-page document viewer for onboarding Documents step
 * (same pattern as booking voucher: blob URL + iframe).
 */
export function OnboardingDocumentViewModal({
  open,
  onClose,
  hotelId,
  document,
  title,
}: OnboardingDocumentViewModalProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !hotelId) return;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setBlobUrl(null);
    setBlob(null);
    setSourceUrl(null);
    setError(null);
    setLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const url = await resolveDocumentSourceUrl(hotelId, document);
        if (!url) {
          throw new Error("Document URL not available");
        }
        if (cancelled) return;
        setSourceUrl(url);

        // Images can render from the source URL; PDFs use a blob for embed.
        if (isImageDocument(document)) {
          setBlobUrl(url);
          return;
        }

        const data = await fetchDocumentBlob(url);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(data);
        blobUrlRef.current = objectUrl;
        setBlob(data);
        setBlobUrl(objectUrl);
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading onboarding document:", err);
        // If blob fetch is blocked (CORS), still try embedding the source URL
        // for PDFs — same visual result as voucher when the host allows it.
        try {
          const url = await resolveDocumentSourceUrl(hotelId, document);
          if (cancelled) return;
          if (url && isPdfDocument(document, url)) {
            setSourceUrl(url);
            setBlobUrl(url);
            setError(null);
            return;
          }
        } catch {
          // ignore secondary resolve failure
        }
        setError("Failed to load document");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [open, hotelId, document]);

  useEffect(() => {
    if (!open) {
      setBlobUrl(null);
      setBlob(null);
      setSourceUrl(null);
      setError(null);
    }
  }, [open]);

  const handleSave = () => {
    if (!blob || !blobUrl) return;
    const name = String(document.fileName || title || "document").replace(
      /[^a-zA-Z0-9-_.]/g,
      "_",
    );
    const anchor = window.document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = name;
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
  };

  if (!open) return null;

  const showPdf = Boolean(blobUrl) && isPdfDocument(document, sourceUrl || "");
  const showImage = Boolean(blobUrl) && isImageDocument(document);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-gray-900">
              {title}
            </h3>
            {document.fileName ? (
              <p className="truncate text-sm text-gray-500">{document.fileName}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {blob && blobUrl ? (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#252d73]"
              >
                <Download className="h-4 w-4" />
                Save
              </button>
            ) : null}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
                title="Open in new tab"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#2f3d95]" />
              <p className="text-sm font-medium text-gray-600">
                Loading document...
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <FileWarning className="mb-4 h-12 w-12 text-amber-500" />
              <p className="mb-4 text-sm font-medium text-gray-700">{error}</p>
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#252d73]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </a>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && showPdf ? (
            <iframe
              title={title}
              src={blobUrl!}
              className="h-full min-h-0 w-full border-0 bg-white"
            />
          ) : null}

          {!loading && !error && showImage ? (
            <div className="flex flex-1 items-center justify-center overflow-auto p-6">
              <img
                src={blobUrl!}
                alt={document.fileName || title}
                className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>
          ) : null}

          {!loading && !error && blobUrl && !showPdf && !showImage ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <FileText className="mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-sm font-medium text-gray-700">
                Preview not available for this file type
              </p>
              <p className="mb-6 text-xs text-gray-500">
                Download or open the file in a new tab to view it.
              </p>
              <div className="flex items-center gap-3">
                {blob ? (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2f3d95] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#252d73]"
                  >
                    <Download className="h-4 w-4" />
                    Save
                  </button>
                ) : null}
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in new tab
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
