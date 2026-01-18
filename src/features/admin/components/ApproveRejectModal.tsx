import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { Textarea } from "@/components/ui/Textarea";

interface ApproveRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  type: "approve" | "reject";
  isLoading?: boolean;
}

export function ApproveRejectModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  isLoading = false,
}: ApproveRejectModalProps) {
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
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <h2 className="text-xl font-bold text-gray-900">
            {type === "approve" ? "Approve Hotel" : "Reject Hotel"}
          </h2>
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
              className="flex-1"
            >
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

