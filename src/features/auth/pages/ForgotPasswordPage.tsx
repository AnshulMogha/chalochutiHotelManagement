import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Mail, Sparkles } from "lucide-react";
import { AxiosError } from "axios";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import { authService } from "../services/authService";
import { emailSchema } from "@/shared/validation/email.schema";
import type { ApiFailureResponse } from "@/services/api/types/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      const firstError = emailResult.error.issues[0]?.message ?? "Invalid email";
      setError(firstError);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword({ email });
      if (!response.resetToken) {
        setError("Invalid response from server. Please try again.");
        return;
      }
      navigate("/auth/forgot-password/verify-otp", {
        replace: true,
        state: {
          email,
          resetToken: response.resetToken,
          resetTokenExpiry: response.resetTokenExpiry,
        },
      });
    } catch (err: unknown) {
      const apiError = err as AxiosError<ApiFailureResponse>;
      if (apiError.response?.data.statusCode === 500) {
        setError("Something went wrong. Please try again.");
      } else {
        setError(
          apiError.response?.data.message ||
            "Failed to send forgot password email. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card variant="elevated" className="border-0 shadow-2xl backdrop-blur-sm bg-white/95">
        <CardHeader className="text-center pb-4 relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full blur-2xl opacity-30" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-100 rounded-full blur-2xl opacity-30" />
          <div className="relative">
            <div className="mx-auto mb-6 relative">
              <div className="relative w-20 h-20 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-3 h-3 text-yellow-800" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password
            </CardTitle>
            <p className="text-gray-600 text-base">
              Enter your email and we will send reset instructions
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                icon={<Mail className="w-5 h-5 text-gray-400" />}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                disabled={isLoading}
                className="text-base pl-11"
                label=""
              />
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
              {!isLoading ? "Send Email" : null}
            </Button>

            <button
              type="button"
              onClick={() => navigate("/auth/login")}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
