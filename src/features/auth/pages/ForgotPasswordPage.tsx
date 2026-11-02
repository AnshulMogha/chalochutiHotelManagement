import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui";
import { authService } from "../services/authService";
import { emailSchema } from "@/shared/validation/email.schema";
import type { ApiFailureResponse } from "@/services/api/types/api";
import { AuthSplitShell } from "../components/AuthSplitShell";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice =
    location.state &&
    typeof location.state === "object" &&
    "message" in location.state
      ? String((location.state as { message?: string }).message || "")
      : "";
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
    <AuthSplitShell>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        Forgot password
      </h2>
      <p className="mt-1.5 text-sm text-gray-500">
        Enter your email and we will send a reset code
      </p>

      {notice ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label htmlFor="forgot-email" className="sr-only">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
              autoComplete="email"
              autoFocus
              disabled={isLoading}
              placeholder="Email address"
              className="h-12 w-full rounded-xl border-0 bg-[#f1f3f8] pl-10 pr-4 text-gray-900 transition-all placeholder:text-gray-400 focus:bg-[#eceff6] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full gap-2 rounded-xl bg-[#2f3d95] text-base font-semibold text-white shadow-lg shadow-[#2f3d95]/25 hover:bg-[#28357f]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Send email
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={() => navigate("/auth/login")}
          className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-[#2f3d95] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>
      </form>
    </AuthSplitShell>
  );
}
