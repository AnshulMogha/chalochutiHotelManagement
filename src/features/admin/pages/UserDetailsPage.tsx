import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button, LoadingSpinner } from "@/components/ui";
import { adminService, type User } from "../services/adminService";
import { ROUTES } from "@/constants";
import { RoleBadge } from "@/components/ui/badges/RoleBadge";
import {
  ArrowLeft,
  Mail,
  Phone,
  ShieldCheck,
  Clock3,
  CalendarDays,
  UserRound,
  MapPinned,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDateTime(value?: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status?: User["accountStatus"] }) {
  if (!status) return null;

  const statusConfig = {
    ACTIVE: {
      label: "Active",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-700",
    },
    INACTIVE: {
      label: "Inactive",
      icon: XCircle,
      className: "bg-gray-100 text-gray-700",
    },
    SUSPENDED: {
      label: "Suspended",
      icon: AlertCircle,
      className: "bg-red-100 text-red-700",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        config.className,
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function UserDetailsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const numericUserId = Number(userId);
  const isValidUserId = Number.isFinite(numericUserId);

  useEffect(() => {
    const run = async () => {
      if (!isValidUserId) {
        setError("Invalid user id");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const data = await adminService.getUserById(numericUserId);
        setUser(data);
      } catch (e) {
        console.error("Failed to fetch user details:", e);
        setError("Failed to load user details");
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [isValidUserId, numericUserId]);

  const fullName = useMemo(() => {
    if (!user) return "";
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A";
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(ROUTES.ADMIN.USERS)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to users
          </Button>
        </div>
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
          <p className="text-red-700">{error || "User not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate(ROUTES.ADMIN.USERS)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to users
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(ROUTES.ADMIN.USER_EDIT(user.userId))}
          >
            Edit user
          </Button>
          {(user.roles || []).some(
            (r) => r === "HOTEL_OWNER" || r === "HOTEL_BD",
          ) && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                navigate(ROUTES.ADMIN.USER_MANAGE_HOTELS(user.userId), {
                  state: { user },
                })
              }
            >
              <Building2 className="w-4 h-4" />
              {(user.roles || []).includes("HOTEL_BD")
                ? "Hotels & permissions"
                : "Manage hotel"}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-6 bg-linear-to-r from-indigo-50 via-blue-50 to-cyan-50 border-b border-gray-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm">
                <UserRound className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <p className="text-sm text-gray-600 mt-1">User ID: {user.userId}</p>
                <div className="mt-3 flex items-center gap-2">
                  <StatusBadge status={user.accountStatus} />
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                      user.twoFactorEnabled
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-700",
                    )}
                  >
                    2FA {user.twoFactorEnabled ? "On" : "Off"}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-white/80 px-3 py-2 text-xs text-indigo-800">
              Auth Provider: <span className="font-semibold">{user.authProvider || "LOCAL"}</span>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 text-blue-700">
                <Mail className="w-3.5 h-3.5" />
              </span>
              Contact
            </p>
            <div className="space-y-3 text-sm text-gray-800">
              <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-blue-100 px-3 py-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>{user.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-blue-100 px-3 py-2">
                <Phone className="w-4 h-4 text-blue-500" />
                <span>{user.phoneNumber || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-violet-100 text-violet-700">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              Account
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-white/80 border border-violet-100 px-3 py-2">
                <span className="text-sm text-gray-700">Status:</span>
                <StatusBadge status={user.accountStatus} />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 rounded-lg bg-white/80 border border-violet-100 px-3 py-2">
                <ShieldCheck className="w-4 h-4 text-violet-500" />
                <span>{user.authProvider || "LOCAL"}</span>
                <span className="text-gray-400">|</span>
                <span>2FA {user.twoFactorEnabled ? "On" : "Off"}</span>
              </div>
              <div className="text-sm text-gray-700 rounded-lg bg-white/80 border border-violet-100 px-3 py-2">
                First Login Required: {user.firstLoginRequired ? "Yes" : "No"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-3">
              Roles
            </p>
            <RoleBadge roles={user.roles || []} maxVisible={user.roles?.length || 1} />
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-3">
              States
            </p>
            {user.states && user.states.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.states.map((state) => (
                  <span
                    key={state.id}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-emerald-200 text-emerald-800"
                  >
                    <MapPinned className="w-3 h-3 mr-1" />
                    {state.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                <MapPinned className="w-3 h-3 mr-1" />
                All / Not Set
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 mb-3">
              Activity
            </p>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
                <Clock3 className="w-4 h-4 text-slate-500" />
                <span>Last login: {formatDateTime(user.lastLoginTime)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
                <CalendarDays className="w-4 h-4 text-slate-500" />
                <span>Created: {formatDateTime(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
