import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Phone, Smartphone, Mail, Globe, PhoneCall, User } from "lucide-react";
import { Toast, useToast } from "@/components/ui/Toast";
import { adminService } from "@/features/admin/services/adminService";
import { useAuth } from "@/hooks";
import { isSuperAdmin } from "@/constants/roles";
import { FormFieldLabel } from "@/components/ui/FormFieldLabel";
import {
  BasicInfoFormCard,
  BasicInfoFormDivider,
  BasicInfoFormLoading,
  BasicInfoFormPanel,
} from "./basicInfoFormUi";

interface PropertyContactDetailsTabProps {
  hotelId: string;
}

export function PropertyContactDetailsTab({
  hotelId,
}: PropertyContactDetailsTabProps) {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.roles);
  /** Super Admin uses admin contact APIs; hotel roles use /hotel/.../contact. */
  const useAdminContactApi = isSuperAdminUser;
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
    ownerEmail: "",
    ownerFirstname: "",
    ownerLastname: "",
    ownerPhone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = useAdminContactApi
          ? await adminService.getHotelContact(hotelId)
          : await adminService.getHotelAdminContact(hotelId);
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
            ownerEmail: data.ownerEmail || "",
            ownerFirstname: data.ownerFirstname || "",
            ownerLastname: data.ownerLastname || "",
            ownerPhone: data.ownerPhone || "",
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
  }, [hotelId, useAdminContactApi]);

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
    if (!phoneList.trim()) return true;
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
    if (!numberList.trim()) return true;
    const numbers = numberList.split(",").map((n) => n.trim());
    return numbers.every((number) => validateCustomerCareNumber(number));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.hotelPhone.trim()) {
      newErrors.hotelPhone = "Hotel phone is required";
    } else if (!validatePhoneWithDashes(formData.hotelPhone)) {
      newErrors.hotelPhone =
        "Phone number must have at least 10 digits (dashes allowed)";
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

    if (formData.phoneList.trim() && !validatePhoneList(formData.phoneList)) {
      newErrors.phoneList =
        "All phone numbers must have at least 10 digits (dashes allowed, comma-separated)";
    }

    if (formData.websiteList.trim()) {
      // Validate comma-separated URLs
      const websites = formData.websiteList.split(",").map((w) => w.trim());
      const urlPattern =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      const invalidWebsites = websites.filter(
        (website) => !urlPattern.test(website),
      );
      if (invalidWebsites.length > 0) {
        newErrors.websiteList =
          "Please enter valid website URLs (comma-separated)";
      }
    }

    if (formData.emailList.trim()) {
      // Validate comma-separated emails
      const emails = formData.emailList.split(",").map((e) => e.trim());
      const invalidEmails = emails.filter(
        (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      );
      if (invalidEmails.length > 0) {
        newErrors.emailList =
          "Please enter valid email addresses (comma-separated)";
      }
    }

    if (!formData.customerCareNumber.trim()) {
      newErrors.customerCareNumber = "Customer care number is required";
    } else if (!validateCustomerCareList(formData.customerCareNumber)) {
      newErrors.customerCareNumber =
        "All numbers must have at least 10 digits (dashes allowed, comma-separated)";
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
      if (useAdminContactApi) {
        await adminService.updateHotelContact(hotelId, {
          hotelPhone: formData.hotelPhone,
          hotelMobile: formData.hotelMobile,
          hotelEmail: formData.hotelEmail,
          phoneList: formData.phoneList,
          websiteList: formData.websiteList,
          emailList: formData.emailList,
          customerCareNumber: formData.customerCareNumber,
          ownerEmail: formData.ownerEmail || null,
          ownerFirstname: formData.ownerFirstname || null,
          ownerLastname: formData.ownerLastname || null,
          ownerPhone: formData.ownerPhone || null,
        });
        // Refresh data after update
        const data = await adminService.getHotelContact(hotelId);
        if (data) {
          setContactData(data);
        }
      } else {
        await adminService.updateHotelAdminContact(hotelId, {
          hotelPhone: formData.hotelPhone,
          hotelMobile: formData.hotelMobile,
          hotelEmail: formData.hotelEmail,
          phoneList: formData.phoneList,
          websiteList: formData.websiteList,
          emailList: formData.emailList,
          customerCareNumber: formData.customerCareNumber,
        });
        const data = await adminService.getHotelContact(hotelId);
        if (data) {
          setContactData(data);
        }
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
    return <BasicInfoFormLoading message="Loading contact details..." />;
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <BasicInfoFormCard>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <FormFieldLabel icon={Phone} theme="green" htmlFor="hotelPhone" required>
                  Hotel Phone
                </FormFieldLabel>
                <Input
                  id="hotelPhone"
                  type="tel"
                  value={formData.hotelPhone}
                  onChange={(e) =>
                    handleChange(
                      "hotelPhone",
                      e.target.value.replace(/[^\d-]/g, ""),
                    )
                  }
                  error={errors.hotelPhone}
                  required
                />
              </div>

              <div>
                <FormFieldLabel icon={Smartphone} theme="emerald" htmlFor="hotelMobile" required>
                  Hotel Mobile
                </FormFieldLabel>
                <Input
                  id="hotelMobile"
                  type="tel"
                  value={formData.hotelMobile}
                  onChange={(e) =>
                    handleChange(
                      "hotelMobile",
                      e.target.value.replace(/\D/g, ""),
                    )
                  }
                  error={errors.hotelMobile}
                  maxLength={10}
                  required
                />
                {!errors.hotelMobile && (
                  <p className="text-xs text-gray-500 mt-1">
                    Please provide mobile number where you would like to receive
                    communications (SMS/WhatsApp)
                  </p>
                )}
              </div>

              <div>
                <FormFieldLabel icon={Mail} theme="blue" htmlFor="hotelEmail" required>
                  Hotel Email
                </FormFieldLabel>
                <Input
                  id="hotelEmail"
                  type="email"
                  value={formData.hotelEmail}
                  onChange={(e) => handleChange("hotelEmail", e.target.value)}
                  error={errors.hotelEmail}
                  required
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <FormFieldLabel icon={Phone} theme="green" htmlFor="phoneList">
                  Phone List
                </FormFieldLabel>
                <Input
                  id="phoneList"
                  type="tel"
                  value={formData.phoneList}
                  onChange={(e) =>
                    handleChange(
                      "phoneList",
                      e.target.value.replace(/[^\d,-]/g, ""),
                    )
                  }
                  error={errors.phoneList}
                />
                {!errors.phoneList && (
                  <p className="text-xs text-gray-500 mt-1">
                    Separate two phone numbers with comma ','
                  </p>
                )}
              </div>

              <div>
                <FormFieldLabel icon={Globe} theme="cyan" htmlFor="websiteList">
                  Website List
                </FormFieldLabel>
                <Input
                  id="websiteList"
                  value={formData.websiteList}
                  onChange={(e) => handleChange("websiteList", e.target.value)}
                  error={errors.websiteList}
                  placeholder="www.example.com"
                />
                {!errors.websiteList && (
                  <p className="text-xs text-gray-500 mt-1">
                    Separate two urls with comma ','
                  </p>
                )}
              </div>

              <div>
                <FormFieldLabel icon={Mail} theme="blue" htmlFor="emailList">
                  Email List
                </FormFieldLabel>
                <Input
                  id="emailList"
                  type="text"
                  value={formData.emailList}
                  onChange={(e) => handleChange("emailList", e.target.value)}
                  error={errors.emailList}
                  placeholder="email1@example.com, email2@example.com"
                />
                {!errors.emailList && (
                  <p className="text-xs text-gray-500 mt-1">
                    Separate two emails with comma ','
                  </p>
                )}
              </div>
            </div>
          </div>

          <BasicInfoFormDivider />

          <BasicInfoFormPanel className="border-violet-100 bg-violet-50/30">
            {!isSuperAdminUser && (
              <p className="mb-4 text-xs text-gray-500">
                View only. Only Super Admin can edit owner details.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FormFieldLabel icon={User} theme="violet" htmlFor="ownerFirstname">
                  Owner First Name
                </FormFieldLabel>
                  <Input
                    id="ownerFirstname"
                    value={formData.ownerFirstname}
                    onChange={(e) =>
                      handleChange("ownerFirstname", e.target.value)
                    }
                    disabled={!isSuperAdminUser || isSaving}
                  />
                </div>
              <div>
                <FormFieldLabel icon={User} theme="violet" htmlFor="ownerLastname">
                  Owner Last Name
                </FormFieldLabel>
                  <Input
                    id="ownerLastname"
                    value={formData.ownerLastname}
                    onChange={(e) =>
                      handleChange("ownerLastname", e.target.value)
                    }
                    disabled={!isSuperAdminUser || isSaving}
                  />
                </div>
              <div>
                <FormFieldLabel icon={Mail} theme="blue" htmlFor="ownerEmail">
                  Owner Email
                </FormFieldLabel>
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => handleChange("ownerEmail", e.target.value)}
                    disabled={!isSuperAdminUser || isSaving}
                  />
                </div>
              <div>
                <FormFieldLabel icon={Phone} theme="green" htmlFor="ownerPhone">
                  Owner Phone
                </FormFieldLabel>
                  <Input
                    id="ownerPhone"
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) =>
                      handleChange(
                        "ownerPhone",
                        e.target.value.replace(/[^\d-]/g, ""),
                      )
                    }
                    disabled={!isSuperAdminUser || isSaving}
                  />
                </div>
            </div>
          </BasicInfoFormPanel>

          <BasicInfoFormDivider />

          <div>
            <FormFieldLabel icon={PhoneCall} theme="orange" htmlFor="customerCareNumber" required>
              Customer Care Number
            </FormFieldLabel>
              <Input
                id="customerCareNumber"
                type="tel"
                value={formData.customerCareNumber}
                onChange={(e) =>
                  handleChange(
                    "customerCareNumber",
                    e.target.value.replace(/[^\d,-]/g, ""),
                  )
                }
                error={errors.customerCareNumber}
                required
              />
              {!errors.customerCareNumber && (
                <p className="text-xs text-gray-500 mt-1">
                  Please provide mobile number where you would like to receive
                  communications (SMS/WhatsApp). Separate two phone numbers with
                  comma ','.
                </p>
              )}
          </div>

          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isSaving ? "Saving..." : "SAVE"}
            </Button>
          </div>
        </form>
      </BasicInfoFormCard>
    </>
  );
}
