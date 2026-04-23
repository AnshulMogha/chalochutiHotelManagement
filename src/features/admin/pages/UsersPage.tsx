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
  LoadingSpinner,
  ExportButton,
} from "@/components/ui";
import { RoleBadge } from "@/components/ui/badges/RoleBadge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit,
  X,
  User as UserIcon,
  Mail,
  Phone,
  MapPinned,
  Shield,
  ShieldCheck,
  Clock3,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { isSuperAdminExcludedFromUserEdit } from "@/constants/roles";
import {
  DataGrid,
  GridToolbar,
  type GridPaginationModel,
  type GridRowParams,
} from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { exportToCSV, exportToExcel, type ExportColumn } from "@/utils/export";

/** Roles Super Admin can assign on User Management (create/edit). Not exposed on hotel My Team. */
const ROLE_OPTIONS = [
  { value: "HOTEL_OWNER", label: "Hotel Owner" },
  { value: "HOTEL_BD", label: "Hotel BD" },
  { value: "PACKAGE_CREATOR", label: "Package Creator" },
  { value: "PACKAGE_BD", label: "Package BD" },
  { value: "TRANSPORT_BD", label: "Transport BD" },
  { value: "SALES_MANAGER", label: "Sales Manager" },
  { value: "ZONAL_MANAGER_HOTEL", label: "Zonal Manager Hotel" },
  { value: "ZONAL_MANAGER_SALES", label: "Zonal Manager Sales" },
  { value: "FINANCE", label: "Finance" },
  { value: "QC", label: "Quality Control" },
  { value: "HELPDESK_AGENT", label: "Helpdesk Agent" },
  { value: "AUDITOR", label: "Auditor" },
];
const ALLOWED_SUPER_ADMIN_ROLES = new Set(ROLE_OPTIONS.map((role) => role.value));

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
              {ROLE_OPTIONS.map((option) => {
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
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [emailFilterInput, setEmailFilterInput] = useState("");
  const [emailFilter, setEmailFilter] = useState("");

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

  const handleExportCSV = () => {
    const exportColumns: ExportColumn[] = [
      {
        field: "user",
        headerName: "User",
        valueGetter: (row) => {
          const firstName = row.firstName || "";
          const lastName = row.lastName || "";
          return `${firstName} ${lastName}`.trim() || "N/A";
        },
      },
      { field: "email", headerName: "Email" },
      {
        field: "phoneNumber",
        headerName: "Phone",
        valueGetter: (row) => row.phoneNumber || "N/A",
      },
      {
        field: "roles",
        headerName: "Roles",
        valueGetter: (row) =>
          row.roles && row.roles.length > 0 ? row.roles.join(", ") : "No Role",
      },
      {
        field: "states",
        headerName: "States",
        valueGetter: (row) =>
          row.states && row.states.length > 0
            ? row.states.map((s: { name: string }) => s.name).join(", ")
            : "All / Not Set",
      },
      { field: "authProvider", headerName: "Auth Provider" },
      {
        field: "twoFactorEnabled",
        headerName: "2FA",
        valueGetter: (row) => (row.twoFactorEnabled ? "Enabled" : "Disabled"),
      },
      {
        field: "firstLoginRequired",
        headerName: "First Login Required",
        valueGetter: (row) => (row.firstLoginRequired ? "Yes" : "No"),
      },
      { field: "accountStatus", headerName: "Status" },
      {
        field: "lastLoginTime",
        headerName: "Last Login",
        valueGetter: (row) => formatDateTime(row.lastLoginTime),
      },
      {
        field: "createdAt",
        headerName: "Created At",
        valueGetter: (row) => formatDateTime(row.createdAt),
      },
    ];
    exportToCSV(
      users,
      exportColumns,
      `users-${new Date().toISOString().split("T")[0]}`,
    );
  };

  const handleExportExcel = () => {
    const exportColumns: ExportColumn[] = [
      {
        field: "user",
        headerName: "User",
        valueGetter: (row) => {
          const firstName = row.firstName || "";
          const lastName = row.lastName || "";
          return `${firstName} ${lastName}`.trim() || "N/A";
        },
      },
      { field: "email", headerName: "Email" },
      {
        field: "phoneNumber",
        headerName: "Phone",
        valueGetter: (row) => row.phoneNumber || "N/A",
      },
      {
        field: "roles",
        headerName: "Roles",
        valueGetter: (row) =>
          row.roles && row.roles.length > 0 ? row.roles.join(", ") : "No Role",
      },
      {
        field: "states",
        headerName: "States",
        valueGetter: (row) =>
          row.states && row.states.length > 0
            ? row.states.map((s: { name: string }) => s.name).join(", ")
            : "All / Not Set",
      },
      { field: "authProvider", headerName: "Auth Provider" },
      {
        field: "twoFactorEnabled",
        headerName: "2FA",
        valueGetter: (row) => (row.twoFactorEnabled ? "Enabled" : "Disabled"),
      },
      {
        field: "firstLoginRequired",
        headerName: "First Login Required",
        valueGetter: (row) => (row.firstLoginRequired ? "Yes" : "No"),
      },
      { field: "accountStatus", headerName: "Status" },
      {
        field: "lastLoginTime",
        headerName: "Last Login",
        valueGetter: (row) => formatDateTime(row.lastLoginTime),
      },
      {
        field: "createdAt",
        headerName: "Created At",
        valueGetter: (row) => formatDateTime(row.createdAt),
      },
    ];
    exportToExcel(
      users,
      exportColumns,
      `users-${new Date().toISOString().split("T")[0]}`,
    );
  };

  const columns: GridColDef[] = [
    {
      field: "user",
      headerName: "User",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const firstName = params.row.firstName || "";
        const lastName = params.row.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim() || "N/A";
        return (
          <div className="flex items-center gap-3 h-full w-full">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-sm font-semibold text-gray-900">
                {fullName}
              </div>
              <div className="text-xs text-gray-500">
                ID: {params.row.userId}
              </div>
            </div>
          </div>
        );
      },
      valueGetter: (value, row) => {
        const firstName = row.firstName || "";
        const lastName = row.lastName || "";
        return `${firstName} ${lastName}`.trim() || "N/A";
      },
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <div className="flex items-center h-full w-full text-sm text-gray-600">
          <Mail className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <span className="truncate">{params.value}</span>
        </div>
      ),
    },
    {
      field: "phoneNumber",
      headerName: "Phone",
      flex: 0.8,
      minWidth: 150,
      renderCell: (params) => (
        <div className="flex items-center h-full w-full text-sm text-gray-600">
          <Phone className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <span>{params.value || "N/A"}</span>
        </div>
      ),
    },
    {
      field: "roles",
      headerName: "Roles",
      flex: 1,
      minWidth: 210,
      renderCell: (params) => (
        <div className="flex items-start h-full w-full py-2">
          <RoleBadge roles={params.value || []} />
        </div>
      ),
    },
    {
      field: "states",
      headerName: "States",
      flex: 1.2,
      minWidth: 250,
      renderCell: (params) => {
        const states = (params.row.states || []) as Array<{ id: number; name: string }>;
        if (!states.length) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              <MapPinned className="w-3 h-3 mr-1" />
              All / Not Set
            </span>
          );
        }
        const visible = states.slice(0, 2);
        const remaining = states.length - visible.length;
        return (
          <div className="flex flex-wrap items-center gap-1 py-1">
            {visible.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
              >
                {s.name}
              </span>
            ))}
            {remaining > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                +{remaining} more
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: "security",
      headerName: "Security",
      flex: 1.1,
      minWidth: 240,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="flex flex-wrap items-center gap-1 py-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            <ShieldCheck className="w-3 h-3 mr-1" />
            {params.row.authProvider || "LOCAL"}
          </span>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              params.row.twoFactorEnabled
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-700",
            )}
          >
            2FA {params.row.twoFactorEnabled ? "On" : "Off"}
          </span>
          {params.row.firstLoginRequired && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              First login pending
            </span>
          )}
        </div>
      ),
    },
    {
      field: "lastLoginTime",
      headerName: "Last Login",
      flex: 0.9,
      minWidth: 180,
      renderCell: (params) => (
        <div className="flex items-center h-full w-full text-sm text-gray-600">
          <Clock3 className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <span>{formatDateTime(params.row.lastLoginTime)}</span>
        </div>
      ),
      valueGetter: (value, row) => formatDateTime(row.lastLoginTime),
    },
    {
      field: "createdAt",
      headerName: "Created",
      flex: 0.9,
      minWidth: 180,
      renderCell: (params) => (
        <div className="flex items-center h-full w-full text-sm text-gray-600">
          <CalendarDays className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <span>{formatDateTime(params.row.createdAt)}</span>
        </div>
      ),
      valueGetter: (value, row) => formatDateTime(row.createdAt),
    },
    {
      field: "accountStatus",
      headerName: "Status",
      flex: 0.6,
      minWidth: 120,
      renderCell: (params) => (
        <div className="flex items-center h-full w-full">
          <StatusBadge status={params.value} />
        </div>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 260,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const staffExcluded = isSuperAdminExcludedFromUserEdit(
          params.row.roles,
        );
        return (
          <div className="flex items-center h-full w-full overflow-visible">
            <div className="flex flex-nowrap gap-2 py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(ROUTES.ADMIN.USER_EDIT(params.row.userId));
                }}
                className="gap-2"
                disabled={staffExcluded}
                title={
                  staffExcluded
                    ? "Hotel staff are managed from the property account (My Team), not here."
                    : undefined
                }
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              {(params.row.roles || []).some(
                (r: string) => r === "HOTEL_OWNER" || r === "HOTEL_BD",
              ) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(ROUTES.ADMIN.USER_MANAGE_HOTELS(params.row.userId), {
                      state: { user: params.row },
                    });
                  }}
                  className="gap-2 whitespace-nowrap"
                >
                  <Building2 className="w-4 h-4" />
                  {(params.row.roles || []).includes("HOTEL_BD")
                    ? "Hotels & permissions"
                    : "Manage Hotel"}
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  const applyFilters = () => {
    const normalizedEmail = emailFilterInput.trim();
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setEmailFilter(normalizedEmail);
  };

  const resetFilters = () => {
    setStatusFilter("");
    setRoleFilter("");
    setEmailFilterInput("");
    setEmailFilter("");
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchUsers}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Management
          </h1>
          <p className="text-gray-600">Create and manage system users</p>
        </div>
        <div className="flex gap-2">
          {users.length > 0 && (
            <ExportButton
              onExportCSV={handleExportCSV}
              onExportExcel={handleExportExcel}
            />
          )}
          <Button
            variant="primary"
            onClick={() => navigate(ROUTES.ADMIN.USER_CREATE)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create User
          </Button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
          options={[{ value: "", label: "All" }, ...STATUS_OPTIONS]}
        />
        <Select
          label="Role"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
          options={[{ value: "", label: "All" }, ...ROLE_OPTIONS]}
        />
        <Input
          label="Email"
          type="email"
          value={emailFilterInput}
          onChange={(e) => setEmailFilterInput(e.target.value)}
          placeholder="Search by email"
          icon={<Mail className="w-4 h-4 text-gray-400" />}
        />
        <div className="flex items-end gap-2">
          <Button type="button" variant="primary" onClick={applyFilters}>
            Search
          </Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            className="text-green-700 hover:text-green-900"
            onClick={() => setSuccessMessage(null)}
            aria-label="Dismiss success message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-16 text-center">
          <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">No users yet</p>
          <p className="text-gray-500 text-sm mb-4">
            Create your first user to get started
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(ROUTES.ADMIN.USER_CREATE)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create User
          </Button>
        </div>
      ) : (
        <Box
          sx={{
            width: "100%",
            borderRadius: "12px",
            // Keep menus/popups from being clipped by container edges.
            overflow: "visible",
          }}
          className="bg-white border border-gray-200 shadow-md"
        >
          <DataGrid
            rows={users}
            columns={columns}
            getRowId={(row) => row.userId}
            autoHeight
            getRowHeight={() => "auto"}
            pageSizeOptions={[5, 10, 20, 50, 100]}
            paginationMode="server"
            rowCount={rowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            onRowClick={(params: GridRowParams<User>) =>
              navigate(ROUTES.ADMIN.USER_DETAIL(params.row.userId))
            }
            disableRowSelectionOnClick
            slots={{
              toolbar: GridToolbar,
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
                csvOptions: {
                  fileName: `users-${new Date().toISOString().split("T")[0]}`,
                  delimiter: ",",
                  utf8WithBom: true,
                },
                printOptions: {
                  disableToolbarButton: false,
                },
                exportOptions: {
                  formatOptions: {
                    utf8WithBom: true,
                  },
                },
              },
            }}
            sx={{
              border: "none",
              borderRadius: "12px",
              "& .MuiDataGrid-root": {
                border: "none",
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#2f3d95 !important",
                color: "white !important",
                fontSize: "0.875rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                minHeight: "56px !important",
                "& .MuiDataGrid-columnHeaderTitleContainer": {
                  backgroundColor: "#2f3d95 !important",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  color: "white !important",
                },
                "& .MuiDataGrid-iconButtonContainer": {
                  color: "white !important",
                },
              },
              "& .MuiDataGrid-columnHeader": {
                padding: "14px 16px",
                backgroundColor: "#2f3d95 !important",
                color: "white !important",
                display: "flex",
                alignItems: "center",
                "&:focus": {
                  outline: "none",
                },
                "&:focus-within": {
                  outline: "none",
                },
                "&:hover .MuiDataGrid-iconButtonContainer": {
                  opacity: 0,
                },
                "& .MuiDataGrid-iconButtonContainer": {
                  opacity: 0,
                  transition: "opacity 0.2s",
                },
                "&.MuiDataGrid-columnHeader--sorted .MuiDataGrid-iconButtonContainer":
                  {
                    opacity: 1,
                    "& .MuiDataGrid-sortIcon": {
                      color: "#10b981 !important",
                      fontSize: "0.875rem",
                      width: "16px",
                      height: "16px",
                    },
                  },
                "& .MuiDataGrid-sortIcon": {
                  color: "#10b981 !important",
                  fontSize: "0.875rem",
                  width: "16px",
                  height: "16px",
                },
              },
              "& .MuiDataGrid-row": {
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "#eff6ff",
                },
                "&:nth-of-type(even)": {
                  backgroundColor: "#fafafa",
                  "&:hover": {
                    backgroundColor: "#eff6ff",
                  },
                },
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #e5e7eb",
                padding: "14px 16px",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                whiteSpace: "normal",
                lineHeight: "1.3rem",
                "&:focus": {
                  outline: "none",
                },
                "&:focus-within": {
                  outline: "none",
                },
              },
              "& .MuiDataGrid-cell--textLeft": {
                alignItems: "flex-start",
              },
              "& .MuiDataGrid-cell[data-field='actions']": {
                overflow: "visible",
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "1px solid #e5e7eb",
                padding: "12px 16px",
                backgroundColor: "white",
              },
              "& .MuiDataGrid-toolbarContainer": {
                padding: "12px 16px",
                backgroundColor: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                "& .MuiButton-root": {
                  textTransform: "none",
                },
              },
              "& .MuiDataGrid-main": {
                overflowX: "auto",
              },
              "& .MuiDataGrid-columnHeadersInner": {
                backgroundColor: "#2f3d95 !important",
              },
              "& .MuiDataGrid-columnHeaders .MuiDataGrid-filler": {
                backgroundColor: "#2f3d95 !important",
              },
              "& .MuiDataGrid-menu, & .MuiDataGrid-panel, & .MuiPopper-root": {
                zIndex: 1700,
              },
            }}
          />
        </Box>
      )}

    </div>
  );
}
