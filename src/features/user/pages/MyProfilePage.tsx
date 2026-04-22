import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  LoadingSpinner,
  Select,
} from "@/components/ui";
import { ROUTES } from "@/constants";
import userApi from "@/services/api/user";
import type { User } from "@/types";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Mail,
  Phone,
  UserRound,
  MapPinned,
  KeyRound,
} from "lucide-react";
import { RoleBadge } from "@/components/ui/badges/RoleBadge";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
};

const INITIAL_FORM: ProfileFormState = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  dob: "",
  gender: "",
};

const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;

function getInitials(user: User | null): string {
  if (!user?.email) return "U";
  return user.email.charAt(0).toUpperCase();
}

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [formData, setFormData] = useState<ProfileFormState>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast, showToast, hideToast } = useToast();

  const hydrateForm = (user: User) => {
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phoneNumber: user.phoneNumber || user.mobile || "",
      dob: user.dob || "",
      gender: (user.gender as ProfileFormState["gender"]) || "",
    });
  };

  const loadProfile = async () => {
    setApiError(null);
    const user = await userApi.getUser();
    setProfile(user);
    hydrateForm(user);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        await loadProfile();
      } catch (error: unknown) {
        const err = error as { message?: string };
        setApiError(err?.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, []);

  const fullName = useMemo(
    () => `${formData.firstName} ${formData.lastName}`.trim() || "User Profile",
    [formData.firstName, formData.lastName],
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const phone = formData.phoneNumber.trim();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const today = new Date().toISOString().slice(0, 10);

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

    if (!phone) next.phoneNumber = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(phone))
      next.phoneNumber = "Enter valid 10-digit phone number";
    if (!formData.dob) next.dob = "Date of birth is required";
    else if (formData.dob > today)
      next.dob = "Date of birth cannot be in future";
    if (!formData.gender) next.gender = "Gender is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsSaving(true);
      setApiError(null);
      setErrors({});
      const updated = await userApi.updateProfile({
        phoneNumber: formData.phoneNumber.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dob: formData.dob,
        gender: formData.gender as "MALE" | "FEMALE" | "OTHER",
      });
      setProfile(updated);
      await loadProfile();
      showToast("Profile updated successfully", "success");
    } catch (error: unknown) {
      const err = error as {
        message?: string;
        data?: { data?: Record<string, string> };
      };
      const fieldErrors = err?.data?.data || {};
      const next: Record<string, string> = {};
      if (fieldErrors.firstName) next.firstName = fieldErrors.firstName;
      if (fieldErrors.lastName) next.lastName = fieldErrors.lastName;
      if (fieldErrors.phoneNumber || fieldErrors.mobile) {
        next.phoneNumber = fieldErrors.phoneNumber || fieldErrors.mobile;
      }
      if (fieldErrors.dob) next.dob = fieldErrors.dob;
      if (fieldErrors.gender) next.gender = fieldErrors.gender;

      if (Object.keys(next).length > 0) {
        setErrors(next);
        setApiError(null);
        showToast("Please fix highlighted fields", "error");
      } else {
        showToast(err?.message || "Failed to update profile", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePictureChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      setApiError(null);
      const updated = await userApi.updatePicture(file);
      setProfile(updated);
      showToast("Profile picture updated successfully", "success");
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast(err?.message || "Failed to update profile picture", "error");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
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
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-6 bg-linear-to-r from-indigo-50 via-blue-50 to-cyan-50 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-white shadow-sm">
                <AvatarImage
                  src={profile?.avatarUrl || undefined}
                  alt={fullName}
                />
                <AvatarFallback className="bg-[#2f3d95] text-white text-lg font-semibold">
                  {getInitials(profile)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <p className="text-sm text-gray-600">
                  {profile?.email || "No email"}
                </p>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 cursor-pointer hover:bg-blue-50">
              <Camera className="w-4 h-4" />
              {isUploadingPhoto ? "Uploading..." : "Change photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePictureChange}
                disabled={isUploadingPhoto}
              />
            </label>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {apiError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, firstName: e.target.value }));
                if (errors.firstName)
                  setErrors((prev) => ({ ...prev, firstName: "" }));
              }}
              error={errors.firstName}
              icon={<UserRound className="w-4 h-4 text-gray-400" />}
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, lastName: e.target.value }));
                if (errors.lastName)
                  setErrors((prev) => ({ ...prev, lastName: "" }));
              }}
              error={errors.lastName}
              icon={<UserRound className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              value={profile?.email || ""}
              disabled
              icon={<Mail className="w-4 h-4 text-gray-400" />}
            />
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => {
                const phone = e.target.value.replace(/\D/g, "").slice(0, 10);
                setFormData((prev) => ({ ...prev, phoneNumber: phone }));
                if (errors.phoneNumber)
                  setErrors((prev) => ({ ...prev, phoneNumber: "" }));
              }}
              error={errors.phoneNumber}
              icon={<Phone className="w-4 h-4 text-gray-400" />}
              inputMode="numeric"
              maxLength={10}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dob}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, dob: e.target.value }));
                if (errors.dob) setErrors((prev) => ({ ...prev, dob: "" }));
              }}
              error={errors.dob}
              icon={<CalendarDays className="w-4 h-4 text-gray-400" />}
            />
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  gender: e.target.value as ProfileFormState["gender"],
                }));
                if (errors.gender)
                  setErrors((prev) => ({ ...prev, gender: "" }));
              }}
              error={errors.gender}
              options={[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Account Info
            </h3>
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-600 mb-2">Roles</p>
              <RoleBadge roles={profile?.roles || []} maxVisible={3} />
            </div>

            {!!profile?.states?.length && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                  <MapPinned className="w-3.5 h-3.5 text-gray-500" />
                  States
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.states.map((state) => (
                    <span
                      key={state.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                    >
                      {state.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!!profile?.permissions?.length && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                  Permissions
                </p>
                <div className="space-y-2">
                  {profile.permissions.map((permission, index) => (
                    <div
                      key={`${permission.module}-${index}`}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 flex flex-wrap items-center gap-2"
                    >
                      <span className="font-semibold text-gray-800">
                        {permission.module}
                      </span>
                      <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">
                        View: {permission.canView ? "Yes" : "No"}
                      </span>
                      <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5">
                        Edit: {permission.canEdit ? "Yes" : "No"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.PROPERTIES.LIST)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Saving..." : "Update Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
