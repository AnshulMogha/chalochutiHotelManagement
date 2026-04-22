import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  message: string;
  type: "success" | "error";
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        // Above Radix Sheet overlay (z-[100]) / content (z-[101])
        "fixed top-4 right-4 z-[200] flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg",
        "transition-all duration-300 ease-in-out",
        "min-w-[300px] max-w-lg",
        type === "success"
          ? "bg-green-50 border border-green-200 text-green-800"
          : "bg-red-50 border border-red-200 text-red-800"
      )}
      role="alert"
    >
      <div className="flex-shrink-0">
        {type === "success" ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600" />
        )}
      </div>
      <p
        className={cn(
          "flex-1 text-sm font-medium",
          type === "error" && "whitespace-pre-wrap break-words",
        )}
      >
        {message}
      </p>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    isVisible: boolean;
  }>({
    message: "",
    type: "success",
    isVisible: false,
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  return {
    toast,
    showToast,
    hideToast,
  };
}

