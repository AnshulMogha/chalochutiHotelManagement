import { useState } from "react";
import { Button } from "./Button";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VerifyButtonProps {
  onVerify: () => Promise<boolean> | boolean;
  verified?: boolean;
  disabled?: boolean;
  className?: string;
}

export function VerifyButton({
  onVerify,
  verified = false,
  disabled = false,
  className,
}: VerifyButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await onVerify();
    } finally {
      setIsVerifying(false);
    }
  };

  if (verified) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className={cn("gap-2", className)}
      >
        <Check className="w-4 h-4 text-green-600" />
        <span>Verified</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleVerify}
      disabled={disabled || isVerifying}
      isLoading={isVerifying}
      className={className}
    >
      {isVerifying ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Verifying...</span>
        </>
      ) : (
        <span>Verify</span>
      )}
    </Button>
  );
}

