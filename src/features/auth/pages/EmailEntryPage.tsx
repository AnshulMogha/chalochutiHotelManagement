import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui";
import { authService } from "../services/authService";
import { Mail, ArrowRight, Shield, Sparkles } from "lucide-react";
import { emailSchema } from "@/shared/validation/email.schema";
import { AxiosError } from "axios";
import type { ApiFailureResponse } from "@/services/api/types/api";

export default function EmailEntryPage() {
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = emailSchema.safeParse(email);

    if (!result.success) {
      console.log(result);
      const firstError = result.error.issues[0]?.message ?? "Invalid email";
      setError(firstError);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.sendOtp(email);
      navigate(`/auth/verify-otp`, {
        state: {
          tempToken: response.tempToken,
          tempTokenExpiry: response.tempTokenExpiry,
          email: email,
        },
      });
    } catch (err: unknown) {
      const error = err as AxiosError<ApiFailureResponse>;

      if (error.response?.data.statusCode === 500) {
        setError("Something went wrong. Please try again.");
      } else
        setError(
          error.response?.data.message ||
            "Failed to login with email. Please try again."
        );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-50"></div>
            <div className="relative bg-linear-to-br from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Hotel Onboard
        </h1>
        <p className="text-gray-600 font-medium">Management System</p>
      </div>

      {/* Main Card */}
      <Card
        variant="elevated"
        className="border-0 shadow-2xl backdrop-blur-sm bg-white/95"
      >
        <CardHeader className="text-center pb-4 relative">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full blur-2xl opacity-30"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-100 rounded-full blur-2xl opacity-30"></div>

          <div className="relative">
            <div className="mx-auto mb-6 relative">
              <div className="relative w-20 h-20 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-3 h-3 text-yellow-800" />
              </div>
            </div>

            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </CardTitle>
            <p className="text-gray-600 text-base">
              Enter your email to receive a verification code
            </p>
          </div>
        </CardHeader>

        <CardContent className="relative">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Input
                  icon={<Mail className="w-5 h-5 text-gray-400" />}
                  type="text"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  error={error}
                  disabled={isLoading}
                  autoFocus
                  className="text-base pl-11"
                  label=""
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            >
              {!isLoading && (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
