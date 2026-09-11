import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui";
import { authService } from "../services/authService";
import logo from "@/assets/originallogo.webp";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
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
  const location = useLocation();
  const { login } = useAuth();
  const successMessage =
    location.state &&
    typeof location.state === "object" &&
    "message" in location.state
      ? String((location.state as { message?: string }).message || "")
      : "";

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
      const response = await authService.login({
        email,
        password,
      });

      if (response.pwdChangeToken && response.pwdChangeExpiry) {
        navigate("/auth/change-password", {
          state: {
            pwdChangeToken: response.pwdChangeToken,
            pwdChangeExpiry: response.pwdChangeExpiry,
            email,
          },
          replace: true,
        });
      } else if (response.tempToken && response.tempTokenExpiry) {
        // Navigate to OTP verification screen
        navigate(`/auth/verify-otp`, {
          state: {
            tempToken: response.tempToken,
            tempTokenExpiry: response.tempTokenExpiry,
            email: email,
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
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-black/20 min-h-[min(540px,calc(100vh-3rem))]">
        <aside className="relative hidden w-[44%] shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-center">
          <div className="absolute inset-0 bg-[#2f3d95]" />

          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/15 blur-sm"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-[18%] -right-10 h-44 w-44 rounded-full bg-white/20 shadow-inner"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-[20%] h-64 w-64 rounded-full bg-black/10 blur-sm"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[12%] right-[8%] h-28 w-28 rounded-full bg-white/25"
          />

          <svg
            aria-hidden
            className="pointer-events-none absolute top-0 -right-px h-full w-16 text-white"
            viewBox="0 0 64 800"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 C40,120 40,680 0,800 L64,800 L64,0 Z"
              fill="currentColor"
            />
          </svg>

          <div className="relative z-10 px-10 py-12 xl:px-14">
            <img
              src={logo}
              alt="ChaloChutti logo"
              className="mb-10 h-9 w-auto object-contain"
            />
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
              Welcome
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-white xl:text-4xl">
              Hotel
              <br />
              Management
            </h1>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">
              Manage hotels, bookings, and operations from one secure workspace
              built for your team.
            </p>
          </div>
        </aside>

        <main className="relative flex flex-1 flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
          <div className="mb-8 flex justify-center lg:hidden">
            <img
              src={logo}
              alt="ChaloChutti logo"
              className="h-8 w-auto object-contain"
            />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -right-10 hidden h-36 w-36 rounded-full bg-[#2f3d95]/15 lg:block"
          />

          <div className="relative mx-auto w-full max-w-sm">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Sign in
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Enter your credentials to access your account
            </p>

            {successMessage ? (
              <div className="mt-5 rounded-xl border border-green-200/80 bg-green-50/90 px-4 py-3 text-sm text-green-800">
                {successMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="sr-only">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-email"
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

              <div className="space-y-2">
                <label htmlFor="login-password" className="sr-only">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    placeholder="Password"
                    className="h-12 w-full rounded-xl border-0 bg-[#f1f3f8] pl-10 pr-20 text-gray-900 transition-all placeholder:text-gray-400 focus:bg-[#eceff6] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-xs font-semibold uppercase tracking-wide text-[#2f3d95] transition-colors hover:text-[#2f3d95]/80 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : null}

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/auth/forgot-password")}
                  disabled={isLoading}
                  className="text-sm text-gray-500 transition-colors hover:text-[#2f3d95] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                onClick={handleSubmit}
                type="submit"
                disabled={isLoading}
                className="h-12 w-full gap-2 rounded-xl bg-[#2f3d95] text-base font-semibold text-white shadow-lg shadow-[#2f3d95]/25 hover:bg-[#28357f]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs leading-relaxed text-gray-400">
              Use your registered work email to continue.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
