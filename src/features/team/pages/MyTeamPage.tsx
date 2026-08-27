import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  teamService,
  type TeamMember,
  type CreateTeamMemberRequest,
  type UpdateTeamMemberRequest,
  type Permission,
  type TeamRole,
  type PermissionModule,
} from "../services/teamService";
import {
  adminService,
  type CreateUserRequest,
  type UpdateUserRequest,
} from "@/features/admin/services/adminService";
import { Button, Input, Select, LoadingSpinner } from "@/components/ui";
import { RoleBadge } from "@/components/ui/badges/RoleBadge";
import { Toast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit,
  X,
  ArrowLeft,
  Building2,
  User as UserIcon,
  Users,
  Mail,
  Phone,
  Shield,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CalendarDays,
  Search,
} from "lucide-react";

const TEAM_BRAND = {
  primary: "#2f3d95",
  primarySoft: "#eef2ff",
  primaryHover: "#263578",
} as const;

const TEAM_ROLE_OPTIONS = [
  { value: "HOTEL_MANAGER", label: "Hotel Manager" },
  { value: "FRONT_DESK_EXEC", label: "Front Desk" },
  { value: "HOTEL_ACCOUNTANT", label: "Hotel Accountant" },
];
const HOTEL_OWNER_ASSIGNABLE_ROLES: TeamRole[] = [
  "HOTEL_MANAGER",
  "HOTEL_ACCOUNTANT",
];
const HOTEL_MANAGER_ASSIGNABLE_ROLES: TeamRole[] = ["FRONT_DESK_EXEC"];
const ALLOWED_TEAM_ROLES = new Set(
  TEAM_ROLE_OPTIONS.map((role) => role.value as TeamRole),
);

function normalizeTeamRole(role: string | undefined | null): TeamRole | null {
  if (!role) return null;
  if (role === "ACCOUNTANT") return "HOTEL_ACCOUNTANT";
  return ALLOWED_TEAM_ROLES.has(role as TeamRole) ? (role as TeamRole) : null;
}

function teamMemberRoleList(member: TeamMember): string[] {
  const fromRoles = member.roles?.length ? member.roles : [];
  const primary = member.role ? [member.role] : [];
  return [...new Set([...fromRoles, ...primary])].filter(Boolean);
}

/**
 * Logged-in hotel owner cannot manage their own My Team row or any HOTEL_OWNER
 * row (including co-owners).
 */
function isHotelOwnerRestrictedMyTeamRow(
  member: TeamMember,
  viewerUserId: number | undefined,
  viewerIsHotelOwner: boolean,
): boolean {
  if (!viewerIsHotelOwner || viewerUserId == null) return false;
  if (member.userId === viewerUserId) return true;
  return teamMemberRoleList(member).includes("HOTEL_OWNER");
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

const PERMISSION_MODULES: { value: PermissionModule; label: string }[] = [
  // Same modules as Hotel Owner sidebar (what an owner can offer staff)
  { value: "PROPERTY_BASIC_INFO", label: "Property - Basic Information" },
  { value: "PROPERTY_ROOMS_RATEPLANS", label: "Property - Rooms & Rate Plans" },
  { value: "PROPERTY_PHOTOS_VIDEOS", label: "Property - Photos & Videos" },
  { value: "PROPERTY_AMENITIES_RESTAURANTS", label: "Property - Amenities" },
  { value: "PROPERTY_POLICY_RULES", label: "Property - Policy & Rules" },
  { value: "PROPERTY_FINANCE", label: "Property - Finance" },
  { value: "PROPERTY_DOCUMENT", label: "Property - Documents" },
  { value: "RATES_INVENTORY", label: "Rate and Inventory" },
  { value: "BOOKINGS", label: "Bookings" },
  { value: "OFFERS", label: "Promotions" },
  { value: "ANALYTICS", label: "Analytics" },
  { value: "MY_TEAM", label: "My Team" },
  // Per-report permissions (Hotel Manager)
  { value: "REPORT_BOOKING_SUMMARY", label: "Report - Booking Summary" },
  { value: "REPORT_PROMOTIONS", label: "Report - Promotion Report" },
  { value: "REPORT_RATE_HEALTH", label: "Report - Rate Disparity" },
  {
    value: "REPORT_INVENTORY_ALLOCATION",
    label: "Report - Inventory Allocation",
  },
  { value: "PAYMENTS", label: "Report - Payments" },
  { value: "GUEST_REVIEWS", label: "Guest Reviews" },
];

/** Modules an owner can assign to Hotel Manager (no Finance / Documents). */
const HOTEL_MANAGER_PERMISSION_MODULES: PermissionModule[] =
  PERMISSION_MODULES.map((module) => module.value).filter(
    (module) =>
      module !== "PROPERTY_FINANCE" && module !== "PROPERTY_DOCUMENT",
  );

const HOTEL_MANAGER_RESTRICTED_MANAGE_ROLES = [
  "HOTEL_OWNER",
  "HOTEL_BD",
  "HOTEL_MANAGER",
] as const;
const VIEW_ONLY_MODULES: PermissionModule[] = [
  "BOOKINGS",
  "PAYMENTS",
  "REPORT_BOOKING_SUMMARY",
  "REPORT_PROMOTIONS",
  "REPORT_RATE_HEALTH",
  "REPORT_INVENTORY_ALLOCATION",
  "GUEST_REVIEWS",
];
const HOTEL_ACCOUNTANT_ALLOWED_MODULES: PermissionModule[] = [
  "BOOKINGS",
  "PROPERTY_FINANCE",
  "FINANCE",
  "PAYMENTS",
];

/** Hotel Accountant permission rows shown in My Team. */
const HOTEL_ACCOUNTANT_PERMISSION_OPTIONS: {
  value: PermissionModule;
  label: string;
}[] = [
  { value: "BOOKINGS", label: "Bookings" },
  { value: "PROPERTY_FINANCE", label: "Property - Finance" },
  { value: "PAYMENTS", label: "Payment Report" },
];

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data:
      | CreateTeamMemberRequest
      | (UpdateTeamMemberRequest & {
          accountStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
        }),
  ) => Promise<void>;
  member?: TeamMember | null;
  mode: "create" | "edit";
  roleOptions: { value: TeamRole; label: string }[];
  defaultRoles: TeamRole[];
}

function TeamMemberFormModal({
  isOpen,
  onClose,
  onSubmit,
  member,
  mode,
  roleOptions,
  defaultRoles,
}: TeamMemberFormModalProps) {
  type TeamMemberFormData =
    | CreateTeamMemberRequest
    | (UpdateTeamMemberRequest & {
        accountStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
      });
  const [formData, setFormData] = useState<TeamMemberFormData>({
    email: "",
    roles: defaultRoles,
    firstName: "",
    lastName: "",
    phoneNumber: "",
    ...(mode === "edit" && member
      ? {
          accountStatus: member.accountStatus as
            | "ACTIVE"
            | "INACTIVE"
            | "SUSPENDED",
        }
      : {}),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && member) {
      const normalizedRoles = (member.roles?.length
        ? member.roles
        : [member.role]
      )
        .map((role) => normalizeTeamRole(role))
        .filter((role): role is TeamRole => role != null);
      const allowedRoleValues = new Set(roleOptions.map((role) => role.value));
      const filteredRoles = normalizedRoles.filter((role) =>
        allowedRoleValues.has(role),
      );
      const singleRole = filteredRoles[0]
        ? [filteredRoles[0]]
        : defaultRoles;
      setFormData({
        roles: singleRole,
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        phoneNumber: member.mobile || "",
        accountStatus: member.accountStatus as
          | "ACTIVE"
          | "INACTIVE"
          | "SUSPENDED",
      });
    } else {
      setFormData({
        email: "",
        roles: defaultRoles,
        firstName: "",
        lastName: "",
        phoneNumber: "",
      });
    }
    setErrors({});
    setApiError(null);
  }, [mode, member, isOpen, roleOptions, defaultRoles]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === "create" && (!("email" in formData) || !formData.email)) {
      newErrors.email = "Email is required";
    } else if (
      mode === "create" &&
      "email" in formData &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
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
      newErrors.roles = "Role is required";
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
    } catch (error: unknown) {
      console.error("Error submitting form:", error);
      const err = error as {
        message?: string;
        data?: Record<string, string> | { data?: Record<string, string> } | null;
      };

      const rawData = err?.data;
      const fieldErrors: Record<string, string> =
        rawData &&
        typeof rawData === "object" &&
        "data" in rawData &&
        rawData.data &&
        typeof rawData.data === "object"
          ? (rawData.data as Record<string, string>)
          : rawData && typeof rawData === "object"
            ? (rawData as Record<string, string>)
            : {};

      const nextErrors: Record<string, string> = {};
      if (typeof fieldErrors.email === "string") {
        nextErrors.email = fieldErrors.email;
      }
      if (typeof fieldErrors.firstName === "string") {
        nextErrors.firstName = fieldErrors.firstName;
      }
      if (typeof fieldErrors.lastName === "string") {
        nextErrors.lastName = fieldErrors.lastName;
      }
      if (typeof fieldErrors.phoneNumber === "string") {
        nextErrors.phoneNumber = fieldErrors.phoneNumber;
      }
      if (typeof fieldErrors.mobile === "string") {
        nextErrors.phoneNumber = fieldErrors.mobile;
      }
      if (typeof fieldErrors.roles === "string") {
        nextErrors.roles = fieldErrors.roles;
      }
      if (typeof fieldErrors.role === "string") {
        nextErrors.roles = fieldErrors.role;
      }
      if (typeof fieldErrors.accountStatus === "string") {
        nextErrors.accountStatus = fieldErrors.accountStatus;
      }

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
      } else {
        setApiError(
          err?.message || "Failed to save team member. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setFormData({ ...formData, phoneNumber: digitsOnly });
    if (errors.phoneNumber) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phoneNumber;
        return newErrors;
      });
    }
  };

  const handleRoleSelect = (role: TeamRole) => {
    if (!ALLOWED_TEAM_ROLES.has(role)) return;
    const allowedRoleValues = new Set(roleOptions.map((option) => option.value));
    if (!allowedRoleValues.has(role)) return;
    setFormData({ ...formData, roles: [role] });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: TEAM_BRAND.primary }}
            >
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {mode === "create" ? "Add Team Member" : "Edit Team Member"}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {mode === "create"
                  ? "Invite someone to help run this property"
                  : "Update this member's details and access"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6">
          {apiError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-rose-800">Could not save</p>
                <p className="mt-0.5 text-sm text-rose-700">{apiError}</p>
              </div>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="rounded-md p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-700"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {mode === "create" && (
            <Input
              label="Email"
              type="email"
              value={"email" in formData ? formData.email : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  email: e.target.value,
                } as CreateTeamMemberRequest)
              }
              error={errors.email}
              required
              icon={<Mail className="h-4 w-4 text-slate-400" />}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            label="Phone Number"
            type="tel"
            value={formData.phoneNumber}
            onChange={handlePhoneNumberChange}
            error={errors.phoneNumber}
            required
            icon={<Phone className="h-4 w-4 text-slate-400" />}
            placeholder="9876543210"
            maxLength={10}
            inputMode="numeric"
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Role <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {roleOptions.map((option) => {
                const selected = (formData.roles || [])[0] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleRoleSelect(option.value as TeamRole)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                      selected
                        ? "border-[#2f3d95]/40 bg-[#eef2ff] text-[#2f3d95] ring-1 ring-[#2f3d95]/20"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        selected
                          ? "bg-[#2f3d95] text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      <Shield className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.roles && (
              <p className="mt-2 text-sm text-rose-600" role="alert">
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

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Add Member"
                  : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissions: Permission[]) => Promise<void>;
  member: TeamMember | null;
}

function TeamStatusBadge({ status }: { status: string }) {
  const label =
    status === "ACTIVE"
      ? "Active"
      : status === "INACTIVE"
        ? "Inactive"
        : status === "SUSPENDED"
          ? "Suspended"
          : status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
        status === "ACTIVE"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : status === "INACTIVE"
            ? "bg-slate-100 text-slate-600 ring-slate-200"
            : "bg-rose-50 text-rose-700 ring-rose-200",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "ACTIVE"
            ? "bg-emerald-500"
            : status === "INACTIVE"
              ? "bg-slate-400"
              : "bg-rose-500",
        )}
      />
      {label}
    </span>
  );
}

function memberDisplayName(member: TeamMember): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName} ${member.lastName}`;
  }
  if (member.email) return member.email.split("@")[0];
  return `User ${member.userId}`;
}

function memberInitials(member: TeamMember): string {
  const first = member.firstName?.trim()?.[0];
  const last = member.lastName?.trim()?.[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  const fromEmail = member.email?.trim()?.[0];
  return (fromEmail || "U").toUpperCase();
}

interface TeamMemberDetailsModalProps {
  member: TeamMember | null;
  onClose: () => void;
  onEdit: (member: TeamMember) => void;
  onPermissions: (member: TeamMember) => void;
  onManageHotel: (member: TeamMember) => void;
  onRevoke: (member: TeamMember) => void;
  canManageMember: (member: TeamMember) => boolean;
  canManageHotel: (member: TeamMember) => boolean;
}

function TeamMemberDetailsModal({
  member,
  onClose,
  onEdit,
  onPermissions,
  onManageHotel,
  onRevoke,
  canManageMember,
  canManageHotel,
}: TeamMemberDetailsModalProps) {
  if (!member) return null;
  const actionLocked = !canManageMember(member);
  const lockTitle = "You do not have permission to manage this team member.";
  const fullName = memberDisplayName(member);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: TEAM_BRAND.primary }}
            >
              {memberInitials(member)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{fullName}</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                User ID · {member.userId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Contact
            </p>
            <div className="space-y-2.5 text-sm text-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{member.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                <span>{member.mobile || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Account
            </p>
            <div className="space-y-2.5 text-sm text-slate-700">
              <TeamStatusBadge status={member.accountStatus} />
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                  <CalendarDays className="h-3.5 w-3.5" />
                </span>
                <span>
                  Created{" "}
                  {member.createdAt
                    ? new Date(member.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:col-span-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Roles
            </p>
            <RoleBadge
              roles={
                member.roles?.length
                  ? member.roles
                  : member.role
                    ? [member.role]
                    : []
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            disabled={actionLocked}
            onClick={() => onEdit(member)}
            title={actionLocked ? lockTitle : "Edit"}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            disabled={actionLocked}
            onClick={() => onPermissions(member)}
            title={actionLocked ? lockTitle : "Manage Permissions"}
          >
            Permissions
          </Button>
          <Button
            variant="outline"
            disabled={actionLocked || !canManageHotel(member)}
            onClick={() => onManageHotel(member)}
            title={actionLocked ? lockTitle : "Manage Hotel"}
          >
            Hotels
          </Button>
          <Button
            variant="danger"
            disabled={actionLocked}
            onClick={() => onRevoke(member)}
            title={actionLocked ? lockTitle : "Revoke Access"}
          >
            Revoke
          </Button>
        </div>
      </div>
    </div>
  );
}

function PermissionsModal({
  isOpen,
  onClose,
  onSave,
  member,
}: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const memberRoles = member?.roles?.length ? member.roles : member?.role ? [member.role] : [];
  const isHotelManager = memberRoles.includes("HOTEL_MANAGER");
  const isFrontDesk = memberRoles.includes("FRONT_DESK_EXEC");
  const isAccountant = memberRoles.includes("HOTEL_ACCOUNTANT") || memberRoles.includes("ACCOUNTANT");
  const visiblePermissionModules = useMemo(
    () => {
      if (isFrontDesk) {
        return PERMISSION_MODULES.filter((module) => module.value === "BOOKINGS");
      }
      if (isAccountant) {
        return HOTEL_ACCOUNTANT_PERMISSION_OPTIONS.filter((module) =>
          HOTEL_ACCOUNTANT_ALLOWED_MODULES.includes(module.value),
        );
      }
      if (isHotelManager) {
        return PERMISSION_MODULES.filter((module) =>
          HOTEL_MANAGER_PERMISSION_MODULES.includes(module.value),
        );
      }
      return PERMISSION_MODULES.filter((module) => module.value !== "MY_TEAM");
    },
    [isAccountant, isFrontDesk, isHotelManager],
  );

  const hydratePermissions = (
    existingPermissions: Permission[] = [],
  ): Permission[] =>
    visiblePermissionModules.map((module) => {
      const existing = existingPermissions.find((p) => p.module === module.value);
      const basePermission =
        existing || { module: module.value, canView: false, canEdit: false };
      if (
        VIEW_ONLY_MODULES.includes(module.value)
      ) {
        return { ...basePermission, canEdit: false };
      }
      return basePermission;
    });

  useEffect(() => {
    if (!isOpen || !member?.userId) return;

    let cancelled = false;

    (async () => {
      setIsLoadingPerms(true);
      setApiError(null);
      setLoadWarning(null);

      const fallbackPermissions = hydratePermissions(member.permissions || []);
      if (!cancelled) {
        setPermissions(fallbackPermissions);
      }

      try {
        const profile = await adminService.getUserById(member.userId);
        if (!cancelled) {
          setPermissions(hydratePermissions(profile.permissions || []));
        }
      } catch (error) {
        console.error("Error loading user permissions:", error);
        if (!cancelled) {
          setPermissions(fallbackPermissions);
          setLoadWarning(
            "Could not load current permissions (you can still set and save them).",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPerms(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [member, isOpen, isHotelManager, isAccountant, visiblePermissionModules]);

  const handleToggleView = (module: PermissionModule) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module === module) {
          const newCanView = !p.canView;
          return {
            ...p,
            canView: newCanView,
            canEdit: newCanView ? p.canEdit : false,
          };
        }
        return p;
      }),
    );
  };

  const handleToggleEdit = (module: PermissionModule) => {
    if (VIEW_ONLY_MODULES.includes(module)) {
      return;
    }
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module === module) {
          const newCanEdit = !p.canEdit;
          return {
            ...p,
            canEdit: newCanEdit,
            canView: newCanEdit ? true : p.canView,
          };
        }
        return p;
      }),
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const filteredPermissions = permissions.filter((permission) =>
        visiblePermissionModules.some((module) => module.value === permission.module),
      );
      const normalizedPermissions = filteredPermissions.map((permission) =>
        VIEW_ONLY_MODULES.includes(permission.module)
          ? { ...permission, canEdit: false }
          : permission,
      );
      const finalPermissions = isFrontDesk
        ? normalizedPermissions.filter((permission) => permission.module === "BOOKINGS")
        : isAccountant
          ? normalizedPermissions.filter((permission) =>
              HOTEL_ACCOUNTANT_ALLOWED_MODULES.includes(
                permission.module as PermissionModule,
              ),
            )
          : normalizedPermissions;
      await onSave(finalPermissions);
      onClose();
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        error?.data?.message ||
        "Failed to save permissions. Please try again.";
      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: TEAM_BRAND.primary }}
            >
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Manage Permissions
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {member ? memberDisplayName(member) : "Team Member"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">
          {apiError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-rose-800">Could not save</p>
                <p className="mt-0.5 text-sm text-rose-700">{apiError}</p>
              </div>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="rounded-md p-1 text-rose-500 hover:bg-rose-100"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loadWarning && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">{loadWarning}</p>
            </div>
          )}

          {isLoadingPerms ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {visiblePermissionModules.map((module) => {
                const permission = permissions.find(
                  (p) => p.module === module.value,
                );
                const canView = permission?.canView || false;
                const canEdit = permission?.canEdit || false;
                const isViewOnlyModule = VIEW_ONLY_MODULES.includes(
                  module.value,
                );

                return (
                  <div
                    key={module.value}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 transition-colors hover:bg-white"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-slate-900">
                        {module.label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleView(module.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                          canView
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50",
                        )}
                      >
                        {canView ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEdit(module.value)}
                        disabled={!canView || isViewOnlyModule}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                          canEdit
                            ? "bg-[#eef2ff] text-[#2f3d95] ring-1 ring-[#2f3d95]/25"
                            : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50",
                          (!canView || isViewOnlyModule) &&
                            "cursor-not-allowed opacity-50",
                        )}
                      >
                        {canEdit ? (
                          <Unlock className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                        {isViewOnlyModule ? "View Only" : "Edit"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSubmitting || isLoadingPerms}
          >
            {isSubmitting ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MyTeamPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedHotelId = searchParams.get("hotelId");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [permissionsMember, setPermissionsMember] = useState<TeamMember | null>(
    null,
  );
  const [revokeMember, setRevokeMember] = useState<TeamMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const isCurrentUserHotelManager =
    !!user?.roles?.includes("HOTEL_MANAGER") &&
    !user?.roles?.includes("HOTEL_OWNER") &&
    !user?.roles?.includes("SUPER_ADMIN");
  const isCurrentUserHotelOwner =
    !!user?.roles?.includes("HOTEL_OWNER") &&
    !user?.roles?.includes("SUPER_ADMIN");
  const roleOptionsForForm = isCurrentUserHotelOwner
    ? TEAM_ROLE_OPTIONS.filter((role) =>
        HOTEL_OWNER_ASSIGNABLE_ROLES.includes(role.value as TeamRole),
      )
    : isCurrentUserHotelManager
      ? TEAM_ROLE_OPTIONS.filter((role) =>
          HOTEL_MANAGER_ASSIGNABLE_ROLES.includes(role.value as TeamRole),
        )
      : TEAM_ROLE_OPTIONS;
  const defaultRolesForForm: TeamRole[] = isCurrentUserHotelOwner
    ? ["HOTEL_MANAGER"]
    : isCurrentUserHotelManager
      ? ["FRONT_DESK_EXEC"]
      : ["HOTEL_MANAGER"];
  const sanitizeAssignableRoles = (
    roles: TeamRole[] | undefined,
    fallbackRoles: TeamRole[] = defaultRolesForForm,
  ): TeamRole[] => {
    const incoming = roles || [];
    const normalized = incoming.filter((role): role is TeamRole =>
      ALLOWED_TEAM_ROLES.has(role as TeamRole),
    );
    const pickOne = (allowed: TeamRole[]): TeamRole[] =>
      allowed.length ? [allowed[0]] : fallbackRoles.slice(0, 1);

    if (isCurrentUserHotelOwner) {
      return pickOne(
        normalized.filter((role) =>
          HOTEL_OWNER_ASSIGNABLE_ROLES.includes(role),
        ),
      );
    }
    if (isCurrentUserHotelManager) {
      return pickOne(
        normalized.filter((role) =>
          HOTEL_MANAGER_ASSIGNABLE_ROLES.includes(role),
        ),
      );
    }
    return pickOne(normalized);
  };
  const canHotelManagerAssignForMember = (member: TeamMember): boolean => {
    if (!isCurrentUserHotelManager) return true;
    const memberRoles = teamMemberRoleList(member);
    return memberRoles.some((role) => {
      const normalized = normalizeTeamRole(role);
      return (
        !!normalized && HOTEL_MANAGER_ASSIGNABLE_ROLES.includes(normalized)
      );
    });
  };

  const canHotelManagerManageMemberActions = (member: TeamMember): boolean => {
    if (!isCurrentUserHotelManager) return true;
    const memberRoles = teamMemberRoleList(member);
    return !memberRoles.some((role) =>
      HOTEL_MANAGER_RESTRICTED_MANAGE_ROLES.includes(
        role as (typeof HOTEL_MANAGER_RESTRICTED_MANAGE_ROLES)[number],
      ),
    );
  };

  const canHotelOwnerManageMember = (member: TeamMember): boolean =>
    !isHotelOwnerRestrictedMyTeamRow(
      member,
      user?.userId,
      isCurrentUserHotelOwner,
    );

  const canManageMemberActions = (member: TeamMember): boolean =>
    canHotelOwnerManageMember(member) && canHotelManagerManageMemberActions(member);

  useEffect(() => {
    if (selectedHotelId) {
      fetchTeamMembers();
    } else {
      setIsLoading(false);
    }
  }, [selectedHotelId]);

  useEffect(() => {
    setSearchInput("");
    setSearchFilter("");
  }, [selectedHotelId]);

  const displayedTeamMembers = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    if (!query) return teamMembers;

    return teamMembers.filter((member) => {
      const email = member.email?.toLowerCase() || "";
      const name = `${member.firstName || ""} ${member.lastName || ""}`
        .trim()
        .toLowerCase();
      const mobile = member.mobile?.toLowerCase() || "";
      return (
        email.includes(query) ||
        name.includes(query) ||
        mobile.includes(query)
      );
    });
  }, [teamMembers, searchFilter]);

  const applyTeamSearch = () => {
    setSearchFilter(searchInput.trim());
  };

  const resetTeamSearch = () => {
    setSearchInput("");
    setSearchFilter("");
  };

  const handleTeamSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyTeamSearch();
    }
  };

  useEffect(() => {
    if (
      editingMember &&
      !canManageMemberActions(editingMember)
    ) {
      setEditingMember(null);
    }
  }, [editingMember, canManageMemberActions]);

  useEffect(() => {
    if (
      permissionsMember &&
      !canManageMemberActions(permissionsMember)
    ) {
      setPermissionsMember(null);
    }
  }, [permissionsMember, canManageMemberActions]);

  useEffect(() => {
    if (
      revokeMember &&
      !canManageMemberActions(revokeMember)
    ) {
      setRevokeMember(null);
    }
  }, [revokeMember, canManageMemberActions]);

  const fetchTeamMembers = async () => {
    if (!selectedHotelId) return;
    try {
      setIsLoading(true);
      // Only use hotel users list API - GET /hotel/{hotelId}/users
      // API response already includes all user details
      const members = await teamService.getTeamMembers(selectedHotelId);
      setTeamMembers(members);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      setToast({
        message: error?.message || "Failed to load team members",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMember = async (
    data: CreateTeamMemberRequest | UpdateTeamMemberRequest,
  ) => {
    if (!selectedHotelId) return;
    try {
      const createData = data as CreateTeamMemberRequest;

      // Step 1: Create user using admin API (POST /admin/users)
      const userCreateRequest: CreateUserRequest = {
        email: createData.email,
        roles: sanitizeAssignableRoles(createData.roles) as CreateUserRequest["roles"],
        firstName: createData.firstName,
        lastName: createData.lastName,
        phoneNumber: createData.phoneNumber,
        stateIds: [],
      };

      const createdUser = await adminService.createUser(userCreateRequest);

      // Step 2: Assign user to hotel using POST /hotel/{hotelId}/users/{userId} (no payload)
      await teamService.assignHotelToUser(selectedHotelId, createdUser.userId);

      setToast({ message: "Team member added successfully", type: "success" });
      fetchTeamMembers();
    } catch (error: any) {
      console.error("Error creating team member:", error);
      throw error;
    }
  };

  const handleUpdateMember = async (
    data: CreateTeamMemberRequest | UpdateTeamMemberRequest,
  ) => {
    if (!editingMember) return;
    if (!canManageMemberActions(editingMember)) {
      setEditingMember(null);
      return;
    }
    try {
      // Use the same update user API as super admin (PUT /admin/users/{userId})
      const updateData = data as UpdateTeamMemberRequest & {
        accountStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
      };
      const roles = (
        updateData.roles?.length
          ? sanitizeAssignableRoles(updateData.roles)
          : editingMember.roles?.length
            ? sanitizeAssignableRoles(
                editingMember.roles.filter((role): role is TeamRole =>
                  ALLOWED_TEAM_ROLES.has(role as TeamRole),
                ),
              )
            : defaultRolesForForm
      ) as UpdateUserRequest["roles"];
      await adminService.updateUser(editingMember.userId, {
        email: editingMember.email,
        roles,
        firstName: updateData.firstName || editingMember.firstName || "",
        lastName: updateData.lastName || editingMember.lastName || "",
        phoneNumber: updateData.phoneNumber || editingMember.mobile || "",
        stateIds: [],
        accountStatus:
          updateData.accountStatus ||
          (editingMember.accountStatus as "ACTIVE" | "INACTIVE" | "SUSPENDED"),
      });
      setToast({
        message: "Team member updated successfully",
        type: "success",
      });
      fetchTeamMembers();
      setEditingMember(null);
    } catch (error: any) {
      console.error("Error updating team member:", error);
      throw error;
    }
  };

  const handleSavePermissions = async (permissions: Permission[]) => {
    if (!permissionsMember?.userId) {
      setToast({ message: "User ID not found", type: "error" });
      return;
    }
    if (!canManageMemberActions(permissionsMember)) {
      setPermissionsMember(null);
      return;
    }
    try {
      await teamService.assignPermissions(permissionsMember.userId, {
        permissions,
      });
      setToast({
        message: "Permissions updated successfully",
        type: "success",
      });
      fetchTeamMembers();
      setPermissionsMember(null);
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      throw error;
    }
  };

  const handleRevokeAccess = async (accessId: number) => {
    const member = teamMembers.find((m) => m.accessId === accessId);
    if (member && !canManageMemberActions(member)) {
      setToast({
        message: "You cannot revoke access for this team member.",
        type: "error",
      });
      return;
    }
    try {
      await teamService.revokeAccess(accessId);
      setToast({ message: "Access revoked successfully", type: "success" });
      fetchTeamMembers();
    } catch (error: any) {
      console.error("Error revoking access:", error);
      setToast({
        message: error?.message || "Failed to revoke access",
        type: "error",
      });
    }
  };

  if (!selectedHotelId) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            My Team
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a hotel from the dropdown above to manage team members
          </p>
        </div>
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-600">No hotel selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: TEAM_BRAND.primary }}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                My Team
              </h1>
              <p className="text-sm text-slate-500">
                Manage staff access and permissions for this property
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <LoadingSpinner />
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-[#eef2ff] via-white to-slate-50 px-6 py-10 text-center sm:px-10">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ backgroundColor: TEAM_BRAND.primary }}
            >
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              No team members yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
              Add managers, front desk, or accountants so they can help run this
              hotel.
            </p>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="mt-5 gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Team Member
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="Search team"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleTeamSearchKeyDown}
                  placeholder="Name, email, or mobile"
                  icon={<Search className="h-4 w-4 text-slate-400" />}
                />
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="primary" onClick={applyTeamSearch}>
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={resetTeamSearch}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {displayedTeamMembers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
                <Search className="h-5 w-5" />
              </div>
              <p className="font-medium text-slate-800">No matching team members</p>
              <p className="mt-1 text-sm text-slate-500">
                Try a different search term or reset filters.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
                <p className="text-sm font-semibold text-slate-900">
                  Team members
                </p>
                <span className="rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-xs font-semibold text-[#2f3d95]">
                  {displayedTeamMembers.length}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {displayedTeamMembers.map((member) => {
                  const actionLocked = !canManageMemberActions(member);
                  const actionLockTitle =
                    "You do not have permission to manage this team member.";
                  return (
                    <li key={member.accessId}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedMember(member)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedMember(member);
                          }
                        }}
                        className="grid gap-3 px-4 py-3.5 transition-colors hover:bg-[#f8f9ff] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                            style={{ backgroundColor: TEAM_BRAND.primary }}
                          >
                            {memberInitials(member)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {memberDisplayName(member)}
                              </p>
                              <TeamStatusBadge status={member.accountStatus} />
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {member.email || "N/A"}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3 shrink-0" />
                                {member.mobile || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 space-y-1.5">
                          <RoleBadge
                            roles={
                              member.roles?.length
                                ? member.roles
                                : member.role
                                  ? [member.role]
                                  : []
                            }
                          />
                          <p className="text-[11px] text-slate-400">
                            Joined{" "}
                            {member.createdAt
                              ? new Date(member.createdAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  },
                                )
                              : "N/A"}
                          </p>
                        </div>

                        <div
                          className="flex items-center gap-1 sm:justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={actionLocked}
                            onClick={() =>
                              !actionLocked && setEditingMember(member)
                            }
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                              actionLocked
                                ? "cursor-not-allowed text-slate-300"
                                : "text-slate-500 hover:bg-[#eef2ff] hover:text-[#2f3d95]",
                            )}
                            title={actionLocked ? actionLockTitle : "Edit"}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={actionLocked}
                            onClick={() =>
                              !actionLocked && setPermissionsMember(member)
                            }
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                              actionLocked
                                ? "cursor-not-allowed text-slate-300"
                                : "text-slate-500 hover:bg-[#eef2ff] hover:text-[#2f3d95]",
                            )}
                            title={
                              actionLocked
                                ? actionLockTitle
                                : "Manage Permissions"
                            }
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              actionLocked ||
                              !canHotelManagerAssignForMember(member)
                            }
                            onClick={() => {
                              if (
                                actionLocked ||
                                !canHotelManagerAssignForMember(member)
                              ) {
                                return;
                              }
                              navigate(
                                `${ROUTES.TEAM.USER_MANAGE_HOTELS(member.userId)}?hotelId=${encodeURIComponent(selectedHotelId)}`,
                              );
                            }}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                              actionLocked ||
                                !canHotelManagerAssignForMember(member)
                                ? "cursor-not-allowed text-slate-300"
                                : "text-slate-500 hover:bg-[#eef2ff] hover:text-[#2f3d95]",
                            )}
                            title={
                              actionLocked ? actionLockTitle : "Manage Hotel"
                            }
                          >
                            <Building2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={actionLocked}
                            onClick={() =>
                              !actionLocked && setRevokeMember(member)
                            }
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                              actionLocked
                                ? "cursor-not-allowed text-slate-300"
                                : "text-slate-500 hover:bg-rose-50 hover:text-rose-600",
                            )}
                            title={
                              actionLocked ? actionLockTitle : "Revoke Access"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <TeamMemberFormModal
        isOpen={showCreateModal || !!editingMember}
        onClose={() => {
          setShowCreateModal(false);
          setEditingMember(null);
        }}
        onSubmit={editingMember ? handleUpdateMember : handleCreateMember}
        member={editingMember}
        mode={editingMember ? "edit" : "create"}
        roleOptions={roleOptionsForForm as { value: TeamRole; label: string }[]}
        defaultRoles={defaultRolesForForm}
      />

      {/* Permissions Modal */}
      <PermissionsModal
        isOpen={!!permissionsMember}
        onClose={() => setPermissionsMember(null)}
        onSave={handleSavePermissions}
        member={permissionsMember}
      />

      <TeamMemberDetailsModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onEdit={(member) => {
          setSelectedMember(null);
          setEditingMember(member);
        }}
        onPermissions={(member) => {
          setSelectedMember(null);
          setPermissionsMember(member);
        }}
        onManageHotel={(member) => {
          setSelectedMember(null);
          navigate(
            `${ROUTES.TEAM.USER_MANAGE_HOTELS(member.userId)}?hotelId=${encodeURIComponent(selectedHotelId)}`,
          );
        }}
        onRevoke={(member) => {
          setSelectedMember(null);
          setRevokeMember(member);
        }}
        canManageMember={canManageMemberActions}
        canManageHotel={canHotelManagerAssignForMember}
      />

      {/* Revoke Confirmation Modal */}
      {revokeMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={(e) => e.target === e.currentTarget && setRevokeMember(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-rose-100 bg-rose-50/80 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Revoke Access
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Remove this user&apos;s access to the selected hotel.
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <p className="text-sm text-slate-700">
                Are you sure you want to revoke access for{" "}
                <span className="font-semibold text-slate-900">
                  {revokeMember.firstName && revokeMember.lastName
                    ? `${revokeMember.firstName} ${revokeMember.lastName}`
                    : revokeMember.email}
                </span>
                ?
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRevokeMember(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={async () => {
                    await handleRevokeAccess(revokeMember.accessId);
                    setRevokeMember(null);
                  }}
                >
                  Revoke
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
