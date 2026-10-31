import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button, OtpInput } from "@/components/ui";
import { authService } from "../services/authService";
import { useAuth } from "@/hooks";
import { ArrowLeft, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import logo from "@/assets/originallogo.webp";
import type { ApiFailureResponse } from "@/services/api/types/api";
import type { AxiosError } from "axios";

export default function OtpVerificationPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { tempToken, tempTokenExpiry, email } = useLocation()?.state || {};
  const [resendCooldown, setResendCooldown] = useState(60);

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    if (!tempToken || !tempTokenExpiry || !email) {
      navigate("/auth/login");
    }
  }, [navigate, tempToken, tempTokenExpiry, email]);

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
      navigate("/auth/login", { replace: true });
      return;
    }

    try {
      const response = await authService.verifyOtpAdmin({
        otp: otpValue,
        tempToken,
      });
      if (response.pwdChangeToken && response.pwdChangeExpiry) {
        navigate("/auth/change-password", {
          replace: true,
          state: {
            pwdChangeToken: response.pwdChangeToken,
            pwdChangeExpiry: response.pwdChangeExpiry,
            email,
          },
        });
      } else if (response.accessToken && response.accessTokenExpiry) {
        login(response.accessToken, response.accessTokenExpiry);
        navigate("/");
      } else {
        setError("Invalid response from server. Please try again.");
      }
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
      navigate("/auth/login", { replace: true });
      return;
    }
    if (resendCooldown > 0) return;

    setError("");
    setIsLoading(true);

    try {
      await authService.resendOtpAdmin(tempToken);

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
    navigate("/auth/login", { replace: true });
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
              Verify your email
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">
              We&apos;ve sent a 6-digit code to{" "}
              <span className="font-medium text-gray-800">{email}</span>
            </p>

            <div className="mt-8 space-y-5">
              <OtpInput
                length={6}
                value={otp}
                onChange={onOtpChange}
                onComplete={handleVerify}
                error={error}
                showErrorText={false}
                disabled={isLoading}
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
                disabled={otp.length !== 6 || isLoading}
                className="h-12 w-full gap-2 rounded-xl bg-[#2f3d95] text-base font-semibold text-white shadow-lg shadow-[#2f3d95]/25 hover:bg-[#28357f]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Login
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-gray-500 transition-colors hover:text-[#2f3d95] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change Email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="flex items-center gap-1.5 font-medium text-[#2f3d95] transition-colors hover:text-[#28357f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendCooldown > 0 ? (
                    <span>Resend in {resendCooldown}s</span>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Resend Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
