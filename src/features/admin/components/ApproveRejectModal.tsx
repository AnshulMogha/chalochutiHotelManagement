import { useState } from "react";
import { X, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { Textarea } from "@/components/ui/Textarea";

interface ApproveRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  type: "approve" | "reject";
  isLoading?: boolean;
  /** Optional title; defaults to "Approve Document" / "Reject Document" */
  title?: string;
}

export function ApproveRejectModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  isLoading = false,
  title,
}: ApproveRejectModalProps) {
  const defaultTitle = type === "approve" ? "Approve Document" : "Reject Document";
  const displayTitle = title ?? defaultTitle;
  const [remarks, setRemarks] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      alert("Please enter remarks");
      return;
    }
    onConfirm(remarks);
    setRemarks("");
  };

  const handleClose = () => {
    setRemarks("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between px-6 py-4 border-b rounded-t-2xl ${
            type === "approve"
              ? "bg-emerald-100 border-emerald-300"
              : "bg-rose-100 border-rose-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                type === "approve" ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"
              }`}
            >
              {type === "approve" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {displayTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                type === "approve"
                  ? "Enter approval remarks..."
                  : "Enter rejection remarks..."
              }
              rows={4}
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={type === "approve" ? "primary" : "danger"}
              disabled={isLoading || !remarks.trim()}
              className={`flex-1 gap-2 ${
                type === "approve"
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white border-0"
                  : "bg-rose-700 hover:bg-rose-800 text-white border-0"
              }`}
            >
              {type === "approve" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {isLoading
                ? "Processing..."
                : type === "approve"
                ? "Approve"
                : "Reject"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

