import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AlertCircle, Phone, Smartphone, Mail, Globe, PhoneCall } from "lucide-react";
import { Toast, useToast } from "@/components/ui/Toast";
import { adminService } from "@/features/admin/services/adminService";
import { useAuth } from "@/hooks";
import { isHotelOwner } from "@/constants/roles";

interface PropertyContactDetailsTabProps {
  hotelId: string;
}

export function PropertyContactDetailsTab({ hotelId }: PropertyContactDetailsTabProps) {
  const { user } = useAuth();
  const isHotelOwnerUser = isHotelOwner(user?.roles);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [contactData, setContactData] = useState<any>(null);
  const [formData, setFormData] = useState({
    hotelPhone: "",
    hotelMobile: "",
    hotelEmail: "",
    phoneList: "",
    websiteList: "",
    emailList: "",
    customerCareNumber: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = isHotelOwnerUser
          ? await adminService.getHotelAdminContact(hotelId)
          : await adminService.getHotelContact(hotelId);
        if (data) {
          setContactData(data);
          setFormData({
            hotelPhone: data.hotelPhone || "",
            hotelMobile: data.hotelMobile || "",
            hotelEmail: data.hotelEmail || "",
            phoneList: data.phoneList || "",
            websiteList: data.websiteList || "",
            emailList: data.emailList || "",
            customerCareNumber: data.customerCareNumber || "",
          });
        }
      } catch (error) {
        console.error("Error fetching contact details:", error);
        showToast("Failed to load contact details. Please try again.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (hotelId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, isHotelOwnerUser]);

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove spaces and dashes, check if it's exactly 10 digits
    const cleaned = phone.replace(/[\s-]+/g, "");
    return /^\d{10}$/.test(cleaned);
  };

  const validatePhoneWithDashes = (phone: string): boolean => {
    // Allow phone numbers with dashes (e.g., "011-23456789")
    // Remove spaces and dashes, should have at least 10 digits
    const cleaned = phone.replace(/[\s-]+/g, "");
    return /^\d{10,}$/.test(cleaned) && cleaned.length <= 15;
  };

  const validatePhoneList = (phoneList: string): boolean => {
    if (!phoneList.trim()) return false;
    const phones = phoneList.split(",").map((p) => p.trim());
    return phones.every((phone) => validatePhoneWithDashes(phone));
  };

  const validateCustomerCareNumber = (number: string): boolean => {
    // Allow longer numbers like toll-free (1800123456) or numbers with dashes
    // Remove spaces and dashes, should have at least 10 digits
    const cleaned = number.replace(/[\s-]+/g, "");
    return /^\d{10,}$/.test(cleaned) && cleaned.length <= 15;
  };

  const validateCustomerCareList = (numberList: string): boolean => {
    if (!numberList.trim()) return false;
    const numbers = numberList.split(",").map((n) => n.trim());
    return numbers.every((number) => validateCustomerCareNumber(number));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.hotelPhone.trim()) {
      newErrors.hotelPhone = "Hotel phone is required";
    } else if (!validatePhoneWithDashes(formData.hotelPhone)) {
      newErrors.hotelPhone = "Phone number must have at least 10 digits (dashes allowed)";
    }

    if (!formData.hotelMobile.trim()) {
      newErrors.hotelMobile = "Hotel mobile is required";
    } else if (!validatePhoneNumber(formData.hotelMobile)) {
      newErrors.hotelMobile = "Mobile number must be exactly 10 digits";
    }

    if (!formData.hotelEmail.trim()) {
      newErrors.hotelEmail = "Hotel email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.hotelEmail)) {
      newErrors.hotelEmail = "Please enter a valid email address";
    }

    if (!formData.phoneList.trim()) {
      newErrors.phoneList = "Phone list is required";
    } else if (!validatePhoneList(formData.phoneList)) {
      newErrors.phoneList = "All phone numbers must have at least 10 digits (dashes allowed, comma-separated)";
    }

    if (!formData.websiteList.trim()) {
      newErrors.websiteList = "Website list is required";
    } else {
      // Validate comma-separated URLs
      const websites = formData.websiteList.split(",").map((w) => w.trim());
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      const invalidWebsites = websites.filter((website) => !urlPattern.test(website));
      if (invalidWebsites.length > 0) {
        newErrors.websiteList = "Please enter valid website URLs (comma-separated)";
      }
    }

    if (!formData.emailList.trim()) {
      newErrors.emailList = "Email list is required";
    } else {
      // Validate comma-separated emails
      const emails = formData.emailList.split(",").map((e) => e.trim());
      const invalidEmails = emails.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      if (invalidEmails.length > 0) {
        newErrors.emailList = "Please enter valid email addresses (comma-separated)";
      }
    }

    if (!formData.customerCareNumber.trim()) {
      newErrors.customerCareNumber = "Customer care number is required";
    } else if (!validateCustomerCareList(formData.customerCareNumber)) {
      newErrors.customerCareNumber = "All numbers must have at least 10 digits (dashes allowed, comma-separated)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      if (isHotelOwnerUser) {
        await adminService.updateHotelAdminContact(hotelId, {
          hotelPhone: formData.hotelPhone,
          hotelMobile: formData.hotelMobile,
          hotelEmail: formData.hotelEmail,
          phoneList: formData.phoneList,
          websiteList: formData.websiteList,
          emailList: formData.emailList,
          customerCareNumber: formData.customerCareNumber,
        });
        // Refresh data after update
        const data = await adminService.getHotelAdminContact(hotelId);
        if (data) {
          setContactData(data);
        }
      } else {
        await adminService.updateHotelContact(hotelId, {
          hotelPhone: formData.hotelPhone,
          hotelMobile: formData.hotelMobile,
          hotelEmail: formData.hotelEmail,
          phoneList: formData.phoneList,
          websiteList: formData.websiteList,
          emailList: formData.emailList,
          customerCareNumber: formData.customerCareNumber,
        });
      }
      setErrors({}); // Clear errors on success
      showToast("Contact details updated successfully!", "success");
    } catch (error) {
      console.error("Error saving contact details:", error);
      showToast("Failed to update contact details. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Loading contact details...</p>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="hotelPhone">
                Hotel Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hotelPhone"
                type="tel"
                value={formData.hotelPhone}
                onChange={(e) => handleChange("hotelPhone", e.target.value.replace(/[^\d-]/g, ""))}
                error={errors.hotelPhone}
                icon={<Phone className="w-4 h-4 text-green-500" />}
                required
              />
            </div>

            <div>
              <Label htmlFor="hotelMobile">
                Hotel Mobile <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hotelMobile"
                type="tel"
                value={formData.hotelMobile}
                onChange={(e) => handleChange("hotelMobile", e.target.value.replace(/\D/g, ""))}
                error={errors.hotelMobile}
                icon={<Smartphone className="w-4 h-4 text-emerald-500" />}
                maxLength={10}
                required
              />
              {!errors.hotelMobile && (
                <p className="text-xs text-gray-500 mt-1">
                  Please provide mobile number where you would like to receive communications (SMS/WhatsApp)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="hotelEmail">
                Hotel Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hotelEmail"
                type="email"
                value={formData.hotelEmail}
                onChange={(e) => handleChange("hotelEmail", e.target.value)}
                error={errors.hotelEmail}
                icon={<Mail className="w-4 h-4 text-blue-500" />}
                required
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="phoneList">
                Phone List <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phoneList"
                type="tel"
                value={formData.phoneList}
                onChange={(e) => handleChange("phoneList", e.target.value.replace(/[^\d,-]/g, ""))}
                error={errors.phoneList}
                icon={<Phone className="w-4 h-4 text-green-500" />}
                required
              />
              {!errors.phoneList && (
                <p className="text-xs text-gray-500 mt-1">
                  Separate two phone numbers with comma ','
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="websiteList">
                Website List <span className="text-red-500">*</span>
              </Label>
              <Input
                id="websiteList"
                value={formData.websiteList}
                onChange={(e) => handleChange("websiteList", e.target.value)}
                error={errors.websiteList}
                icon={<Globe className="w-4 h-4 text-cyan-500" />}
                placeholder="www.example.com"
                required
              />
              {!errors.websiteList && (
                <p className="text-xs text-gray-500 mt-1">
                  Separate two urls with comma ','
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="emailList">
                Email List <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emailList"
                type="text"
                value={formData.emailList}
                onChange={(e) => handleChange("emailList", e.target.value)}
                error={errors.emailList}
                icon={<Mail className="w-4 h-4 text-blue-500" />}
                placeholder="email1@example.com, email2@example.com"
                required
              />
              {!errors.emailList && (
                <p className="text-xs text-gray-500 mt-1">
                  Separate two emails with comma ','
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Care Information */}
        <div className="mt-8 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">
                In compliance of the Consumer Protection (E-commerce) Rules, 2020, all hotel partners are required to provide their customer care number(s) to be displayed on Go-MMT platforms. Therefore, you are requested to provide your customer care number.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="customerCareNumber">
              Customer Care Number <span className="text-red-500">*</span>
            </Label>
              <Input
                id="customerCareNumber"
                type="tel"
                value={formData.customerCareNumber}
                onChange={(e) => handleChange("customerCareNumber", e.target.value.replace(/[^\d,-]/g, ""))}
                error={errors.customerCareNumber}
                icon={<PhoneCall className="w-4 h-4 text-orange-500" />}
                required
              />
            {!errors.customerCareNumber && (
              <p className="text-xs text-gray-500 mt-1">
                Please provide mobile number where you would like to receive communications (SMS/WhatsApp). Separate two phone numbers with comma ','.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <Button type="submit" disabled={isSaving} className="bg-blue-500 hover:bg-blue-600">
            {isSaving ? "Saving..." : "SAVE"}
          </Button>
        </div>
      </form>
      
      {/* Additional Information - Readonly for hotel admin */}
      {isHotelOwnerUser && contactData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Created By</Label>
              <Input 
                value={contactData.createdByEmail || ""} 
                readOnly 
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label>Updated By</Label>
              <Input 
                value={contactData.updatedByEmail || ""} 
                readOnly 
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label>Created At</Label>
              <Input 
                value={contactData.createdAt ? new Date(contactData.createdAt).toLocaleString() : ""} 
                readOnly 
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label>Updated At</Label>
              <Input 
                value={contactData.updatedAt ? new Date(contactData.updatedAt).toLocaleString() : ""} 
                readOnly 
                className="bg-gray-50"
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

