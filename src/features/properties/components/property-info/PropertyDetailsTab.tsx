import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Toast, useToast } from "@/components/ui/Toast";
import { StatusRemarkModal } from "./StatusRemarkModal";
import {
  adminService,
  type HotelBasicInfoResponse,
} from "@/features/admin/services/adminService";
import { Building, Tag, Hash, User, Calendar, Star, Banknote, FileText, Hotel, Power } from "lucide-react";
import { useAuth } from "@/hooks";
import { isSuperAdmin } from "@/constants/roles";
import {
  canEditBasicInfoPropertyDescription,
  canEditBasicInfoPropertyDetails,
} from "@/lib/permissions";
import { FormFieldLabel } from "@/components/ui/FormFieldLabel";
import {
  BasicInfoFormCard,
  BasicInfoFormDivider,
  BasicInfoFormLoading,
} from "./basicInfoFormUi";

interface PropertyDetailsTabProps {
  hotelId: string;
}

export function PropertyDetailsTab({ hotelId }: PropertyDetailsTabProps) {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.roles);
  const canEditPropertyDetails = canEditBasicInfoPropertyDetails(user);
  const canEditDescription = canEditBasicInfoPropertyDescription(user);
  const canSavePropertyDetails = canEditPropertyDetails || canEditDescription;
  const useHotelAdminBasicInfo = !isSuperAdminUser;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [hotelData, setHotelData] = useState<HotelBasicInfoResponse | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    propertyType: "",
    starRating: "",
    yearOfConstruction: "",
    currency: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusData, setStatusData] = useState({
    status: "",
    reason: "",
  });
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"LIVE" | "SUSPENDED">(
    "LIVE",
  );
  const { toast, showToast, hideToast } = useToast();

  // Generate year options from 50 years ago to current year (to keep dropdown manageable)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 50; // Last 50 years
    const years: { value: string; label: string }[] = [];

    for (let year = currentYear; year >= startYear; year--) {
      years.push({ value: year.toString(), label: year.toString() });
    }

    return years;
  };

  const yearOptions = generateYearOptions();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = useHotelAdminBasicInfo
          ? await adminService.getHotelAdminBasicInfo(hotelId)
          : await adminService.getHotelBasicInfo(hotelId);
        if (data) {
          setHotelData(data);
          setFormData({
            name: data.name || "",
            displayName: data.displayName || "",
            propertyType: data.propertyType || "",
            starRating: data.starRating?.toString() || "",
            yearOfConstruction: data.yearOfConstruction || "",
            currency: data.currency || "",
            description: data.description || "",
          });
          setStatusData({
            status: data.status || "",
            reason: data.statusReason || "",
          });
        }
      } catch (error) {
        console.error("Error fetching property details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (hotelId) {
      fetchData();
    }
  }, [hotelId, useHotelAdminBasicInfo]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSavePropertyDetails) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      if (canEditPropertyDetails) {
        await adminService.updateHotelProfile(hotelId, {
          name: formData.name,
          displayName: formData.displayName,
          propertyType: formData.propertyType,
          starRating: parseInt(formData.starRating),
          yearOfConstruction: parseInt(formData.yearOfConstruction),
          currency: formData.currency,
        });
      } else {
        await adminService.updateHotelAdminProfile(hotelId, {
          description: formData.description,
        });
      }

      const data = useHotelAdminBasicInfo
        ? await adminService.getHotelAdminBasicInfo(hotelId)
        : await adminService.getHotelBasicInfo(hotelId);
      if (data) {
        setHotelData(data);
        setFormData((prev) => ({
          ...prev,
          description: data.description || "",
        }));
        setErrors({});
      }
      showToast(
        canEditPropertyDetails
          ? "Property details updated successfully!"
          : "Description updated successfully!",
        "success",
      );
    } catch (error) {
      console.error("Error saving property details:", error);
      showToast(
        canEditPropertyDetails
          ? "Failed to update property details. Please try again."
          : "Failed to update description. Please try again.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleChange = (checked: boolean) => {
    const newStatus = checked ? "LIVE" : "SUSPENDED";
    setPendingStatus(newStatus);
    setIsStatusModalOpen(true);
  };

  const handleStatusUpdate = async (remark: string) => {
    if (!canEditPropertyDetails) {
      return;
    }
    setIsSavingStatus(true);
    try {
      await adminService.updateHotelStatus(hotelId, {
        status: pendingStatus,
        reason: remark,
      });
      // Refresh data after update
      const data = await adminService.getHotelBasicInfo(hotelId);
      if (data) {
        setHotelData(data);
        setStatusData({
          status: data.status || "",
          reason: data.statusReason || "",
        });
      }
      setIsStatusModalOpen(false);
      showToast("Hotel status updated successfully!", "success");
    } catch (error) {
      console.error("Error updating hotel status:", error);
      showToast("Failed to update hotel status. Please try again.", "error");
    } finally {
      setIsSavingStatus(false);
    }
  };

  if (isLoading) {
    return <BasicInfoFormLoading message="Loading property details..." />;
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="space-y-6">
        <BasicInfoFormCard>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <FormFieldLabel icon={Building} theme="blue" htmlFor="name" required={canEditPropertyDetails}>
                  Property Name
                </FormFieldLabel>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  readOnly={!canEditPropertyDetails}
                  className={!canEditPropertyDetails ? "bg-gray-50" : ""}
                  required={canEditPropertyDetails}
                />
              </div>

              <div>
                <FormFieldLabel icon={Tag} theme="purple" htmlFor="displayName" required={canEditPropertyDetails}>
                  Display Name
                </FormFieldLabel>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  readOnly={!canEditPropertyDetails}
                  className={!canEditPropertyDetails ? "bg-gray-50" : ""}
                  required={canEditPropertyDetails}
                />
              </div>

              <div>
                <FormFieldLabel icon={Hotel} theme="indigo" htmlFor="propertyType" required={canEditPropertyDetails}>
                  Property Type
                </FormFieldLabel>
                <Select
                  id="propertyType"
                  value={formData.propertyType}
                  onChange={(e) => handleChange("propertyType", e.target.value)}
                  options={[{ value: "HOTEL", label: "Hotel" }]}
                  disabled={!canEditPropertyDetails}
                  required={canEditPropertyDetails}
                />
              </div>

              <div>
                <FormFieldLabel icon={Star} theme="amber" htmlFor="starRating" required={canEditPropertyDetails}>
                  Star Rating
                </FormFieldLabel>
                <Select
                  id="starRating"
                  value={formData.starRating}
                  onChange={(e) => handleChange("starRating", e.target.value)}
                  options={[
                    { value: "1", label: "1 Star" },
                    { value: "2", label: "2 Stars" },
                    { value: "3", label: "3 Stars" },
                    { value: "4", label: "4 Stars" },
                    { value: "5", label: "5 Stars" },
                  ]}
                  disabled={!canEditPropertyDetails}
                  required={canEditPropertyDetails}
                />
              </div>

              <div>
                <FormFieldLabel icon={Calendar} theme="rose" htmlFor="yearOfConstruction" required={canEditPropertyDetails}>
                  Year of Construction
                </FormFieldLabel>
                <Select
                  id="yearOfConstruction"
                  value={formData.yearOfConstruction}
                  onChange={(e) =>
                    handleChange("yearOfConstruction", e.target.value)
                  }
                  options={yearOptions}
                  error={errors.yearOfConstruction}
                  disabled={!canEditPropertyDetails}
                  required={canEditPropertyDetails}
                />
              </div>

              <div>
                <FormFieldLabel icon={Banknote} theme="emerald" htmlFor="currency" required={canEditPropertyDetails}>
                  Currency
                </FormFieldLabel>
                <Select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  options={[{ value: "INR", label: "Indian Rupee (INR)" }]}
                  disabled={!canEditPropertyDetails}
                  required={canEditPropertyDetails}
                />
              </div>

              <div className="md:col-span-2">
                <FormFieldLabel icon={FileText} theme="cyan" htmlFor="description">
                  Description
                </FormFieldLabel>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  readOnly={!canEditDescription}
                  className={
                    !canEditDescription
                      ? "bg-gray-50 resize-none rounded-lg"
                      : "resize-none rounded-lg"
                  }
                  rows={4}
                  placeholder="No description available"
                />
              </div>

              {isSuperAdminUser && (
                <div className="md:col-span-2">
                  <FormFieldLabel icon={Power} theme="green">
                    Hotel Status
                  </FormFieldLabel>
                  <Toggle
                    checked={statusData.status === "LIVE"}
                    onChange={handleToggleChange}
                    label="Status"
                    checkedLabel="LIVE"
                    uncheckedLabel="NOT LIVE"
                    disabled={isSavingStatus || !canEditPropertyDetails}
                  />
                </div>
              )}
            </div>

            {canSavePropertyDetails && (
              <div className="flex justify-end mt-8 pt-6 border-t border-slate-100">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isSaving
                    ? "Saving..."
                    : canEditPropertyDetails
                      ? "SAVE PROFILE"
                      : "SAVE DESCRIPTION"}
                </Button>
              </div>
            )}
          </form>

          {hotelData && (
            <>
              <BasicInfoFormDivider />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormFieldLabel icon={Hash} theme="indigo">
                    Hotel Code
                  </FormFieldLabel>
                  <Input
                    value={hotelData.hotelCode}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <FormFieldLabel icon={User} theme="cyan">
                    Created By
                  </FormFieldLabel>
                  <Input
                    value={hotelData.createdByEmail}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <FormFieldLabel icon={User} theme="cyan">
                    Updated By
                  </FormFieldLabel>
                  <Input
                    value={hotelData.updatedByEmail}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <FormFieldLabel icon={Calendar} theme="rose">
                    Created At
                  </FormFieldLabel>
                  <Input
                    value={new Date(hotelData.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <FormFieldLabel icon={Calendar} theme="rose">
                    Updated At
                  </FormFieldLabel>
                  <Input
                    value={new Date(hotelData.updatedAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </>
          )}
        </BasicInfoFormCard>
      </div>
      {isSuperAdminUser && (
        <StatusRemarkModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          onConfirm={handleStatusUpdate}
          currentRemark={statusData.reason}
          status={pendingStatus}
          isLoading={isSavingStatus}
        />
      )}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
