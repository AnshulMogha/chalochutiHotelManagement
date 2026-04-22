import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import { Lock, Eye, EyeOff } from "lucide-react";
import { authService } from "../services/authService";
import { AxiosError } from "axios";
import type { ApiFailureResponse } from "@/services/api/types/api";

interface ChangePasswordState {
  pwdChangeToken: string;
  pwdChangeExpiry: string;
  email?: string;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as Partial<ChangePasswordState>;
  const { pwdChangeToken, pwdChangeExpiry, email } = state;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pwdChangeToken || !pwdChangeExpiry) {
      navigate("/auth/login", { replace: true });
      return;
    }

    if (new Date(pwdChangeExpiry) < new Date()) {
      navigate("/auth/login", {
        replace: true,
        state: { message: "Password change session expired. Please login again." },
      });
    }
  }, [navigate, pwdChangeToken, pwdChangeExpiry]);

  const validate = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return "All fields are required.";
    }
    if (newPassword.length < 6) {
      return "New password must be at least 6 characters.";
    }
    if (oldPassword === newPassword) {
      return "New password must be different from old password.";
    }
    if (newPassword !== confirmPassword) {
      return "New password and confirm password do not match.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!pwdChangeToken) {
      setError("Password change token is missing. Please login again.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword({
        pwdChangeToken,
        oldPassword,
        newPassword,
      });
      navigate("/auth/login", {
        replace: true,
        state: { message: "Password changed successfully. Please login." },
      });
    } catch (err: unknown) {
      const apiError = err as AxiosError<ApiFailureResponse>;
      setError(
        apiError.response?.data?.message ||
          "Failed to change password. Please try again.",
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
            Change Password
          </CardTitle>
          <p className="text-gray-600 text-sm mt-2">
            {email ? `Set a new password for ${email}` : "Set a new password to continue"}
          </p>
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
                type={showOldPassword ? "text" : "password"}
                label=""
                placeholder="Old Password"
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value);
                  setError("");
                }}
                disabled={isLoading}
                className="pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showOldPassword ? "Hide old password" : "Show old password"}
              >
                {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                icon={<Lock className="w-5 h-5 text-gray-400" />}
                type={showNewPassword ? "text" : "password"}
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
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
            >
              {!isLoading ? "Change Password" : null}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
