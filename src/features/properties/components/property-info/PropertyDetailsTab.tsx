import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Toast, useToast } from "@/components/ui/Toast";
import { StatusRemarkModal } from "./StatusRemarkModal";
import { adminService, type HotelBasicInfoResponse } from "@/features/admin/services/adminService";
import { Building, Tag, Hash, User, Calendar } from "lucide-react";
import { useAuth } from "@/hooks";
import { isHotelOwner } from "@/constants/roles";

interface PropertyDetailsTabProps {
  hotelId: string;
}

export function PropertyDetailsTab({ hotelId }: PropertyDetailsTabProps) {
  const { user } = useAuth();
  const isHotelOwnerUser = isHotelOwner(user?.roles);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [hotelData, setHotelData] = useState<HotelBasicInfoResponse | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    propertyType: "",
    starRating: "",
    yearOfConstruction: "",
    acceptingSince: "",
    currency: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusData, setStatusData] = useState({
    status: "",
    reason: "",
  });
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"LIVE" | "SUSPENDED">("LIVE");
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
        const data = isHotelOwnerUser
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
            acceptingSince: data.acceptingSince || "",
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
  }, [hotelId, isHotelOwnerUser]);

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
    // Re-validate if year of construction or accepting since changes
    if (field === "yearOfConstruction" || field === "acceptingSince") {
      // Validate after a short delay to avoid validation during typing
      setTimeout(() => {
        const yearBuilt = field === "yearOfConstruction" ? parseInt(value) : parseInt(formData.yearOfConstruction);
        const acceptingYear = field === "acceptingSince" ? parseInt(value) : parseInt(formData.acceptingSince);
        
        if (!isNaN(yearBuilt) && !isNaN(acceptingYear) && yearBuilt >= acceptingYear) {
          setErrors((prev) => ({
            ...prev,
            acceptingSince: "Accepting bookings year must be after construction year",
          }));
        } else if (errors.acceptingSince) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.acceptingSince;
            return newErrors;
          });
        }
      }, 300);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate year of construction is before accepting bookings since
    if (formData.yearOfConstruction && formData.acceptingSince) {
      const yearBuilt = parseInt(formData.yearOfConstruction);
      const acceptingYear = parseInt(formData.acceptingSince);
      
      if (!isNaN(yearBuilt) && !isNaN(acceptingYear)) {
        if (yearBuilt >= acceptingYear) {
          newErrors.acceptingSince = "Accepting bookings year must be after construction year";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For hotel owner, only validate description
    if (isHotelOwnerUser) {
      setIsSaving(true);
      try {
        await adminService.updateHotelAdminProfile(hotelId, {
          description: formData.description,
        });
        // Refresh data after update
        const data = await adminService.getHotelAdminBasicInfo(hotelId);
        if (data) {
          setHotelData(data);
          setFormData((prev) => ({ ...prev, description: data.description || "" }));
          setErrors({});
        }
        showToast("Description updated successfully!", "success");
      } catch (error) {
        console.error("Error saving description:", error);
        showToast("Failed to update description. Please try again.", "error");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // For super admin, validate and update all fields
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await adminService.updateHotelProfile(hotelId, {
        name: formData.name,
        displayName: formData.displayName,
        propertyType: formData.propertyType,
        starRating: parseInt(formData.starRating),
        yearOfConstruction: parseInt(formData.yearOfConstruction),
        acceptingSince: parseInt(formData.acceptingSince),
        currency: formData.currency,
      });
      // Refresh data after update
      const data = await adminService.getHotelBasicInfo(hotelId);
      if (data) {
        setHotelData(data);
        setErrors({}); // Clear errors on success
      }
      showToast("Property details updated successfully!", "success");
    } catch (error) {
      console.error("Error saving property details:", error);
      showToast("Failed to update property details. Please try again.", "error");
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
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Loading property details...</p>
        </div>
      </div>
    );
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
      {/* Property Profile Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Profile</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">
                Property Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                icon={<Building className="w-4 h-4 text-blue-500" />}
                readOnly={isHotelOwnerUser}
                className={isHotelOwnerUser ? "bg-gray-50" : ""}
                required={!isHotelOwnerUser}
              />
            </div>

            <div>
              <Label htmlFor="displayName">
                Display Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                icon={<Tag className="w-4 h-4 text-purple-500" />}
                readOnly={isHotelOwnerUser}
                className={isHotelOwnerUser ? "bg-gray-50" : ""}
                required={!isHotelOwnerUser}
              />
            </div>

            <div>
              <Label htmlFor="propertyType">Property Type <span className="text-red-500">*</span></Label>
              <Select
                id="propertyType"
                value={formData.propertyType}
                onChange={(e) => handleChange("propertyType", e.target.value)}
                options={[
                  { value: "HOTEL", label: "Hotel" },
                ]}
                disabled={isHotelOwnerUser}
                required={!isHotelOwnerUser}
              />
            </div>

            <div>
              <Label htmlFor="starRating">
                Star Rating <span className="text-red-500">*</span>
              </Label>
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
                disabled={isHotelOwnerUser}
                required={!isHotelOwnerUser}
              />
            </div>

            <div>
              <Label htmlFor="yearOfConstruction">
                Year of Construction <span className="text-red-500">*</span>
              </Label>
              <Select
                id="yearOfConstruction"
                value={formData.yearOfConstruction}
                onChange={(e) => handleChange("yearOfConstruction", e.target.value)}
                options={yearOptions}
                error={errors.yearOfConstruction}
                disabled={isHotelOwnerUser}
                required={!isHotelOwnerUser}
              />
            </div>

            <div>
              <Label htmlFor="acceptingSince">
                Accepting Bookings Since <span className="text-red-500">*</span>
              </Label>
              <Select
                id="acceptingSince"
                value={formData.acceptingSince}
                onChange={(e) => handleChange("acceptingSince", e.target.value)}
                options={yearOptions}
                error={errors.acceptingSince}
                disabled={isHotelOwnerUser}
                required={!isHotelOwnerUser}
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency <span className="text-red-500">*</span></Label>
              <Select
                id="currency"
                value={formData.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
                options={[
                  { value: "INR", label: "Indian Rupee (INR)" },
                ]}
                disabled={isHotelOwnerUser}
                required={!isHotelOwnerUser}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                readOnly={!isHotelOwnerUser}
                className={!isHotelOwnerUser ? "bg-gray-50 resize-none" : "resize-none"}
                rows={4}
                placeholder="No description available"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Hotel Status</Label>
              <Toggle
                checked={statusData.status === "LIVE"}
                onChange={handleToggleChange}
                label="Status"
                disabled={isSavingStatus || isHotelOwnerUser}
              />
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <Button type="submit" disabled={isSaving} className="bg-blue-500 hover:bg-blue-600">
              {isSaving ? "Saving..." : "SAVE PROFILE"}
            </Button>
          </div>
        </form>
      </div>


      {/* Additional Information */}
      {hotelData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Hotel Code</Label>
              <Input 
                value={hotelData.hotelCode} 
                readOnly 
                className="bg-gray-50"
                icon={<Hash className="w-4 h-4 text-indigo-500" />}
              />
            </div>
            <div>
              <Label>Created By</Label>
              <Input 
                value={hotelData.createdByEmail} 
                readOnly 
                className="bg-gray-50"
                icon={<User className="w-4 h-4 text-cyan-500" />}
              />
            </div>
            <div>
              <Label>Updated By</Label>
              <Input 
                value={hotelData.updatedByEmail} 
                readOnly 
                className="bg-gray-50"
                icon={<User className="w-4 h-4 text-cyan-500" />}
              />
            </div>
            <div>
              <Label>Created At</Label>
              <Input 
                value={new Date(hotelData.createdAt).toLocaleString()} 
                readOnly 
                className="bg-gray-50"
                icon={<Calendar className="w-4 h-4 text-pink-500" />}
              />
            </div>
            <div>
              <Label>Updated At</Label>
              <Input 
                value={new Date(hotelData.updatedAt).toLocaleString()} 
                readOnly 
                className="bg-gray-50"
                icon={<Calendar className="w-4 h-4 text-pink-500" />}
              />
            </div>
          </div>
        </div>
      )}
      </div>
      <StatusRemarkModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleStatusUpdate}
        currentRemark={statusData.reason}
        status={pendingStatus}
        isLoading={isSavingStatus}
      />
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}

