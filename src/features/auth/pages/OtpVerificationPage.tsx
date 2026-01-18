import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  OtpInput,
} from "@/components/ui";
import { authService } from "../services/authService";
import { useAuth } from "@/hooks";
import { Shield, ArrowLeft, RefreshCw } from "lucide-react";
import type { ApiFailureResponse } from "@/services/api/types/api";
import type { AxiosError } from "axios";

export default function OtpVerificationPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { tempToken, tempTokenExpiry, email, isSuperAdmin } = useLocation()?.state || {};
  const [resendCooldown, setResendCooldown] = useState(60);

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    if (!tempToken || !tempTokenExpiry || !email) {
      navigate(isSuperAdmin ? "/auth/super-admin/login" : "/auth/login");
    }
  }, [navigate, tempToken, tempTokenExpiry, email, isSuperAdmin]);

  useEffect(() => {
    if (resendCooldown && resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async (otpValue: string) => {
    setError("");
    setIsLoading(true);
    if (tempTokenExpiry && new Date(tempTokenExpiry) < new Date()) {
      navigate(isSuperAdmin ? "/auth/super-admin/login" : "/auth/login", { replace: true });
      return;
    }

    try {
      // Use different API endpoint for super admin
      const response = isSuperAdmin
        ? await authService.verifyOtpAdmin({
            otp: otpValue,
            tempToken,
          })
        : await authService.verifyOtp({
            otp: otpValue,
            tempToken,
          });
      login(response.accessToken, response.accessTokenExpiry);
      // Redirect to home
      navigate("/");
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "message" in err
          ? (err.message as string)
          : "Failed to verify OTP. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (tempTokenExpiry && new Date(tempTokenExpiry) < new Date()) {
      navigate(isSuperAdmin ? "/auth/super-admin/login" : "/auth/login", { replace: true });
      return;
    }
    if (resendCooldown > 0) return;

    setError("");
    setIsLoading(true);

    try {
      // Use different API endpoint for super admin
      if (isSuperAdmin) {
        await authService.resendOtpAdmin(tempToken);
      } else {
        await authService.resendOtp(tempToken);
      }

      setResendCooldown(60); // 60 second cooldown
      setOtp("");
      setError("");
    } catch (err: unknown) {
      const error = err as AxiosError<ApiFailureResponse>;
      setError(
        error.response?.data.message ||
          "Failed to resend OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpChange = (value: string) => {
    if (error) {
      setError("");
    }
    setOtp(value);
  };

  const handleBack = () => {
    navigate(isSuperAdmin ? "/auth/super-admin/login" : "/auth/login", { replace: true });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card variant="elevated" className="border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Verify Your Email
          </CardTitle>
          <p className="text-gray-600 mt-2">
            We've sent a 6-digit code to
            <br />
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <OtpInput
                length={6}
                value={otp}
                onChange={onOtpChange}
                onComplete={handleVerify}
                error={error}
                disabled={isLoading}
              />
            </div>

            <Button
              onClick={() => handleVerify(otp)}
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={otp.length !== 6 || isLoading}
              className="w-full"
            >
              Verify & Login
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Change Email
              </button>

              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? (
                  <>
                    <span>Resend in {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Resend Code
                  </>
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
