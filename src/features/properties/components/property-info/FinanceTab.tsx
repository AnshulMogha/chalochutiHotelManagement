import { useState, useEffect } from "react";
import { Building2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { adminService, type FinanceData } from "@/features/admin/services/adminService";
import { cn } from "@/lib/utils";
import {
  FinanceFieldHint,
  FinanceFieldLabel,
  FinanceFieldWrap,
  FinancePageLoader,
  FinanceSaveBar,
  FinanceSectionCard,
  FinanceSectionHeader,
  FinanceTextarea,
} from "./financeTabUi";

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
        if (response.finances && response.finances.length > 0) {
          const financeData = response.finances[0];
          setFormData({
            gstin: financeData.gstin || "",
            pan: financeData.pan || "",
            businessName: financeData.businessName || "",
            businessAddress: financeData.businessAddress || "",
            bankAccountNumber: financeData.bankAccountNumber || "",
            bankName: financeData.bankName || "",
            bankIfsc: financeData.bankIfsc || "",
            bankBranch: financeData.bankBranch || "",
          });
        }
      } catch (error) {
        console.error("Error fetching finance data:", error);
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
    if (formatted.length <= 11) {
      let validFormat = "";
      const firstFour = formatted.substring(0, 4).replace(/[^A-Z]/g, "");
      validFormat = firstFour;
      if (formatted.length > 4) {
        if (formatted[4] === "0") {
          validFormat += "0";
        } else if (!/[A-Z]/.test(formatted[4])) {
          validFormat += "0";
        }
      }
      if (formatted.length > 5) {
        const rest = formatted.substring(5).replace(/[^0-9]/g, "");
        validFormat += rest;
      }
      if (validFormat.length > 11) {
        validFormat = validFormat.substring(0, 11);
      }
      handleChange("bankIfsc", validFormat);
    }
  };

  const validatePan = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validateIfsc = (ifsc: string): boolean => {
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
      showToast(
        "PAN format is invalid. Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)",
        "error",
      );
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
      showToast(
        "IFSC format is invalid. Format: 4 letters + 0 + 6 digits (e.g., HDFC0001234)",
        "error",
      );
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

  const gstinInvalid =
    formData.gstin.length > 0 && formData.gstin.length !== 15;
  const panLengthInvalid = formData.pan.length > 0 && formData.pan.length !== 10;
  const panFormatInvalid =
    formData.pan.length === 10 && !validatePan(formData.pan);
  const ifscLengthInvalid =
    formData.bankIfsc.length > 0 && formData.bankIfsc.length !== 11;
  const ifscFormatInvalid =
    formData.bankIfsc.length === 11 && !validateIfsc(formData.bankIfsc);

  if (loading) {
    return <FinancePageLoader message="Loading finance information..." />;
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="sticky top-0 z-20 -mx-4 mb-1 border-b border-slate-200/70 bg-gray-50 px-4 py-3">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Finance
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage financial and legal information for your hotel
          </p>
        </div>

        <FinanceSectionCard theme="emerald">
          <FinanceSectionHeader
            icon={Building2}
            title="Business Information"
            subtitle="Provide your business registration and tax details"
            theme="emerald"
          />

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FinanceFieldWrap theme="emerald">
                <FinanceFieldLabel htmlFor="gstin" required theme="emerald">
                  GSTIN
                </FinanceFieldLabel>
                <Input
                  id="gstin"
                  type="text"
                  placeholder="29ABCDE1234F1Z5"
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  maxLength={15}
                  className={cn(
                    "bg-white font-mono uppercase",
                    gstinInvalid && "border-red-500",
                  )}
                />
                {gstinInvalid ? (
                  <FinanceFieldHint error>
                    GSTIN must be exactly 15 characters
                  </FinanceFieldHint>
                ) : (
                  <FinanceFieldHint>
                    15-character alphanumeric GST identification number
                  </FinanceFieldHint>
                )}
              </FinanceFieldWrap>

              <FinanceFieldWrap theme="emerald">
                <FinanceFieldLabel htmlFor="pan" required theme="emerald">
                  PAN
                </FinanceFieldLabel>
                <Input
                  id="pan"
                  type="text"
                  placeholder="ABCDE1234F"
                  value={formData.pan}
                  onChange={(e) => handlePanChange(e.target.value)}
                  maxLength={10}
                  className={cn(
                    "bg-white font-mono uppercase",
                    (panLengthInvalid || panFormatInvalid) && "border-red-500",
                  )}
                />
                {panLengthInvalid ? (
                  <FinanceFieldHint error>
                    PAN must be exactly 10 characters
                  </FinanceFieldHint>
                ) : panFormatInvalid ? (
                  <FinanceFieldHint error>
                    Invalid PAN format (5 letters + 4 digits + 1 letter)
                  </FinanceFieldHint>
                ) : (
                  <FinanceFieldHint>
                    Format: ABCDE1234F
                  </FinanceFieldHint>
                )}
              </FinanceFieldWrap>
            </div>

            <FinanceFieldWrap theme="emerald">
              <FinanceFieldLabel htmlFor="businessName" required theme="emerald">
                Business Name
              </FinanceFieldLabel>
              <Input
                id="businessName"
                type="text"
                placeholder="Enter business name"
                value={formData.businessName}
                onChange={(e) => handleChange("businessName", e.target.value)}
                className="bg-white"
              />
            </FinanceFieldWrap>

            <FinanceFieldWrap theme="emerald">
              <FinanceFieldLabel htmlFor="businessAddress" required theme="emerald">
                Business Address
              </FinanceFieldLabel>
              <FinanceTextarea
                id="businessAddress"
                rows={3}
                placeholder="Enter complete business address"
                value={formData.businessAddress}
                onChange={(e) => handleChange("businessAddress", e.target.value)}
              />
            </FinanceFieldWrap>
          </div>
        </FinanceSectionCard>

        <FinanceSectionCard theme="teal">
          <FinanceSectionHeader
            icon={Landmark}
            title="Bank Account Information"
            subtitle="Provide your bank account details for payments"
            theme="teal"
          />

          <div className="space-y-3">
            <FinanceFieldWrap theme="teal">
              <FinanceFieldLabel htmlFor="bankAccountNumber" required theme="teal">
                Bank Account Number
              </FinanceFieldLabel>
              <Input
                id="bankAccountNumber"
                type="text"
                placeholder="Enter bank account number"
                value={formData.bankAccountNumber}
                onChange={(e) =>
                  handleChange("bankAccountNumber", e.target.value)
                }
                className="bg-white font-mono"
              />
            </FinanceFieldWrap>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FinanceFieldWrap theme="teal">
                <FinanceFieldLabel htmlFor="bankName" required theme="teal">
                  Bank Name
                </FinanceFieldLabel>
                <Input
                  id="bankName"
                  type="text"
                  placeholder="HDFC Bank"
                  value={formData.bankName}
                  onChange={(e) => handleChange("bankName", e.target.value)}
                  className="bg-white"
                />
              </FinanceFieldWrap>

              <FinanceFieldWrap theme="teal">
                <FinanceFieldLabel htmlFor="bankIfsc" required theme="teal">
                  IFSC Code
                </FinanceFieldLabel>
                <Input
                  id="bankIfsc"
                  type="text"
                  placeholder="HDFC0001234"
                  value={formData.bankIfsc}
                  onChange={(e) => handleIfscChange(e.target.value)}
                  maxLength={11}
                  className={cn(
                    "bg-white font-mono uppercase",
                    (ifscLengthInvalid || ifscFormatInvalid) && "border-red-500",
                  )}
                />
                {ifscLengthInvalid ? (
                  <FinanceFieldHint error>
                    IFSC code must be exactly 11 characters
                  </FinanceFieldHint>
                ) : ifscFormatInvalid ? (
                  <FinanceFieldHint error>
                    Invalid IFSC format (4 letters + 0 + 6 digits)
                  </FinanceFieldHint>
                ) : (
                  <FinanceFieldHint>Format: HDFC0001234</FinanceFieldHint>
                )}
              </FinanceFieldWrap>
            </div>

            <FinanceFieldWrap theme="teal">
              <FinanceFieldLabel htmlFor="bankBranch" required theme="teal">
                Bank Branch
              </FinanceFieldLabel>
              <Input
                id="bankBranch"
                type="text"
                placeholder="Enter bank branch name"
                value={formData.bankBranch}
                onChange={(e) => handleChange("bankBranch", e.target.value)}
                className="bg-white"
              />
            </FinanceFieldWrap>
          </div>
        </FinanceSectionCard>

        <FinanceSaveBar>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2f3d95] hover:bg-[#263578] text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </FinanceSaveBar>
      </div>
    </>
  );
}
