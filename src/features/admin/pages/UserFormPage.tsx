import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  Mail,
  Phone,
  Shield,
  UserRound,
  MapPinned,
  BadgeCheck,
  X,
} from "lucide-react";
import { Button, Input, LoadingSpinner, Select } from "@/components/ui";
import { ROUTES } from "@/constants";
import {
  adminService,
  type CreateUserRequest,
  type StateMasterItem,
  type UpdateUserRequest,
  type User,
} from "../services/adminService";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: { value: CreateUserRequest["roles"][number]; label: string }[] = [
  { value: "HOTEL_OWNER", label: "Hotel Owner" },
  { value: "HOTEL_BD", label: "Hotel BD" },
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

const STATE_MAPPED_ROLES = new Set<CreateUserRequest["roles"][number]>([
  "HOTEL_BD",
  "PACKAGE_BD",
  "TRANSPORT_BD",
  "SALES_MANAGER",
  "ZONAL_MANAGER_HOTEL",
  "ZONAL_MANAGER_SALES",
  "QC",
]);

type UserFormState = {
  email: string;
  roles: CreateUserRequest["roles"];
  firstName: string;
  lastName: string;
  phoneNumber: string;
  stateIds: number[];
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
};

const INITIAL_FORM: UserFormState = {
  email: "",
  roles: [],
  firstName: "",
  lastName: "",
  phoneNumber: "",
  stateIds: [],
  accountStatus: "ACTIVE",
};

const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;

export default function UserFormPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isEdit = Number.isFinite(Number(userId));
  const numericUserId = isEdit ? Number(userId) : NaN;

  const [formData, setFormData] = useState<UserFormState>(INITIAL_FORM);
  const [states, setStates] = useState<StateMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [serverErrorPopup, setServerErrorPopup] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        const [allStates, user] = await Promise.all([
          adminService.getStates(),
          isEdit ? adminService.getUserById(numericUserId) : Promise.resolve(null),
        ]);
        setStates((allStates || []).filter((s) => s.active));
        if (user) {
          hydrateFormForEdit(user);
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        setApiError(err?.message || "Failed to load user form");
      } finally {
        setIsLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, numericUserId]);

  const selectedStateNames = useMemo(() => {
    if (!formData.stateIds.length) return "Select states";
    const map = new Map(states.map((s) => [s.id, s.name]));
    return formData.stateIds
      .map((id) => map.get(id))
      .filter(Boolean)
      .join(", ");
  }, [formData.stateIds, states]);

  const requiresStateMapping = useMemo(
    () => formData.roles.some((role) => STATE_MAPPED_ROLES.has(role)),
    [formData.roles],
  );

  const isHotelBdSelected = useMemo(
    () => formData.roles.includes("HOTEL_BD"),
    [formData.roles],
  );

  function hydrateFormForEdit(user: User) {
    const normalizedRoles = (user.roles || user.role || []).filter(
      (role): role is CreateUserRequest["roles"][number] =>
        typeof role === "string" && ALLOWED_SUPER_ADMIN_ROLES.has(role as any),
    );
    setFormData({
      email: user.email || "",
      roles: normalizedRoles,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phoneNumber: user.phoneNumber || "",
      stateIds: user.stateIds || [],
      accountStatus: user.accountStatus || "ACTIVE",
    });
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.trim();
    const phone = formData.phoneNumber.trim();

    if (!firstName) next.firstName = "First name is required";
    else if (firstName.length < 2 || firstName.length > 50) {
      next.firstName = "First name must be 2-50 characters";
    } else if (!NAME_REGEX.test(firstName)) {
      next.firstName = "First name can contain letters and spaces only";
    }

    if (!lastName) next.lastName = "Last name is required";
    else if (lastName.length < 2 || lastName.length > 50) {
      next.lastName = "Last name must be 2-50 characters";
    } else if (!NAME_REGEX.test(lastName)) {
      next.lastName = "Last name can contain letters and spaces only";
    }

    if (!email) next.email = "Email is required";
    else if (email.length > 120) {
      next.email = "Email must be 120 characters or less";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Invalid email format";
    }

    if (!phone) next.phoneNumber = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(phone)) {
      next.phoneNumber = "Phone number must be a valid 10-digit mobile";
    }

    if (!formData.roles.length) next.roles = "At least one role is required";
    if (requiresStateMapping && !formData.stateIds.length) {
      next.stateIds = "Select at least one state";
    }
    if (isEdit && !formData.accountStatus) next.accountStatus = "Account status is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const toggleRole = (role: CreateUserRequest["roles"][number]) => {
    setFormData((prev) => {
      const has = prev.roles.includes(role);
      const roles = has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role];
      const roleNeedsState = roles.some((selectedRole) => STATE_MAPPED_ROLES.has(selectedRole));
      return {
        ...prev,
        roles,
        stateIds: roleNeedsState ? prev.stateIds : [],
      };
    });
    if (errors.roles) {
      setErrors((prev) => ({ ...prev, roles: "" }));
    }
    if (errors.stateIds) {
      setErrors((prev) => ({ ...prev, stateIds: "" }));
    }
  };

  const toggleAllRoles = () => {
    setFormData((prev) => {
      const allSelected = prev.roles.length === ROLE_OPTIONS.length;
      const roles = allSelected ? [] : ROLE_OPTIONS.map((option) => option.value);
      const roleNeedsState = roles.some((selectedRole) => STATE_MAPPED_ROLES.has(selectedRole));
      return {
        ...prev,
        roles,
        stateIds: roleNeedsState ? prev.stateIds : [],
      };
    });
    if (errors.roles) {
      setErrors((prev) => ({ ...prev, roles: "" }));
    }
    if (errors.stateIds) {
      setErrors((prev) => ({ ...prev, stateIds: "" }));
    }
  };

  const toggleState = (stateId: number) => {
    setFormData((prev) => {
      const has = prev.stateIds.includes(stateId);
      const stateIds = has
        ? prev.stateIds.filter((id) => id !== stateId)
        : [...prev.stateIds, stateId];
      return { ...prev, stateIds };
    });
    if (errors.stateIds) {
      setErrors((prev) => ({ ...prev, stateIds: "" }));
    }
  };

  const toggleAllStates = () => {
    setFormData((prev) => {
      const allStateIds = states.map((state) => state.id);
      const allSelected = allStateIds.length > 0 && prev.stateIds.length === allStateIds.length;
      return {
        ...prev,
        stateIds: allSelected ? [] : allStateIds,
      };
    });
    if (errors.stateIds) {
      setErrors((prev) => ({ ...prev, stateIds: "" }));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setApiError(null);
    setServerErrorPopup(null);
    try {
      if (isEdit) {
        const payload: UpdateUserRequest = {
          email: formData.email.trim(),
          roles: formData.roles,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          stateIds: requiresStateMapping ? formData.stateIds : [],
          accountStatus: formData.accountStatus,
        };
        await adminService.updateUser(numericUserId, payload);
      } else {
        const payload: CreateUserRequest = {
          email: formData.email.trim(),
          roles: formData.roles,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          stateIds: requiresStateMapping ? formData.stateIds : [],
        };
        await adminService.createUser(payload);
      }
      navigate(ROUTES.ADMIN.USERS);
    } catch (err: unknown) {
      const eobj = err as { message?: string; data?: { data?: Record<string, string> } };
      const fieldErrors = eobj?.data?.data || {};
      const next: Record<string, string> = {};
      if (fieldErrors.email) next.email = fieldErrors.email;
      if (fieldErrors.firstName) next.firstName = fieldErrors.firstName;
      if (fieldErrors.lastName) next.lastName = fieldErrors.lastName;
      if (fieldErrors.phoneNumber) next.phoneNumber = fieldErrors.phoneNumber;
      if (fieldErrors.role || fieldErrors.roles) next.roles = fieldErrors.role || fieldErrors.roles;
      if (fieldErrors.stateIds) next.stateIds = fieldErrors.stateIds;
      if (Object.keys(next).length) setErrors(next);
      else setServerErrorPopup(eobj?.message || "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTES.ADMIN.USERS)}
          className="mt-1 p-2 rounded-lg hover:bg-white/70 text-gray-700 border border-transparent hover:border-gray-200"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isEdit ? "Update user" : "Create user"}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage identity, role assignment, and applicable states.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 sm:p-8">
        <form onSubmit={onSubmit} className="space-y-6">
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-indigo-900 mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-md bg-indigo-100 text-indigo-700 p-1.5">
                <UserRound className="w-4 h-4" />
              </span>
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                error={errors.firstName}
                required
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                error={errors.lastName}
                required
              />
            </div>

            <div className="mt-4">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                error={errors.email}
                required
                icon={<Mail className="w-4 h-4 text-gray-400" />}
              />
            </div>

            <div className="mt-4">
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                error={errors.phoneNumber}
                required
                icon={<Phone className="w-4 h-4 text-gray-400" />}
                placeholder="9876543210"
                maxLength={10}
                inputMode="numeric"
              />
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl border border-blue-100 bg-blue-50/30 p-4 sm:p-5",
              errors.roles && "border-red-300",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-md bg-blue-100 text-blue-700 p-1.5">
                  <BadgeCheck className="w-4 h-4" />
                </span>
                Roles
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAllRoles}
                className="h-8 px-3 text-xs"
              >
                {formData.roles.length === ROLE_OPTIONS.length ? "Clear All" : "Select All"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {ROLE_OPTIONS.map((option) => {
                const checked = formData.roles.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 text-sm rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                      checked
                        ? "border-blue-300 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 bg-white text-gray-700",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(option.value)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Shield className={cn("w-4 h-4", checked ? "text-blue-600" : "text-gray-400")} />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
            {errors.roles && <p className="mt-2 text-sm text-red-600">{errors.roles}</p>}
            {isHotelBdSelected && (
              <p className="mt-3 text-sm text-blue-900/90 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2">
                After saving this user, open them in{" "}
                <span className="font-semibold">User Management</span> →{" "}
                <span className="font-semibold">Hotels &amp; permissions</span> to assign live
                properties and use <span className="font-semibold">User permissions</span> for
                Property Information / Rates &amp; Inventory (one set for the user; Finance is not
                available for Hotel BD).
              </p>
            )}
          </div>

          {requiresStateMapping && (
            <div
              className={cn(
                "rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 sm:p-5",
                errors.stateIds && "border-red-300",
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-md bg-emerald-100 text-emerald-700 p-1.5">
                    <MapPinned className="w-4 h-4" />
                  </span>
                  States
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllStates}
                  className="h-8 px-3 text-xs"
                >
                  {states.length > 0 && formData.stateIds.length === states.length
                    ? "Clear All"
                    : "Select All"}
                </Button>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 max-h-60 overflow-y-auto space-y-1.5 bg-gray-50">
                {states.map((state) => {
                  const checked = formData.stateIds.includes(state.id);
                  return (
                    <label
                      key={state.id}
                      className={cn(
                        "flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                        checked ? "bg-blue-50 text-blue-900" : "hover:bg-white text-gray-700",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleState(state.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{state.name}</span>
                      </span>
                      <span className={cn("text-xs", checked ? "text-blue-600" : "text-gray-400")}>
                        {state.code}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.stateIds.length === 0 ? (
                  <span className="text-xs text-gray-500">No states selected</span>
                ) : (
                  selectedStateNames.split(", ").map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-medium"
                    >
                      {name}
                    </span>
                  ))
                )}
              </div>
              {errors.stateIds && <p className="mt-1 text-sm text-red-600">{errors.stateIds}</p>}
            </div>
          )}

          {isEdit && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 sm:p-5">
              <Select
                label="Account Status"
                value={formData.accountStatus}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    accountStatus: e.target.value as UserFormState["accountStatus"],
                  }))
                }
                options={STATUS_OPTIONS}
                required
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.ADMIN.USERS)}
              className="px-5"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="px-6">
              {isSubmitting ? "Saving..." : isEdit ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </div>

      {serverErrorPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.currentTarget === e.target && setServerErrorPopup(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg m-4 overflow-hidden border border-red-100">
            <div className="px-6 py-5 border-b border-red-200 bg-linear-to-r from-red-50 to-rose-50 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-600 text-white shadow-sm">
                  <AlertCircle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Unable to save user</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Please review the details and try again.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setServerErrorPopup(null)}
                className="p-1.5 rounded-md hover:bg-white/70 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3">
                <p className="text-sm text-red-800 whitespace-pre-wrap wrap-break-word">
                  {serverErrorPopup}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={() => setServerErrorPopup(null)}
                className="px-6"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
