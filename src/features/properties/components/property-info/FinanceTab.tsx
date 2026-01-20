import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { adminService, type FinanceData } from "@/features/admin/services/adminService";

interface FinanceTabProps {
  hotelId: string;
}

export function FinanceTab({ hotelId }: FinanceTabProps) {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FinanceData>({
    gstin: "",
    pan: "",
    businessName: "",
    businessAddress: "",
    bankAccountNumber: "",
    bankName: "",
    bankIfsc: "",
    bankBranch: "",
  });

  useEffect(() => {
    const fetchFinance = async () => {
      setLoading(true);
      // Reset form data first when hotel changes
      setFormData({
        gstin: "",
        pan: "",
        businessName: "",
        businessAddress: "",
        bankAccountNumber: "",
        bankName: "",
        bankIfsc: "",
        bankBranch: "",
      });
      
      try {
        const response = await adminService.getHotelFinance(hotelId);
        // If there's existing finance data, use the first one
        if (response.finances && response.finances.length > 0) {
          setFormData(response.finances[0]);
        }
      } catch (error) {
        console.error("Error fetching finance data:", error);
        // If finance data doesn't exist yet, that's okay - start with empty form
        // Form data is already reset above
      } finally {
        setLoading(false);
      }
    };

    if (hotelId) {
      fetchFinance();
    }
  }, [hotelId]);

  const handleChange = (field: keyof FinanceData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGstinChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (formatted.length <= 15) {
      handleChange("gstin", formatted);
    }
  };

  const handlePanChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (formatted.length <= 10) {
      handleChange("pan", formatted);
    }
  };

  const handleIfscChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    // IFSC format: 4 letters + 0 + 6 digits
    if (formatted.length <= 11) {
      let validFormat = "";
      
      // First 4 characters must be letters
      const firstFour = formatted.substring(0, 4).replace(/[^A-Z]/g, "");
      validFormat = firstFour;
      
      // 5th character must be '0'
      if (formatted.length > 4) {
        if (formatted[4] === '0') {
          validFormat += '0';
        } else if (/[A-Z]/.test(formatted[4])) {
          // If user types a letter at position 5, don't add it
          // They need to type 0
        } else {
          // If it's a digit other than 0, replace with 0
          validFormat += '0';
        }
      }
      
      // Remaining characters (6-11) must be digits
      if (formatted.length > 5) {
        const rest = formatted.substring(5).replace(/[^0-9]/g, "");
        validFormat += rest;
      }
      
      // Limit to 11 characters
      if (validFormat.length > 11) {
        validFormat = validFormat.substring(0, 11);
      }
      
      handleChange("bankIfsc", validFormat);
    }
  };

  const validatePan = (pan: string): boolean => {
    // PAN format: 5 letters + 4 digits + 1 letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validateIfsc = (ifsc: string): boolean => {
    // IFSC format: 4 letters + 0 + 6 digits
    const ifscRegex = /^[A-Z]{4}0[0-9]{6}$/;
    return ifscRegex.test(ifsc);
  };

  const validateForm = (): boolean => {
    if (!formData.gstin || formData.gstin.length !== 15) {
      showToast("Please enter a valid 15-character GSTIN", "error");
      return false;
    }
    if (!formData.pan || formData.pan.length !== 10) {
      showToast("Please enter a valid 10-character PAN", "error");
      return false;
    }
    if (!validatePan(formData.pan)) {
      showToast("PAN format is invalid. Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)", "error");
      return false;
    }
    if (!formData.businessName.trim()) {
      showToast("Please enter business name", "error");
      return false;
    }
    if (!formData.businessAddress.trim()) {
      showToast("Please enter business address", "error");
      return false;
    }
    if (!formData.bankAccountNumber.trim()) {
      showToast("Please enter bank account number", "error");
      return false;
    }
    if (!formData.bankName.trim()) {
      showToast("Please enter bank name", "error");
      return false;
    }
    if (!formData.bankIfsc || formData.bankIfsc.length !== 11) {
      showToast("Please enter a valid 11-character IFSC code", "error");
      return false;
    }
    if (!validateIfsc(formData.bankIfsc)) {
      showToast("IFSC format is invalid. Format: 4 letters + 0 + 6 digits (e.g., HDFC0001234)", "error");
      return false;
    }
    if (!formData.bankBranch.trim()) {
      showToast("Please enter bank branch", "error");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await adminService.updateHotelFinance(hotelId, formData);
      showToast("Finance information saved successfully", "success");
    } catch (error) {
      console.error("Error saving finance data:", error);
      showToast("Failed to save finance information", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Finance</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage financial and legal information for your hotel
          </p>
        </div>

        {/* Business Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Business Information
            </h3>
            <p className="text-sm text-gray-600">
              Provide your business registration and tax details
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="gstin"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                GSTIN (GST Identification Number)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="gstin"
                type="text"
                placeholder="Enter 15-character GSTIN (e.g., 29ABCDE1234F1Z5)"
                value={formData.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                maxLength={15}
                className={
                  formData.gstin.length > 0 && formData.gstin.length !== 15
                    ? "border-red-500"
                    : ""
                }
              />
              {formData.gstin.length > 0 && formData.gstin.length !== 15 && (
                <p className="mt-1 text-sm text-red-600">
                  GSTIN must be exactly 15 characters
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                GSTIN is a 15-character alphanumeric code. Format: 2 digits + 5
                letters + 4 digits + 1 letter + 1 digit + Z + 1 alphanumeric
              </p>
            </div>

            <div>
              <label
                htmlFor="pan"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                PAN (Permanent Account Number)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="pan"
                type="text"
                placeholder="Enter 10-character PAN (e.g., ABCDE1234F)"
                value={formData.pan}
                onChange={(e) => handlePanChange(e.target.value)}
                maxLength={10}
                className={
                  formData.pan.length > 0 && 
                  (formData.pan.length !== 10 || !validatePan(formData.pan))
                    ? "border-red-500"
                    : ""
                }
              />
              {formData.pan.length > 0 && formData.pan.length !== 10 && (
                <p className="mt-1 text-sm text-red-600">
                  PAN must be exactly 10 characters
                </p>
              )}
              {formData.pan.length === 10 && !validatePan(formData.pan) && (
                <p className="mt-1 text-sm text-red-600">
                  Invalid PAN format. Must be 5 letters + 4 digits + 1 letter
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                PAN format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
              </p>
            </div>

            <div>
              <label
                htmlFor="businessName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Business Name
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="businessName"
                type="text"
                placeholder="Enter business name"
                value={formData.businessName}
                onChange={(e) => handleChange("businessName", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="businessAddress"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Business Address
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                id="businessAddress"
                rows={3}
                placeholder="Enter complete business address"
                value={formData.businessAddress}
                onChange={(e) => handleChange("businessAddress", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Bank Account Information
            </h3>
            <p className="text-sm text-gray-600">
              Provide your bank account details for payments
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="bankAccountNumber"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Bank Account Number
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="bankAccountNumber"
                type="text"
                placeholder="Enter bank account number"
                value={formData.bankAccountNumber}
                onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="bankName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Bank Name
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="bankName"
                type="text"
                placeholder="Enter bank name (e.g., HDFC Bank)"
                value={formData.bankName}
                onChange={(e) => handleChange("bankName", e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="bankIfsc"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                IFSC Code
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="bankIfsc"
                type="text"
                placeholder="Enter 11-character IFSC code (e.g., HDFC0001234)"
                value={formData.bankIfsc}
                onChange={(e) => handleIfscChange(e.target.value)}
                maxLength={11}
                className={
                  formData.bankIfsc.length > 0 && 
                  (formData.bankIfsc.length !== 11 || !validateIfsc(formData.bankIfsc))
                    ? "border-red-500"
                    : ""
                }
              />
              {formData.bankIfsc.length > 0 && formData.bankIfsc.length !== 11 && (
                <p className="mt-1 text-sm text-red-600">
                  IFSC code must be exactly 11 characters
                </p>
              )}
              {formData.bankIfsc.length === 11 && !validateIfsc(formData.bankIfsc) && (
                <p className="mt-1 text-sm text-red-600">
                  Invalid IFSC format. Must be 4 letters + 0 + 6 digits
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                IFSC format: 4 letters + 0 + 6 digits (e.g., HDFC0001234)
              </p>
            </div>

            <div>
              <label
                htmlFor="bankBranch"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Bank Branch
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="bankBranch"
                type="text"
                placeholder="Enter bank branch name"
                value={formData.bankBranch}
                onChange={(e) => handleChange("bankBranch", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </>
  );
}
