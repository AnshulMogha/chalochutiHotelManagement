import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AxiosError } from "axios";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { authService } from "../services/authService";
import type { ApiFailureResponse } from "@/services/api/types/api";

interface ResetPasswordState {
  resetToken: string;
  otp: string;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as Partial<ResetPasswordState>;
  const { resetToken, otp } = state;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!resetToken || !otp) {
      navigate("/auth/forgot-password", { replace: true });
    }
  }, [navigate, resetToken, otp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (!resetToken || !otp) {
      setError("Reset session not found. Please start again.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        resetToken,
        otp,
        newPassword,
      });
      navigate("/auth/login", {
        replace: true,
        state: { message: "Password reset successful. Please login." },
      });
    } catch (err: unknown) {
      const apiError = err as AxiosError<ApiFailureResponse>;
      setError(
        apiError.response?.data.message ||
          "Failed to reset password. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card variant="elevated" className="border-0 shadow-2xl backdrop-blur-sm bg-white/95">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Reset Password
          </CardTitle>
          <p className="text-gray-600 text-base mt-2">Set your new password</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="relative">
              <Input
                icon={<Lock className="w-5 h-5 text-gray-400" />}
                type={showPassword ? "text" : "password"}
                label=""
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                disabled={isLoading}
                className="pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide new password" : "Show new password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                icon={<Lock className="w-5 h-5 text-gray-400" />}
                type={showConfirmPassword ? "text" : "password"}
                label=""
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                disabled={isLoading}
                className="pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
              {!isLoading ? "Reset Password" : null}
            </Button>

            <button
              type="button"
              onClick={() => navigate("/auth/forgot-password/verify-otp", { replace: true })}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
