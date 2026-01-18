import {
  forwardRef,
  useRef,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { cn } from "../../lib/utils";

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const OtpInput = forwardRef<HTMLDivElement, OtpInputProps>(
  (
    {
      length = 4,
      value = "",
      onChange,
      onComplete,
      error,
      disabled = false,
      className,
    },
    ref
  ) => {
    const [otp, setOtp] = useState<string[]>(
      value.split("").slice(0, length) || Array(length).fill("")
    );
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, newValue: string) => {
      // Only allow digits
      if (newValue && !/^\d$/.test(newValue)) {
        return;
      }

      const newOtp = [...otp];
      newOtp[index] = newValue;
      setOtp(newOtp);

      const otpValue = newOtp.join("");
      onChange?.(otpValue);

      // Move to next input if value entered
      if (newValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Call onComplete if all digits are filled
      if (
        otpValue.length === length &&
        otpValue.split("").every((d) => d !== "")
      ) {
        onComplete?.(otpValue);
      }
    };

    const handleKeyDown = (
      index: number,
      e: KeyboardEvent<HTMLInputElement>
    ) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text/plain").slice(0, length);
      const digits = pastedData.split("").filter((char) => /^\d$/.test(char));

      if (digits.length > 0) {
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < length) {
            newOtp[i] = digit;
          }
        });
        setOtp(newOtp);

        const otpValue = newOtp.join("");
        onChange?.(otpValue);

        // Focus the next empty input or the last one
        const nextIndex = Math.min(digits.length, length - 1);
        inputRefs.current[nextIndex]?.focus();

        if (otpValue.length === length) {
          onComplete?.(otpValue);
        }
      }
    };

    return (
      <div ref={ref} className={cn("w-full relative", className)}>
        <div className="flex gap-3 justify-center">
          {Array.from({ length }).map((_, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={otp[index] || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleChange(index, e.target.value)
              }
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                handleKeyDown(index, e)
              }
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                "w-14 h-14 text-center text-2xl font-semibold rounded-lg border-2",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all",
                "disabled:bg-gray-100 disabled:cursor-not-allowed",
                error
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:ring-blue-500 focus:border-blue-500",
                "bg-white text-gray-900"
              )}
            />
          ))}
        </div>
        {error && (
          <p
            className="mt-1 absolute w-full top-full text-sm text-red-600 text-center"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

OtpInput.displayName = "OtpInput";
