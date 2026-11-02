import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AxiosError } from "axios";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Button, OtpInput } from "@/components/ui";
import { authService } from "../services/authService";
import type { ApiFailureResponse } from "@/services/api/types/api";
import { AuthSplitShell } from "../components/AuthSplitShell";

interface ForgotPasswordOtpState {
  email: string;
  resetToken: string;
  resetTokenExpiry?: string;
}

export default function ForgotPasswordOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as Partial<ForgotPasswordOtpState>;
  const { email, resetToken, resetTokenExpiry } = state;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(120);

  useEffect(() => {
    if (!email || !resetToken) {
      navigate("/auth/forgot-password", { replace: true });
      return;
    }
    if (resetTokenExpiry && new Date(resetTokenExpiry) < new Date()) {
      navigate("/auth/forgot-password", {
        replace: true,
        state: { message: "OTP session expired. Please send email again." },
      });
    }
  }, [navigate, email, resetToken, resetTokenExpiry]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (otpValue: string) => {
    setError("");
    if (!resetToken) {
      setError("Reset token missing. Please send email again.");
      return;
    }
    setIsLoading(true);
    try {
      await authService.verifyResetOtp({
        resetToken,
        otp: otpValue,
      });
      navigate("/auth/forgot-password/reset", {
        replace: true,
        state: {
          // Keep using the original token returned by forgot-password API.
          resetToken,
          otp: otpValue,
        },
      });
    } catch (err: unknown) {
      const apiError = err as AxiosError<ApiFailureResponse>;
      setError(
        apiError.response?.data.message || "Failed to verify OTP. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!resetToken || resendCooldown > 0) return;
    setError("");
    setIsResending(true);
    try {
      await authService.resendPasswordResetOtp({ resetToken });
      setResendCooldown(120);
    } catch (err: unknown) {
      const apiError = err as AxiosError<ApiFailureResponse>;
      setError(
        apiError.response?.data.message ||
          "Failed to resend OTP. Please try again.",
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthSplitShell>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        Verify reset code
      </h2>
      <p className="mt-1.5 text-sm text-gray-500">
        We&apos;ve sent a 6-digit code to{" "}
        <span className="font-medium text-gray-800">{email}</span>
      </p>

      <div className="mt-8 space-y-5">
        <OtpInput
          length={6}
          value={otp}
          onChange={(value) => {
            if (error) setError("");
            setOtp(value);
          }}
          onComplete={handleVerify}
          error={error}
          showErrorText={false}
          disabled={isLoading || isResending}
          inputClassName="h-12 w-12 rounded-xl border-0 bg-[#f1f3f8] text-lg font-semibold text-gray-900 focus:bg-[#eceff6] focus:ring-2 focus:ring-[#2f3d95]/30 focus:ring-offset-0"
        />

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => handleVerify(otp)}
          disabled={otp.length !== 6 || isLoading || isResending}
          className="h-12 w-full gap-2 rounded-xl bg-[#2f3d95] text-base font-semibold text-white shadow-lg shadow-[#2f3d95]/25 hover:bg-[#28357f]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify code
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => navigate("/auth/forgot-password", { replace: true })}
            className="flex items-center gap-1.5 text-gray-500 transition-colors hover:text-[#2f3d95] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || isResending}
          >
            <ArrowLeft className="h-4 w-4" />
            Change email
          </button>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isLoading || isResending || resendCooldown > 0}
            className="flex items-center gap-1.5 font-medium text-[#2f3d95] transition-colors hover:text-[#28357f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendCooldown > 0 ? (
              <span>Resend in {resendCooldown}s</span>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {isResending ? "Resending..." : "Resend code"}
              </>
            )}
          </button>
        </div>
      </div>
    </AuthSplitShell>
  );
}
