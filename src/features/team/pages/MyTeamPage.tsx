import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { teamService, type TeamMember, type CreateTeamMemberRequest, type UpdateTeamMemberRequest, type Permission, type TeamRole, type PermissionModule } from "../services/teamService";
import { adminService, type CreateUserRequest } from "@/features/admin/services/adminService";
import { Button, Input, Select, LoadingSpinner } from "@/components/ui";
import { Toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit,
  X,
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
} from "lucide-react";

const TEAM_ROLE_OPTIONS = [
  { value: "HOTEL_MANAGER", label: "Hotel Manager" },
  { value: "FRONT_DESK_EXEC", label: "Front Desk" },
  { value: "HOUSEKEEPING_STAFF", label: "Housekeeping" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "BOOKING_AGENT", label: "Booking Agent" },
  { value: "READ_ONLY", label: "Read Only" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

const PERMISSION_MODULES: { value: PermissionModule; label: string }[] = [
  { value: "BOOKINGS", label: "Bookings" },
  { value: "RATES_INVENTORY", label: "Rates & Inventory" },
  { value: "OFFERS", label: "Offers" },
  { value: "CONTENT", label: "Content" },
  { value: "ANALYTICS", label: "Analytics" },
  { value: "MESSAGES", label: "Messages" },
  { value: "DASHBOARD", label: "Dashboard" },
  { value: "FINANCE", label: "Finance" },
];

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTeamMemberRequest | (UpdateTeamMemberRequest & { accountStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED" })) => Promise<void>;
  member?: TeamMember | null;
  mode: "create" | "edit";
}

function TeamMemberFormModal({ isOpen, onClose, onSubmit, member, mode }: TeamMemberFormModalProps) {
  const [formData, setFormData] = useState<CreateTeamMemberRequest | (UpdateTeamMemberRequest & { accountStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED" })>({
    email: "",
    role: "HOTEL_MANAGER",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    ...(mode === "edit" && member ? { accountStatus: member.accountStatus as "ACTIVE" | "INACTIVE" | "SUSPENDED" } : {}),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && member) {
      setFormData({
        role: member.role as TeamRole,
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        phoneNumber: member.mobile || "",
        accountStatus: member.accountStatus as "ACTIVE" | "INACTIVE" | "SUSPENDED",
      });
    } else {
      setFormData({
        email: "",
        role: "HOTEL_MANAGER",
        firstName: "",
        lastName: "",
        phoneNumber: "",
      });
    }
    setErrors({});
    setApiError(null);
  }, [mode, member, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === "create" && (!("email" in formData) || !formData.email)) {
      newErrors.email = "Email is required";
    } else if (mode === "create" && "email" in formData && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    if (mode === "edit" && "accountStatus" in formData && !formData.accountStatus) {
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
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
              onChange={(e) => setFormData({ ...formData, email: e.target.value } as CreateTeamMemberRequest)}
              error={errors.email}
              required
              icon={<Mail className="w-4 h-4 text-gray-400" />}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              error={errors.firstName}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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

          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as TeamRole })}
            error={errors.role}
            options={TEAM_ROLE_OPTIONS}
            required
            icon={<Shield className="w-4 h-4 text-gray-400" />}
          />

          {mode === "edit" && (
            <Select
              label="Account Status"
              value={"accountStatus" in formData ? formData.accountStatus : "ACTIVE"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  accountStatus: e.target.value as "ACTIVE" | "INACTIVE" | "SUSPENDED",
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
              {isSubmitting ? "Saving..." : mode === "create" ? "Add Member" : "Update Member"}
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

function PermissionsModal({ isOpen, onClose, onSave, member }: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (member?.permissions) {
      const existingPermissions = member.permissions;
      const allPermissions: Permission[] = PERMISSION_MODULES.map((module) => {
        const existing = existingPermissions.find((p) => p.module === module.value);
        return existing || { module: module.value, canView: false, canEdit: false };
      });
      setPermissions(allPermissions);
    } else {
      setPermissions(
        PERMISSION_MODULES.map((module) => ({
          module: module.value,
          canView: false,
          canEdit: false,
        }))
      );
    }
  }, [member, isOpen]);

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
      })
    );
  };

  const handleToggleEdit = (module: PermissionModule) => {
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
      })
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      await onSave(permissions);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Permissions</h2>
              <p className="text-sm text-gray-600">
                {member ? `${member.firstName} ${member.lastName}` : "Team Member"}
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
              {PERMISSION_MODULES.map((module) => {
                const permission = permissions.find((p) => p.module === module.value);
                const canView = permission?.canView || false;
                const canEdit = permission?.canEdit || false;

                return (
                  <div
                    key={module.value}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{module.label}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleView(module.value)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                          canView
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {canView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEdit(module.value)}
                        disabled={!canView}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                          canEdit
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                          !canView && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {canEdit ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        Edit
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
            <Button type="button" variant="primary" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyTeamPage() {
  const [searchParams] = useSearchParams();
  const selectedHotelId = searchParams.get("hotelId");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [permissionsMember, setPermissionsMember] = useState<TeamMember | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (selectedHotelId) {
      fetchTeamMembers();
    } else {
      setIsLoading(false);
    }
  }, [selectedHotelId]);

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

  const handleCreateMember = async (data: CreateTeamMemberRequest | UpdateTeamMemberRequest) => {
    if (!selectedHotelId) return;
    try {
      const createData = data as CreateTeamMemberRequest;
      
      // Step 1: Create user using admin API (POST /admin/users)
      const userCreateRequest: CreateUserRequest = {
        email: createData.email,
        role: "HOTEL_MANAGER", // Default role for user creation
        firstName: createData.firstName,
        lastName: createData.lastName,
        phoneNumber: createData.phoneNumber,
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

  const handleUpdateMember = async (data: CreateTeamMemberRequest | UpdateTeamMemberRequest) => {
    if (!editingMember) return;
    try {
      // Use the same update user API as super admin (PUT /admin/users/{userId})
      const updateData = data as UpdateTeamMemberRequest & { accountStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED" };
      await adminService.updateUser(editingMember.userId, {
        email: editingMember.email,
        role: "HOTEL_MANAGER", // System role (team role is managed separately via hotel assignment)
        firstName: updateData.firstName || editingMember.firstName || "",
        lastName: updateData.lastName || editingMember.lastName || "",
        phoneNumber: updateData.phoneNumber || editingMember.mobile || "",
        accountStatus: updateData.accountStatus || editingMember.accountStatus as "ACTIVE" | "INACTIVE" | "SUSPENDED",
      });
      setToast({ message: "Team member updated successfully", type: "success" });
      fetchTeamMembers();
      setEditingMember(null);
    } catch (error: any) {
      console.error("Error updating team member:", error);
      throw error;
    }
  };

  const handleSavePermissions = async (permissions: Permission[]) => {
    if (!permissionsMember?.accessId) {
      setToast({ message: "Access ID not found", type: "error" });
      return;
    }
    try {
      await teamService.assignPermissions(permissionsMember.accessId, { permissions });
      setToast({ message: "Permissions updated successfully", type: "success" });
      fetchTeamMembers();
      setPermissionsMember(null);
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      throw error;
    }
  };

  const handleRevokeAccess = async (accessId: number) => {
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

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      HOTEL_MANAGER: "bg-purple-100 text-purple-700",
      FRONT_DESK_EXEC: "bg-blue-100 text-blue-700",
      HOUSEKEEPING_STAFF: "bg-green-100 text-green-700",
      ACCOUNTANT: "bg-yellow-100 text-yellow-700",
      BOOKING_AGENT: "bg-indigo-100 text-indigo-700",
      READ_ONLY: "bg-gray-100 text-gray-700",
      OWNER: "bg-red-100 text-red-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  const getRoleLabel = (role: string) => {
    const roleOption = TEAM_ROLE_OPTIONS.find((r) => r.value === role);
    if (roleOption) return roleOption.label;
    if (role === "OWNER") return "Owner";
    return role;
  };

  if (!selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
          <p className="text-gray-600 mt-2">Please select a hotel from the dropdown above to manage team members</p>
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
          <p className="text-gray-600 mt-2">Manage your team members and their permissions</p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members yet</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first team member</p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)} className="gap-2">
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
                    Role
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
                {teamMembers.map((member) => (
                  <tr key={member.accessId} className="hover:bg-blue-50 transition-colors even:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", getRoleBadgeColor(member.role))}>
                        {getRoleLabel(member.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                        member.accountStatus === "ACTIVE" 
                          ? "bg-green-100 text-green-700"
                          : member.accountStatus === "INACTIVE"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {member.accountStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {member.createdAt 
                          ? new Date(member.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMember(member)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPermissionsMember(member)}
                          className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Manage Permissions"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to revoke access for this team member?")) {
                              handleRevokeAccess(member.accessId);
                            }
                          }}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Revoke Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
      />

      {/* Permissions Modal */}
      <PermissionsModal
        isOpen={!!permissionsMember}
        onClose={() => setPermissionsMember(null)}
        onSave={handleSavePermissions}
        member={permissionsMember}
      />

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
