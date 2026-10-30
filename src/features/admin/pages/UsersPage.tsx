import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  adminService,
  type User,
  type CreateUserRequest,
  type UpdateUserRequest,
} from "../services/adminService";
import {
  Button,
  Input,
  Select,
  ExportButton,
  DataTable,
  formatListCount,
} from "@/components/ui";
import { RoleBadge } from "@/components/ui/badges/RoleBadge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit,
  X,
  User as UserIcon,
  AlertCircle,
  Building2,
  Loader2,
  Send,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { isSuperAdminExcludedFromUserEdit } from "@/constants/roles";
import type {
  GridColDef,
  GridPaginationModel,
  GridRowParams,
} from "@mui/x-data-grid";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  ReportAppliedRange,
  ReportFilterButton,
  ReportFilterDrawer,
  ReportRefreshButton,
} from "@/features/reports/components/ReportFilterDrawer";
import { exportStatusLabel } from "@/features/reports/components/reportUiHelpers";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "@/features/reports/services/reportExportService";
import { UserFilterSelect, userTableGridSx } from "../components/userTableUi";

/** Roles Super Admin can assign on User Management (create/edit). Not exposed on hotel My Team. */
const ROLE_OPTIONS = [
  { value: "HOTEL_OWNER", label: "Hotel Owner" },
  { value: "HOTEL_BD", label: "Hotel BD" },
  { value: "PACKAGE_CREATOR", label: "Package Creator" },
  { value: "PACKAGE_BD", label: "Package BD" },
  { value: "TRANSPORT_BD", label: "Transport BD" },
  { value: "TRAVEL_AGENT_ADMIN", label: "Travel Agent Admin" },
  { value: "TRAVEL_AGENT_USER", label: "Travel Agent User" },
  { value: "TRANSPORT_AGENT_ADMIN", label: "Transport Agent Admin" },
  { value: "TRANSPORT_AGENT_USER", label: "Transport Agent User" },
  { value: "SALES_MANAGER", label: "Sales Manager" },
  { value: "ZONAL_MANAGER_HOTEL", label: "Zonal Manager Hotel" },
  { value: "ZONAL_MANAGER_SALES", label: "Zonal Manager Sales" },
  { value: "FINANCE_MANAGER", label: "Finance Manager" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "QC", label: "Quality Control" },
  { value: "HELPDESK_AGENT", label: "Helpdesk Agent" },
  { value: "AUDITOR", label: "Auditor" },
];

/** All filterable roles (includes staff roles created via My Team, etc.). */
const FILTER_ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "HOTEL_OWNER", label: "Hotel Owner" },
  { value: "HOTEL_MANAGER", label: "Hotel Manager" },
  { value: "HOTEL_ACCOUNTANT", label: "Hotel Accountant" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "FRONT_DESK_EXEC", label: "Front Desk" },
  { value: "HOTEL_BD", label: "Hotel BD" },
  { value: "PACKAGE_CREATOR", label: "Package Creator" },
  { value: "PACKAGE_BD", label: "Package BD" },
  { value: "TRANSPORT_BD", label: "Transport BD" },
  { value: "TRAVEL_AGENT_ADMIN", label: "Travel Agent Admin" },
  { value: "TRAVEL_AGENT_USER", label: "Travel Agent User" },
  { value: "TRANSPORT_AGENT_ADMIN", label: "Transport Agent Admin" },
  { value: "TRANSPORT_AGENT_USER", label: "Transport Agent User" },
  { value: "SALES_MANAGER", label: "Sales Manager" },
  { value: "ZONAL_MANAGER_HOTEL", label: "Zonal Manager Hotel" },
  { value: "ZONAL_MANAGER_SALES", label: "Zonal Manager Sales" },
  { value: "FINANCE_MANAGER", label: "Finance Manager" },
  { value: "QC", label: "Quality Control" },
  { value: "HELPDESK_AGENT", label: "Helpdesk Agent" },
  { value: "AUDITOR", label: "Auditor" },
];
const UPDATE_ONLY_ROLES = new Set<CreateUserRequest["roles"][number]>([
  "TRAVEL_AGENT_ADMIN",
  "TRAVEL_AGENT_USER",
  "TRANSPORT_AGENT_ADMIN",
  "TRANSPORT_AGENT_USER",
]);
const ALLOWED_SUPER_ADMIN_ROLES = new Set(
  ROLE_OPTIONS.map((role) => role.value),
);

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  user?: User | null;
  mode: "create" | "edit";
}

function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  mode,
}: UserFormModalProps) {
  const roleOptions =
    mode === "edit"
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter(
          (option) =>
            !UPDATE_ONLY_ROLES.has(
              option.value as CreateUserRequest["roles"][number],
            ),
        );

  const [formData, setFormData] = useState<
    CreateUserRequest | UpdateUserRequest
  >({
    email: "",
    roles: [],
    firstName: "",
    lastName: "",
    phoneNumber: "",
    ...(mode === "edit" && user
      ? { accountStatus: user.accountStatus || "ACTIVE" }
      : {}),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && user) {
      const normalizedRoles = (user.roles || []).filter(
        (role): role is CreateUserRequest["roles"][number] =>
          typeof role === "string" &&
          role.trim().length > 0 &&
          ALLOWED_SUPER_ADMIN_ROLES.has(role),
      );
      setFormData({
        email: user.email,
        roles: normalizedRoles,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phoneNumber: user.phoneNumber || "",
        accountStatus: user.accountStatus || "ACTIVE",
      });
    } else {
      setFormData({
        email: "",
        roles: [],
        firstName: "",
        lastName: "",
        phoneNumber: "",
        ...(mode === "edit" ? { accountStatus: "ACTIVE" } : {}),
      });
    }
    setErrors({});
    setApiError(null);
  }, [mode, user, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.firstName) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Phone number must be 10 digits";
    }

    if (!formData.roles || formData.roles.length === 0) {
      newErrors.roles = "At least one role is required";
    }

    if (
      mode === "edit" &&
      "accountStatus" in formData &&
      !formData.accountStatus
    ) {
      newErrors.accountStatus = "Account status is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);
    setErrors({});
    try {
      await onSubmit(formData);
      onClose();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      // Extract error message from API response
      // The API client interceptor returns ApiFailureResponse with message property
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        error?.data?.message ||
        "Failed to save user. Please try again.";

      // Check if there are field-specific errors in the response
      // The API returns: { data: { phoneNumber: "Invalid phone number" } }
      // After interceptor: error.data.data contains the field errors
      const errorData = error?.data?.data || error?.response?.data?.data || {};
      const newErrors: Record<string, string> = {};

      // Map API field errors to form field errors
      if (errorData.phoneNumber) {
        newErrors.phoneNumber = errorData.phoneNumber;
      }
      if (errorData.email) {
        newErrors.email = errorData.email;
      }
      if (errorData.firstName) {
        newErrors.firstName = errorData.firstName;
      }
      if (errorData.lastName) {
        newErrors.lastName = errorData.lastName;
      }
      if (errorData.role) {
        newErrors.roles = errorData.role;
      }
      if (errorData.roles) {
        newErrors.roles = errorData.roles;
      }

      // If we have field-specific errors, use those; otherwise show general error
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        // Also clear API error since we're showing field-specific errors
        setApiError(null);
      } else {
        setApiError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits and limit to 10 digits
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setFormData({ ...formData, phoneNumber: digitsOnly });
    // Clear error when user starts typing
    if (errors.phoneNumber) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phoneNumber;
        return newErrors;
      });
    }
  };

  const handleRoleToggle = (role: CreateUserRequest["roles"][number]) => {
    if (!ALLOWED_SUPER_ADMIN_ROLES.has(role)) return;
    const currentRoles = formData.roles || [];
    const nextRoles = currentRoles.includes(role)
      ? currentRoles.filter((item) => item !== role)
      : [...currentRoles, role];
    setFormData({ ...formData, roles: nextRoles });
    if (errors.roles) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.roles;
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === "create" ? "Create New User" : "Edit User"}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === "create"
                  ? "Add a new user to the system"
                  : "Update user information"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* API Error Display */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{apiError}</p>
              </div>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="text-red-600 hover:text-red-800"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              error={errors.firstName}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              error={errors.lastName}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            error={errors.email}
            required
            icon={<Mail className="w-4 h-4 text-gray-400" />}
          />

          <Input
            label="Phone Number"
            type="tel"
            value={formData.phoneNumber}
            onChange={handlePhoneNumberChange}
            error={errors.phoneNumber}
            required
            icon={<Phone className="w-4 h-4 text-gray-400" />}
            placeholder="9876543210"
            maxLength={10}
            inputMode="numeric"
          />

          <div className={cn("w-full", errors.roles ? "mb-2" : "mb-0")}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roles
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {roleOptions.map((option) => {
                const checked = (formData.roles || []).includes(
                  option.value as CreateUserRequest["roles"][number],
                );
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        handleRoleToggle(
                          option.value as CreateUserRequest["roles"][number],
                        )
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
            {errors.roles && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {errors.roles}
              </p>
            )}
          </div>

          {mode === "edit" && (
            <Select
              label="Account Status"
              value={
                "accountStatus" in formData ? formData.accountStatus : "ACTIVE"
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  accountStatus: e.target.value as
                    | "ACTIVE"
                    | "INACTIVE"
                    | "SUSPENDED",
                })
              }
              error={errors.accountStatus}
              options={STATUS_OPTIONS}
              required
            />
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Create User"
                  : "Update User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: User["accountStatus"] }) {
  if (!status) return null;

  const statusConfig = {
    ACTIVE: {
      label: "Active",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
      dot: "bg-emerald-500",
    },
    INACTIVE: {
      label: "Inactive",
      className: "bg-slate-100 text-slate-600 ring-slate-200/80",
      dot: "bg-slate-400",
    },
    SUSPENDED: {
      label: "Suspended",
      className: "bg-rose-50 text-rose-700 ring-rose-200/80",
      dot: "bg-rose-500",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex h-auto items-center gap-1.5 self-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ring-1",
        config.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatShortDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftRole, setDraftRole] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(
    null,
  );
  const [resendingUserId, setResendingUserId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [
    paginationModel.page,
    paginationModel.pageSize,
    statusFilter,
    roleFilter,
    emailFilter,
  ]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminService.getUsers({
        page: paginationModel.page,
        size: paginationModel.pageSize,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(emailFilter ? { email: emailFilter } : {}),
      });
      // Extract content array from paginated response
      setUsers(response.content || []);
      setRowCount(response.totalElements || 0);
    } catch (err) {
      setError("Failed to load users");
      console.error("Error fetching users:", err);
      setUsers([]); // Set to empty array on error
      setRowCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOwnerCredentials = async (user: User) => {
    if (!user.firstLoginRequired) {
      setSuccessMessage(null);
      setActionError(
        "This owner has already signed in and changed the password. Ask them to use Forgot password.",
      );
      return;
    }
    setResendingUserId(user.userId);
    setActionError(null);
    setSuccessMessage(null);
    try {
      await adminService.resendOwnerCredentials(user.userId);
      setSuccessMessage("Temporary credentials were sent again.");
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setResendingUserId(null);
    }
  };

  const handleExport = async (format: ReportExportFormat) => {
    setExporting(true);
    setExportStatus("QUEUED");
    setError(null);
    try {
      await adminService.exportUsers({
        params: {
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(emailFilter ? { email: emailFilter } : {}),
        },
        format,
        defaultFileName: `users-${new Date().toISOString().split("T")[0]}`,
        onStatus: setExportStatus,
      });
      setSuccessMessage("Users export downloaded.");
    } catch (err) {
      console.error("Users export failed:", err);
      setActionError(extractErrorMessage(err) || "Export failed");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "user",
      headerName: "User",
      flex: 1.6,
      minWidth: 200,
      renderCell: (params) => {
        const fullName =
          `${params.row.firstName || ""} ${params.row.lastName || ""}`.trim() ||
          "N/A";
        return (
          <div className="w-full min-w-0 py-0.5 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-900">
              {fullName}
            </p>
            <p className="truncate text-[11px] text-slate-500" title={params.row.email}>
              {params.row.email}
            </p>
          </div>
        );
      },
      valueGetter: (_v, row) =>
        `${row.firstName || ""} ${row.lastName || ""}`.trim() || "N/A",
    },
    {
      field: "phoneNumber",
      headerName: "Phone",
      width: 120,
      minWidth: 110,
      renderCell: (params) => (
        <span className="whitespace-nowrap text-sm text-slate-700">
          {params.value || "—"}
        </span>
      ),
    },
    {
      field: "roles",
      headerName: "Role",
      flex: 1,
      minWidth: 150,
      sortable: false,
      renderCell: (params) => (
        <RoleBadge roles={params.value || []} variant="soft" />
      ),
    },
    {
      field: "states",
      headerName: "States",
      flex: 0.8,
      minWidth: 130,
      sortable: false,
      renderCell: (params) => {
        const states = (params.row.states || []) as Array<{
          id: number;
          name: string;
        }>;
        if (!states.length) {
          return (
            <span className="inline-flex h-auto items-center self-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium leading-tight text-slate-600">
              All / Not Set
            </span>
          );
        }
        const first = states[0];
        const remaining = states.length - 1;
        return (
          <div
            className="flex min-w-0 max-w-full items-center gap-1 self-center overflow-hidden leading-tight"
            title={states.map((s) => s.name).join(", ")}
          >
            <span className="inline-flex h-auto min-w-0 max-w-full items-center self-center rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium leading-tight text-sky-800 ring-1 ring-inset ring-sky-100">
              <span className="truncate">{first.name}</span>
            </span>
            {remaining > 0 ? (
              <span className="inline-flex h-auto shrink-0 items-center self-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-sky-700 ring-1 ring-inset ring-sky-100">
                +{remaining}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      field: "security",
      headerName: "Auth",
      width: 168,
      minWidth: 160,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const provider = String(params.row.authProvider || "LOCAL").toUpperCase();
        const twoFaOn = Boolean(params.row.twoFactorEnabled);
        return (
          <div
            className="flex flex-nowrap items-center gap-1 self-center overflow-hidden leading-tight"
            title={`${provider} · ${twoFaOn ? "2FA on" : "2FA off"}${
              params.row.firstLoginRequired ? " · 1st login" : ""
            }`}
          >
            <span className="inline-flex h-auto shrink-0 items-center self-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-indigo-700 ring-1 ring-inset ring-indigo-100">
              {provider}
            </span>
            <span
              className={cn(
                "inline-flex h-auto shrink-0 items-center self-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight ring-1 ring-inset",
                twoFaOn
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-slate-100 text-slate-500 ring-slate-200",
              )}
            >
              {twoFaOn ? "2FA on" : "2FA off"}
            </span>
            {params.row.firstLoginRequired ? (
              <span className="inline-flex h-auto shrink-0 items-center self-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-amber-800 ring-1 ring-inset ring-amber-100">
                1st
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      field: "lastLoginTime",
      headerName: "Last Login",
      width: 120,
      minWidth: 110,
      renderCell: (params) => (
        <span className="whitespace-nowrap text-sm text-slate-600">
          {formatDateTime(params.row.lastLoginTime)}
        </span>
      ),
      valueGetter: (_v, row) => formatDateTime(row.lastLoginTime),
    },
    {
      field: "createdAt",
      headerName: "Created",
      width: 96,
      minWidth: 90,
      renderCell: (params) => (
        <span
          className="whitespace-nowrap text-sm text-slate-600"
          title={formatDateTime(params.row.createdAt)}
        >
          {formatShortDate(params.row.createdAt)}
        </span>
      ),
      valueGetter: (_v, row) => formatDateTime(row.createdAt),
    },
    {
      field: "accountStatus",
      headerName: "Status",
      width: 104,
      minWidth: 96,
      renderCell: (params) => <StatusBadge status={params.value} />,
    },
    {
      field: "actions",
      headerName: "",
      width: 108,
      minWidth: 108,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      resizable: false,
      renderCell: (params) => {
        const staffExcluded = isSuperAdminExcludedFromUserEdit(
          params.row.roles,
        );
        const showResend =
          (params.row.roles || []).includes("HOTEL_OWNER") &&
          params.row.firstLoginRequired;
        const showManage = (params.row.roles || []).some(
          (r: string) => r === "HOTEL_OWNER" || r === "HOTEL_BD",
        );
        const iconBtn =
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50";
        return (
          <div
            className="flex w-full flex-nowrap items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() =>
                navigate(ROUTES.ADMIN.USER_EDIT(params.row.userId))
              }
              className={iconBtn}
              title={
                staffExcluded
                  ? "Only account status can be updated for hotel staff"
                  : "Edit user"
              }
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            {showResend ? (
              <button
                type="button"
                onClick={() => void handleResendOwnerCredentials(params.row)}
                disabled={resendingUserId === params.row.userId}
                className={cn(iconBtn, "text-amber-700")}
                title="Resend temporary login credentials"
              >
                {resendingUserId === params.row.userId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}
            {showManage ? (
              <button
                type="button"
                onClick={() =>
                  navigate(ROUTES.ADMIN.USER_MANAGE_HOTELS(params.row.userId), {
                    state: { user: params.row },
                  })
                }
                className={cn(iconBtn, "text-[#2f3d95]")}
                title={
                  (params.row.roles || []).includes("HOTEL_BD")
                    ? "Hotels & permissions"
                    : "Manage Hotel"
                }
              >
                <Building2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  const openFilters = () => {
    setDraftStatus(statusFilter);
    setDraftRole(roleFilter);
    setDraftEmail(emailFilter);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(draftStatus);
    setRoleFilter(draftRole);
    setEmailFilter(draftEmail.trim());
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftStatus("");
    setDraftRole("");
    setDraftEmail("");
    setStatusFilter("");
    setRoleFilter("");
    setEmailFilter("");
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setFilterOpen(false);
  };

  const activeFilterCount = [statusFilter, roleFilter, emailFilter].filter(
    Boolean,
  ).length;
  const totalPages = Math.max(
    1,
    Math.ceil(rowCount / paginationModel.pageSize) || 1,
  );

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden bg-slate-50">
        <div className="mx-auto flex h-full w-full max-w-350 min-h-0 flex-1 flex-col gap-3 px-3 py-4 sm:px-5">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900">
                User Management
                {!isLoading ? (
                  <span className="ml-1.5 font-semibold text-slate-500">
                    ({rowCount.toLocaleString("en-IN")})
                  </span>
                ) : null}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ReportAppliedRange
                detail={
                  [
                    STATUS_OPTIONS.find((option) => option.value === statusFilter)
                      ?.label,
                    FILTER_ROLE_OPTIONS.find(
                      (option) => option.value === roleFilter,
                    )?.label,
                    emailFilter.trim() || null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "All users"
                }
              />
              <ReportFilterButton
                onClick={openFilters}
                activeCount={activeFilterCount}
              />
              <ExportButton
                iconOnly
                onExportCSV={() => void handleExport("CSV")}
                onExportExcel={() => void handleExport("EXCEL")}
                onExportPDF={() => void handleExport("PDF")}
                exporting={exporting}
                exportingLabel={
                  exportStatusLabel(exportStatus) || "Exporting…"
                }
                disabled={isLoading && !exporting}
              />
              <ReportRefreshButton
                onClick={() => void fetchUsers()}
                loading={isLoading}
              />
              <Button
                variant="primary"
                onClick={() => navigate(ROUTES.ADMIN.USER_CREATE)}
                className="gap-1.5 py-1.5 text-sm"
              >
                <Plus className="h-4 w-4" />
                Create User
              </Button>
            </div>
          </div>

          {successMessage ? (
            <div className="flex shrink-0 items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <span>{successMessage}</span>
              <button
                type="button"
                className="text-emerald-700 hover:text-emerald-900"
                onClick={() => setSuccessMessage(null)}
                aria-label="Dismiss success message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {actionError ? (
            <div className="flex shrink-0 items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <span>{actionError}</span>
              <button
                type="button"
                className="text-rose-700 hover:text-rose-900"
                onClick={() => setActionError(null)}
                aria-label="Dismiss error message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {error && !isLoading && users.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-10 text-center">
              <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
              <p className="mb-3 text-sm font-medium text-red-600">{error}</p>
              <Button
                onClick={() => void fetchUsers()}
                variant="primary"
                className="text-sm"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              {error ? (
                <div className="mb-2 flex shrink-0 items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <span>{error}</span>
                  <button
                    type="button"
                    className="text-rose-700 hover:text-rose-900"
                    onClick={() => setError(null)}
                    aria-label="Dismiss error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <DataTable
                subtitle={
                  isLoading ? (
                    "Loading…"
                  ) : (
                    <>
                      <span className="font-medium text-slate-600">
                        {formatListCount(rowCount, "user")}
                      </span>
                      <span className="text-slate-400">
                        {activeFilterCount > 0 ? " · filtered" : ""} · Page{" "}
                        {paginationModel.page + 1} of {totalPages}
                      </span>
                    </>
                  )
                }
                rows={users}
                columns={columns}
                getRowId={(row) => row.userId}
                loading={isLoading}
                paginationMode="server"
                rowCount={rowCount}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                onRowClick={(params: GridRowParams<User>) =>
                  navigate(ROUTES.ADMIN.USER_DETAIL(params.row.userId))
                }
                disableRowSelectionOnClick
                showToolbar
                showExport={false}
                fillContainer
                dense
                rowHeight={52}
                initialState={{
                  columns: {
                    columnVisibilityModel: {
                      phoneNumber: false,
                      lastLoginTime: false,
                    },
                  },
                }}
                exportFileName={`users-${new Date().toISOString().split("T")[0]}`}
                sx={userTableGridSx}
                className="min-h-0"
                localeText={{
                  noRowsLabel:
                    activeFilterCount > 0
                      ? "No users match the selected filters"
                      : "No users yet",
                }}
              />
            </div>
          )}
        </div>
      </div>

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        title="Filters"
        resetLabel="Reset"
        applyLabel="Apply"
      >
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Status
          </label>
          <UserFilterSelect
            aria-label="Filter by status"
            value={draftStatus}
            onChange={setDraftStatus}
            options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS]}
          />
        </section>
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Role
          </label>
          <UserFilterSelect
            searchable
            searchPlaceholder="Search roles..."
            aria-label="Filter by role"
            value={draftRole}
            onChange={setDraftRole}
            options={[
              { value: "", label: "All roles" },
              ...FILTER_ROLE_OPTIONS,
            ]}
            menuMaxHeightClassName="max-h-72"
          />
        </section>
        <section>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Email
          </label>
          <input
            type="text"
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyFilters();
              }
            }}
            placeholder="Search by email…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/20"
          />
        </section>
      </ReportFilterDrawer>
    </>
  );
}
