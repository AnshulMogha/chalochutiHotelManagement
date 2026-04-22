import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AxiosError } from "axios";
import { ArrowLeft, RefreshCw, Shield } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, OtpInput } from "@/components/ui";
import { authService } from "../services/authService";
import type { ApiFailureResponse } from "@/services/api/types/api";

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
    <div className="w-full max-w-md mx-auto">
      <Card variant="elevated" className="border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Verify Reset OTP
          </CardTitle>
          <p className="text-gray-600 mt-2">
            We've sent a 6-digit code to
            <br />
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <OtpInput
              length={6}
              value={otp}
              onChange={(value) => {
                if (error) setError("");
                setOtp(value);
              }}
              onComplete={handleVerify}
              error={error}
              disabled={isLoading}
            />

            <Button
              onClick={() => handleVerify(otp)}
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={otp.length !== 6 || isLoading}
              className="w-full"
            >
              Verify OTP
            </Button>

            <button
              type="button"
              onClick={() => navigate("/auth/forgot-password", { replace: true })}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              disabled={isLoading || isResending}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isLoading || isResending || resendCooldown > 0}
              className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? (
                <span>Resend OTP in {resendCooldown}s</span>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {isResending ? "Resending..." : "Resend OTP"}
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
