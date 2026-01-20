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
import { Mail, Lock, Shield, Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react";
import { emailSchema } from "@/shared/validation/email.schema";
import { AxiosError } from "axios";
import type { ApiFailureResponse } from "@/services/api/types/api";
import { useAuth } from "@/hooks/useAuth";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      const firstError = emailResult.error.issues[0]?.message ?? "Invalid email";
      setError(firstError);
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.superAdminLogin({
        email,
        password,
      });
      
      // Check if response has tempToken (requires OTP verification)
      if (response.tempToken && response.tempTokenExpiry) {
        // Navigate to OTP verification screen
        navigate(`/auth/verify-otp`, {
          state: {
            tempToken: response.tempToken,
            tempTokenExpiry: response.tempTokenExpiry,
            email: email,
            isSuperAdmin: true,
          },
        });
      } else if (response.accessToken && response.accessTokenExpiry) {
        // Direct login (no OTP required)
        login(response.accessToken, response.accessTokenExpiry);
        navigate("/", { replace: true });
      } else {
        setError("Invalid response from server. Please try again.");
      }
    } catch (err: unknown) {
      const error = err as AxiosError<ApiFailureResponse>;
      if (error.response?.data.statusCode === 500) {
        setError("Something went wrong. Please try again.");
      } else {
        setError(
          error.response?.data.message ||
            "Failed to login. Please check your credentials."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
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
                <Shield className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-3 h-3 text-yellow-800" />
              </div>
            </div>

            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Super Admin Access
            </CardTitle>
            <p className="text-gray-600 text-base">
              Sign in with your admin credentials
            </p>
          </div>
        </CardHeader>

        <CardContent className="relative">
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
              <div className="relative">
                <Input
                  icon={<Mail className="w-5 h-5 text-gray-400" />}
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  error={error ? "" : undefined}
                  disabled={isLoading}
                  autoFocus
                  className="text-base pl-11"
                  label=""
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  icon={<Lock className="w-5 h-5 text-gray-400" />}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  error={error ? "" : undefined}
                  disabled={isLoading}
                  className="text-base pl-11 pr-11"
                  label=""
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
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
                  Sign In
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

