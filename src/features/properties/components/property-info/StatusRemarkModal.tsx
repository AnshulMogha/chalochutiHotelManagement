import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

interface StatusRemarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remark: string) => void;
  currentRemark?: string;
  status: "LIVE" | "SUSPENDED";
  isLoading?: boolean;
}

export function StatusRemarkModal({
  isOpen,
  onClose,
  onConfirm,
  currentRemark = "",
  status,
  isLoading = false,
}: StatusRemarkModalProps) {
  const [remark, setRemark] = useState(currentRemark);

  useEffect(() => {
    if (isOpen) {
      setRemark(currentRemark);
    }
  }, [isOpen, currentRemark]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(remark);
  };

  const handleClose = () => {
    setRemark(currentRemark);
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
            status === "LIVE"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <h2 className="text-xl font-bold text-gray-900">
            {status === "LIVE" ? "Set Hotel to LIVE" : "Set Hotel to SUSPENDED"}
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
            <Label htmlFor="remark">
              Remark <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={`Enter remark for ${status === "LIVE" ? "activating" : "suspending"} the hotel...`}
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
              variant="primary"
              disabled={isLoading || !remark.trim()}
              className={`flex-1 ${
                status === "LIVE"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isLoading ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

