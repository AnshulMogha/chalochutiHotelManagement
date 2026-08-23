import { useEffect, useRef, useState } from "react";
import { Download, FileWarning, Loader2, X } from "lucide-react";
import { bookingService } from "@/features/bookings/services/bookingService";
import type {
  HelpdeskVoucherAudience,
  HelpdeskVoucherDocumentType,
} from "../services/helpdeskBookingService";

interface HelpdeskVoucherModalProps {
  open: boolean;
  onClose: () => void;
  /** Numeric booking list / booking id — same as booking list voucher API. */
  bookingId: string | number;
  bookingReference: string;
  audience: HelpdeskVoucherAudience;
  documentType: HelpdeskVoucherDocumentType;
}

const AUDIENCE_LABELS: Record<HelpdeskVoucherAudience, string> = {
  HOTEL: "Hotel",
  CUSTOMER: "Customer",
  AGENT: "Agent",
};

const DOCUMENT_LABELS: Record<HelpdeskVoucherDocumentType, string> = {
  BOOKING: "Booking",
  CANCELLATION: "Cancellation",
};

export function HelpdeskVoucherModal({
  open,
  onClose,
  bookingId,
  bookingReference,
  audience,
  documentType,
}: HelpdeskVoucherModalProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || bookingId == null || bookingId === "") return;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setBlobUrl(null);
    setBlob(null);
    setError(null);
    setLoading(true);

    let cancelled = false;
    bookingService
      .getVoucher(String(bookingId), { audience, documentType })
      .then((data) => {
        if (cancelled) return;
        const url = URL.createObjectURL(data);
        blobUrlRef.current = url;
        setBlob(data);
        setBlobUrl(url);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load voucher");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [open, bookingId, audience, documentType]);

  useEffect(() => {
    if (!open) {
      setBlobUrl(null);
      setBlob(null);
      setError(null);
    }
  }, [open]);

  const handleSave = () => {
    if (!blob || !blobUrl) return;
    const name = (bookingReference || String(bookingId)).replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );
    const filename = `voucher-${audience.toLowerCase()}-${documentType.toLowerCase()}-${name}.pdf`;
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  if (!open) return null;

  const title = `${AUDIENCE_LABELS[audience]} ${DOCUMENT_LABELS[documentType]} Voucher`;

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
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-2">
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
                Loading voucher...
              </p>
            </div>
          ) : null}
          {error ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <FileWarning className="mb-4 h-12 w-12 text-amber-500" />
              <p className="text-sm font-medium text-gray-700">{error}</p>
            </div>
          ) : null}
          {blobUrl && !loading && !error ? (
            <iframe
              title={title}
              src={blobUrl}
              className="h-full min-h-0 w-full border-0 bg-white"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
