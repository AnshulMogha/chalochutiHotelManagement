import { useState, useEffect, useRef } from "react";
import { bookingService } from "../services/bookingService";
import { X, Download, Loader2, FileWarning } from "lucide-react";

interface VoucherViewModalProps {
  open: boolean;
  onClose: () => void;
  /** List item id (numeric id from booking list) for the voucher API */
  bookingId: string;
  /** Optional filename label for Save (e.g. booking reference) */
  bookingReference?: string;
}

export function VoucherViewModal({
  open,
  onClose,
  bookingId,
  bookingReference,
}: VoucherViewModalProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !bookingId) {
      return;
    }
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
      .getVoucher(bookingId) // list item id
      .then((data) => {
        if (cancelled) return;
        const url = URL.createObjectURL(data);
        blobUrlRef.current = url;
        setBlob(data);
        setBlobUrl(url);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error fetching voucher:", err);
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
  }, [open, bookingId]);

  useEffect(() => {
    if (!open) {
      setBlobUrl(null);
      setBlob(null);
      setError(null);
    }
  }, [open]);

  const handleSave = () => {
    if (!blob || !blobUrl) return;
    const name = (bookingReference || bookingId || "voucher").replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `voucher-${name}.pdf`;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      onClick={onClose}
    >
      <div
        className="flex flex-col h-full w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Booking Voucher</h3>
          <div className="flex items-center gap-2">
            {blob && blobUrl && (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2f3d95] text-white text-sm font-medium hover:bg-[#252d73] transition-colors"
              >
                <Download className="w-4 h-4" />
                Save
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col bg-gray-100 overflow-hidden">
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-[#2f3d95] animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-600">Loading voucher...</p>
            </div>
          )}
          {error && (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <FileWarning className="w-12 h-12 text-amber-500 mb-4" />
              <p className="text-sm font-medium text-gray-700">{error}</p>
            </div>
          )}
          {blobUrl && !loading && !error && (
            <iframe
              title="Voucher"
              src={blobUrl}
              className="w-full h-full min-h-0 border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}
