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
} from "lucide-react";

const TEAM_ROLE_OPTIONS = [
  { value: "HOTEL_MANAGER", label: "Hotel Manager" },
  { value: "FRONT_DESK_EXEC", label: "Front Desk" },
  { value: "ACCOUNTANT", label: "Accountant" },
];
const HOTEL_OWNER_ASSIGNABLE_ROLES: TeamRole[] = ["HOTEL_MANAGER"];
const HOTEL_MANAGER_ASSIGNABLE_ROLES: TeamRole[] = [
  "FRONT_DESK_EXEC",
  "ACCOUNTANT",
];
const ALLOWED_TEAM_ROLES = new Set(
  TEAM_ROLE_OPTIONS.map((role) => role.value as TeamRole),
);

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
  { value: "BOOKINGS", label: "Bookings" },
  { value: "MY_TEAM", label: "My Team" },
  { value: "RATES_INVENTORY", label: "Rates & Inventory" },
  { value: "DASHBOARD", label: "Dashboard" },
  { value: "FINANCE", label: "Finance" },

  // Hotel / Property Information sections
  { value: "PROPERTY_BASIC_INFO", label: "Property - Basic Information" },
  { value: "PROPERTY_ROOMS_RATEPLANS", label: "Property - Rooms & Rate Plans" },
  { value: "PROPERTY_PHOTOS_VIDEOS", label: "Property - Photos & Videos" },
  { value: "PROPERTY_AMENITIES_RESTAURANTS", label: "Property - Amenities & Restaurants" },
  { value: "PROPERTY_POLICY_RULES", label: "Property - Policy & Rules" },
  { value: "PROPERTY_FINANCE", label: "Property - Finance" },
  { value: "PROPERTY_DOCUMENT", label: "Property - Documents" },
];

const HOTEL_MANAGER_BLOCKED_MODULES: PermissionModule[] = [
  "FINANCE",
  "PROPERTY_FINANCE",
  "PROPERTY_DOCUMENT",
];
const HOTEL_MANAGER_RESTRICTED_MANAGE_ROLES = [
  "HOTEL_OWNER",
  "HOTEL_BD",
  "HOTEL_MANAGER",
] as const;
const VIEW_ONLY_MODULES: PermissionModule[] = ["BOOKINGS"];
const ACCOUNTANT_ALLOWED_MODULES: PermissionModule[] = ["BOOKINGS", "FINANCE"];

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
      ).filter((role): role is TeamRole => ALLOWED_TEAM_ROLES.has(role as TeamRole));
      const allowedRoleValues = new Set(roleOptions.map((role) => role.value));
      const filteredRoles = normalizedRoles.filter((role) =>
        allowedRoleValues.has(role),
      );
      setFormData({
        roles: filteredRoles.length ? filteredRoles : defaultRoles,
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
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        error?.data?.message ||
        "Failed to save team member. Please try again.";
      setApiError(errorMessage);
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

  const handleRoleToggle = (role: TeamRole) => {
    if (!ALLOWED_TEAM_ROLES.has(role)) return;
    const allowedRoleValues = new Set(roleOptions.map((option) => option.value));
    if (!allowedRoleValues.has(role)) return;
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
                {mode === "create" ? "Add Team Member" : "Edit Team Member"}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === "create"
                  ? "Add a new team member to your hotel"
                  : "Update team member information"}
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
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <X className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
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
              icon={<Mail className="w-4 h-4 text-gray-400" />}
            />
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
                  option.value as TeamRole,
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
                        handleRoleToggle(option.value as TeamRole)
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
                  ? "Add Member"
                  : "Update Member"}
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
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        status === "ACTIVE"
          ? "bg-green-100 text-green-700"
          : status === "INACTIVE"
            ? "bg-gray-100 text-gray-700"
            : "bg-red-100 text-red-700",
      )}
    >
      {status}
    </span>
  );
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
  const fullName =
    member.firstName && member.lastName
      ? `${member.firstName} ${member.lastName}`
      : member.email
        ? member.email.split("@")[0]
        : `User ${member.userId}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
              <p className="text-sm text-gray-600">User ID: {member.userId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-3">
              Contact
            </p>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>{member.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-500" />
                <span>{member.mobile || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-3">
              Account
            </p>
            <div className="space-y-2 text-sm text-gray-700">
              <div>
                <TeamStatusBadge status={member.accountStatus} />
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-violet-500" />
                <span>
                  Created:{" "}
                  {member.createdAt
                    ? new Date(member.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-3">
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

        <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
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
            Manage Permissions
          </Button>
          <Button
            variant="outline"
            disabled={actionLocked || !canManageHotel(member)}
            onClick={() => onManageHotel(member)}
            title={actionLocked ? lockTitle : "Manage Hotel"}
          >
            Manage Hotel
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const memberRoles = member?.roles?.length ? member.roles : member?.role ? [member.role] : [];
  const isHotelManager = memberRoles.includes("HOTEL_MANAGER");
  const isFrontDesk = memberRoles.includes("FRONT_DESK_EXEC");
  const isAccountant = memberRoles.includes("ACCOUNTANT");
  const visiblePermissionModules = useMemo(
    () => {
      if (isFrontDesk) {
        return PERMISSION_MODULES.filter((module) => module.value === "BOOKINGS");
      }
      if (isAccountant) {
        return PERMISSION_MODULES.filter((module) =>
          ACCOUNTANT_ALLOWED_MODULES.includes(module.value),
        );
      }
      return PERMISSION_MODULES.filter((module) => {
        if (!isHotelManager && module.value === "MY_TEAM") return false;
        if (isHotelManager && HOTEL_MANAGER_BLOCKED_MODULES.includes(module.value)) {
          return false;
        }
        return true;
      });
    },
    [isAccountant, isFrontDesk, isHotelManager],
  );

  useEffect(() => {
    if (member?.permissions) {
      const existingPermissions = member.permissions;
      const allPermissions: Permission[] = visiblePermissionModules.map((module) => {
        const existing = existingPermissions.find(
          (p) => p.module === module.value,
        );
        const basePermission =
          existing || { module: module.value, canView: false, canEdit: false };
        if (
          VIEW_ONLY_MODULES.includes(module.value) ||
          (isAccountant && ACCOUNTANT_ALLOWED_MODULES.includes(module.value))
        ) {
          return { ...basePermission, canEdit: false };
        }
        return basePermission;
      });
      setPermissions(allPermissions);
    } else {
      setPermissions(
        visiblePermissionModules.map((module) => ({
          module: module.value,
          canView: false,
          canEdit: false,
        })),
      );
    }
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
    if (
      VIEW_ONLY_MODULES.includes(module) ||
      (isAccountant && ACCOUNTANT_ALLOWED_MODULES.includes(module))
    ) {
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
        VIEW_ONLY_MODULES.includes(permission.module) ||
        (isAccountant &&
          ACCOUNTANT_ALLOWED_MODULES.includes(permission.module as PermissionModule))
          ? { ...permission, canEdit: false }
          : permission,
      );
      const finalPermissions = isFrontDesk
        ? normalizedPermissions.filter((permission) => permission.module === "BOOKINGS")
        : isAccountant
          ? normalizedPermissions.filter((permission) =>
              ACCOUNTANT_ALLOWED_MODULES.includes(
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Manage Permissions
              </h2>
              <p className="text-sm text-gray-600">
                {member
                  ? `${member.firstName} ${member.lastName}`
                  : "Team Member"}
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

        <div className="p-6">
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
              <X className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
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

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {visiblePermissionModules.map((module) => {
                const permission = permissions.find(
                  (p) => p.module === module.value,
                );
                const canView = permission?.canView || false;
                const canEdit = permission?.canEdit || false;
                const isViewOnlyModule =
                  VIEW_ONLY_MODULES.includes(module.value) ||
                  (isAccountant &&
                    ACCOUNTANT_ALLOWED_MODULES.includes(module.value));

                return (
                  <div
                    key={module.value}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {module.label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleView(module.value)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                          canView
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                        )}
                      >
                        {canView ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEdit(module.value)}
                        disabled={!canView || isViewOnlyModule}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                          canEdit
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                          (!canView || isViewOnlyModule) && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        {canEdit ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                        {isViewOnlyModule ? "View Only" : "Edit"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
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
    if (isCurrentUserHotelOwner) {
      const allowed = normalized.filter((role) =>
        HOTEL_OWNER_ASSIGNABLE_ROLES.includes(role),
      );
      return allowed.length ? allowed : fallbackRoles;
    }
    if (isCurrentUserHotelManager) {
      const allowed = normalized.filter((role) =>
        HOTEL_MANAGER_ASSIGNABLE_ROLES.includes(role),
      );
      return allowed.length ? allowed : fallbackRoles;
    }
    return normalized.length ? normalized : fallbackRoles;
  };
  const canHotelManagerAssignForMember = (member: TeamMember): boolean => {
    if (!isCurrentUserHotelManager) return true;
    const memberRoles = teamMemberRoleList(member);
    return memberRoles.some((role) =>
      HOTEL_MANAGER_ASSIGNABLE_ROLES.includes(role as TeamRole),
    );
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
          <p className="text-gray-600 mt-2">
            Please select a hotel from the dropdown above to manage team members
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-gray-500">No hotel selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
          <p className="text-gray-600 mt-2">
            Manage your team members and their permissions
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No team members yet
            </h3>
            <p className="text-gray-500 mb-6">
              Get started by adding your first team member
            </p>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Team Member
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2f3d95] border-b-2 border-[#1e2a7a]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamMembers.map((member) => {
                  const actionLocked = !canManageMemberActions(member);
                  const actionLockTitle =
                    "You do not have permission to manage this team member.";
                  return (
                  <tr
                    key={member.accessId}
                    className="hover:bg-blue-50 transition-colors even:bg-gray-50"
                    onClick={() => setSelectedMember(member)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.firstName && member.lastName
                              ? `${member.firstName} ${member.lastName}`
                              : member.email
                                ? member.email.split("@")[0]
                                : `User ${member.userId}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-700">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {member.email || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-700">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {member.mobile || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge
                        roles={
                          member.roles?.length
                            ? member.roles
                            : member.role
                              ? [member.role]
                              : []
                        }
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          member.accountStatus === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : member.accountStatus === "INACTIVE"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-red-100 text-red-700",
                        )}
                      >
                        {member.accountStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            !actionLocked && setEditingMember(member);
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            actionLocked
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-blue-600 hover:text-blue-900 hover:bg-blue-50",
                          )}
                          title={
                            actionLocked ? actionLockTitle : "Edit"
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={actionLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            !actionLocked && setPermissionsMember(member);
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            actionLocked
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50",
                          )}
                          title={
                            actionLocked
                              ? actionLockTitle
                              : "Manage Permissions"
                          }
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={
                            actionLocked ||
                            !canHotelManagerAssignForMember(member)
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            !actionLocked &&
                              canHotelManagerAssignForMember(member) &&
                              navigate(
                                `${ROUTES.TEAM.USER_MANAGE_HOTELS(member.userId)}?hotelId=${encodeURIComponent(selectedHotelId)}`,
                              );
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            actionLocked ||
                              !canHotelManagerAssignForMember(member)
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-purple-600 hover:text-purple-900 hover:bg-purple-50",
                          )}
                          title={
                            actionLocked
                              ? actionLockTitle
                              : "Manage Hotel"
                          }
                        >
                          <Building2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={actionLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            !actionLocked && setRevokeMember(member);
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            actionLocked
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-red-600 hover:text-red-900 hover:bg-red-50",
                          )}
                          title={
                            actionLocked
                              ? actionLockTitle
                              : "Revoke Access"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setRevokeMember(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-red-50 to-orange-50">
              <h3 className="text-lg font-bold text-gray-900">Revoke Access</h3>
              <p className="text-sm text-gray-600 mt-1">
                Remove this user&apos;s access to the selected hotel.
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to revoke access for{" "}
                <span className="font-semibold text-gray-900">
                  {revokeMember.firstName && revokeMember.lastName
                    ? `${revokeMember.firstName} ${revokeMember.lastName}`
                    : revokeMember.email}
                </span>
                ?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
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
