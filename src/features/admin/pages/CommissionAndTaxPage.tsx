import { useState, useEffect } from "react";
import { commissionTaxService, type Commission, type Tax, type CreateCommissionRequest, type CreateTaxRequest } from "../services/commissionTaxService";
import { adminService, type ApprovedHotelItem } from "../services/adminService";
import { Button, Input, Select, LoadingSpinner, Card, CardHeader, CardTitle, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Edit, 
  X, 
  Percent,
  Receipt,
  Globe,
  Building2,
  MapPin,
  Radio,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  IndianRupee,
  Hash
} from "lucide-react";

// Commission Constants
const COMMISSION_SCOPE_OPTIONS = [
  { value: "GLOBAL", label: "Global" },
  { value: "HOTEL", label: "Hotel" },
  { value: "CITY", label: "City" },
  { value: "CHANNEL", label: "Channel" },
];

const COMMISSION_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FLAT", label: "Flat" },
];

// Tax Constants
const TAX_TYPE_OPTIONS = [
  { value: "CGST", label: "CGST" },
  { value: "SGST", label: "SGST" },
  { value: "IGST", label: "IGST" },
];

// Indian States - using full state name as value
const STATE_CODE_OPTIONS = [
  { value: "Andaman and Nicobar Islands", label: "Andaman and Nicobar Islands" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Arunachal Pradesh", label: "Arunachal Pradesh" },
  { value: "Assam", label: "Assam" },
  { value: "Bihar", label: "Bihar" },
  { value: "Chandigarh", label: "Chandigarh" },
  { value: "Chhattisgarh", label: "Chhattisgarh" },
  { value: "Dadra and Nagar Haveli", label: "Dadra and Nagar Haveli" },
  { value: "Daman and Diu", label: "Daman and Diu" },
  { value: "Delhi", label: "Delhi" },
  { value: "Goa", label: "Goa" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Haryana", label: "Haryana" },
  { value: "Himachal Pradesh", label: "Himachal Pradesh" },
  { value: "Jammu and Kashmir", label: "Jammu and Kashmir" },
  { value: "Jharkhand", label: "Jharkhand" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Kerala", label: "Kerala" },
  { value: "Ladakh", label: "Ladakh" },
  { value: "Lakshadweep", label: "Lakshadweep" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Manipur", label: "Manipur" },
  { value: "Meghalaya", label: "Meghalaya" },
  { value: "Mizoram", label: "Mizoram" },
  { value: "Nagaland", label: "Nagaland" },
  { value: "Odisha", label: "Odisha" },
  { value: "Puducherry", label: "Puducherry" },
  { value: "Punjab", label: "Punjab" },
  { value: "Rajasthan", label: "Rajasthan" },
  { value: "Sikkim", label: "Sikkim" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Telangana", label: "Telangana" },
  { value: "Tripura", label: "Tripura" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Uttarakhand", label: "Uttarakhand" },
  { value: "West Bengal", label: "West Bengal" },
];

// Commission Form Modal
interface CommissionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCommissionRequest) => Promise<void>;
  commission?: Commission | null;
  mode: "create" | "edit";
}

function CommissionFormModal({ isOpen, onClose, onSubmit, commission, mode }: CommissionFormModalProps) {
  const [formData, setFormData] = useState<CreateCommissionRequest>({
    scope: "GLOBAL",
    scopeValue: null,
    commissionType: "PERCENTAGE",
    commissionValue: 0,
    effectiveFrom: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hotels, setHotels] = useState<ApprovedHotelItem[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);

  useEffect(() => {
    if (mode === "edit" && commission) {
      setFormData({
        scope: commission.scope,
        scopeValue: commission.scopeValue,
        commissionType: commission.commissionType,
        commissionValue: commission.commissionValue,
        effectiveFrom: commission.effectiveFrom.split("T")[0],
      });
    } else {
      setFormData({
        scope: "GLOBAL",
        scopeValue: null,
        commissionType: "PERCENTAGE",
        commissionValue: 0,
        effectiveFrom: "",
      });
    }
    setErrors({});
    setApiError(null);
  }, [mode, commission, isOpen]);

  // Fetch hotels when scope is changed to HOTEL
  useEffect(() => {
    const fetchHotels = async () => {
      if (formData.scope === "HOTEL") {
        try {
          setIsLoadingHotels(true);
          const approvedHotels = await adminService.getApprovedHotels();
          setHotels(approvedHotels);
        } catch (error) {
          console.error("Error fetching hotels:", error);
          setHotels([]);
        } finally {
          setIsLoadingHotels(false);
        }
      } else {
        setHotels([]);
      }
    };

    if (isOpen) {
      fetchHotels();
    }
  }, [formData.scope, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.scope) {
      newErrors.scope = "Scope is required";
    }

    if (formData.scope !== "GLOBAL" && !formData.scopeValue) {
      newErrors.scopeValue = "Scope value is required";
    }

    if (!formData.commissionType) {
      newErrors.commissionType = "Commission type is required";
    }

    if (formData.commissionValue <= 0) {
      newErrors.commissionValue = "Commission value must be greater than 0";
    }

    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = "Effective from date is required";
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
        "Failed to save commission. Please try again.";
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === "create" ? "Create Commission" : "Edit Commission"}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === "create"
                  ? "Add a new commission rule"
                  : "Update commission information"}
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

        <form onSubmit={handleSubmit} className="p-6">
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
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

          <div className="mb-6">
            <Select
              label="Scope"
              value={formData.scope}
              onChange={(e) => {
                const newScope = e.target.value as CreateCommissionRequest["scope"];
                setFormData({
                  ...formData,
                  scope: newScope,
                  scopeValue: newScope === "GLOBAL" ? null : null, // Clear scopeValue when changing scope
                });
              }}
              error={errors.scope}
              options={COMMISSION_SCOPE_OPTIONS}
              required
              icon={<Globe className="w-4 h-4 text-gray-400" />}
            />
          </div>

          {formData.scope !== "GLOBAL" && (
            <div className="mb-6">
              {formData.scope === "HOTEL" ? (
                <Select
                  label="Hotel"
                  value={formData.scopeValue || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, scopeValue: e.target.value || null })
                  }
                  error={errors.scopeValue}
                  required
                  icon={<Building2 className="w-4 h-4 text-gray-400" />}
                  options={
                    isLoadingHotels
                      ? [{ value: "", label: "Loading hotels..." }]
                      : hotels.length > 0
                      ? hotels.map((hotel) => ({
                          value: hotel.hotelId,
                          label: `${hotel.hotelName} (${hotel.hotelCode})`,
                        }))
                      : [{ value: "", label: "No hotels available" }]
                  }
                  disabled={isLoadingHotels}
                />
              ) : (
                <Input
                  label={`${formData.scope === "CITY" ? "City" : "Channel"} ID/Name`}
                  value={formData.scopeValue || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, scopeValue: e.target.value || null })
                  }
                  error={errors.scopeValue}
                  required
                  icon={
                    formData.scope === "CITY" ? (
                      <MapPin className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Radio className="w-4 h-4 text-gray-400" />
                    )
                  }
                />
              )}
            </div>
          )}

          <div className="mb-6">
            <Select
              label="Commission Type"
              value={formData.commissionType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  commissionType: e.target.value as CreateCommissionRequest["commissionType"],
                })
              }
              error={errors.commissionType}
              options={COMMISSION_TYPE_OPTIONS}
              required
              icon={<Percent className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div className="mb-6">
            <Input
              label={formData.commissionType === "PERCENTAGE" ? "Commission Value (%)" : "Commission Value (₹)"}
              type="number"
              step="0.01"
              min="0"
              value={formData.commissionValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  commissionValue: parseFloat(e.target.value) || 0,
                })
              }
              error={errors.commissionValue}
              required
              icon={formData.commissionType === "PERCENTAGE" ? <Percent className="w-4 h-4 text-gray-400" /> : <IndianRupee className="w-4 h-4 text-gray-400" />}
              placeholder={formData.commissionType === "PERCENTAGE" ? "15" : "100.00"}
            />
          </div>

          <div className="mb-6">
            <Input
              label="Effective From"
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) =>
                setFormData({ ...formData, effectiveFrom: e.target.value })
              }
              error={errors.effectiveFrom}
              required
              icon={<Calendar className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Commission" : "Update Commission"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Tax Form Modal
interface TaxFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaxRequest) => Promise<void>;
  tax?: Tax | null;
  mode: "create" | "edit";
}

function TaxFormModal({ isOpen, onClose, onSubmit, tax, mode }: TaxFormModalProps) {
  const [formData, setFormData] = useState<CreateTaxRequest>({
    taxType: "CGST",
    percentage: 0,
    stateCode: null,
    minAmount: null,
    maxAmount: null,
    effectiveFrom: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && tax) {
      setFormData({
        taxType: tax.taxType,
        percentage: tax.percentage,
        stateCode: tax.stateCode || null,
        minAmount: tax.minAmount || null,
        maxAmount: tax.maxAmount || null,
        effectiveFrom: tax.effectiveFrom.split("T")[0],
      });
    } else {
      setFormData({
        taxType: "CGST",
        percentage: 0,
        stateCode: null,
        minAmount: null,
        maxAmount: null,
        effectiveFrom: "",
      });
    }
    setErrors({});
    setApiError(null);
  }, [mode, tax, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.taxType) {
      newErrors.taxType = "Tax type is required";
    }

    if (formData.percentage <= 0 || formData.percentage > 100) {
      newErrors.percentage = "Percentage must be between 0 and 100";
    }

    // Validate minAmount and maxAmount
    if (formData.minAmount !== null && formData.minAmount !== undefined && formData.minAmount < 0) {
      newErrors.minAmount = "Minimum amount must be greater than or equal to 0";
    }

    if (formData.maxAmount !== null && formData.maxAmount !== undefined && formData.maxAmount < 0) {
      newErrors.maxAmount = "Maximum amount must be greater than or equal to 0";
    }

    if (
      formData.minAmount !== null && 
      formData.minAmount !== undefined && 
      formData.maxAmount !== null && 
      formData.maxAmount !== undefined &&
      formData.minAmount > formData.maxAmount
    ) {
      newErrors.maxAmount = "Maximum amount must be greater than or equal to minimum amount";
    }

    // State is only required for CGST and SGST, not for IGST
    if (formData.taxType !== "IGST" && !formData.stateCode) {
      newErrors.stateCode = "State is required for CGST and SGST";
    }

    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = "Effective from date is required";
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
        "Failed to save tax. Please try again.";
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === "create" ? "Create Tax" : "Edit Tax"}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === "create"
                  ? "Add a new tax rule"
                  : "Update tax information"}
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

        <form onSubmit={handleSubmit} className="p-6">
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
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

          <div className="mb-6">
            <Select
              label="Tax Type"
              value={formData.taxType}
              onChange={(e) => {
                const newTaxType = e.target.value as CreateTaxRequest["taxType"];
                setFormData({
                  ...formData,
                  taxType: newTaxType,
                  // Clear state code when switching to IGST
                  stateCode: newTaxType === "IGST" ? "" : formData.stateCode,
                });
              }}
              error={errors.taxType}
              options={TAX_TYPE_OPTIONS}
              required
              icon={<Receipt className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div className="mb-6">
            <Input
              label="Percentage"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.percentage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  percentage: parseFloat(e.target.value) || 0,
                })
              }
              error={errors.percentage}
              required
              icon={<Percent className="w-4 h-4 text-gray-400" />}
              placeholder="6"
            />
          </div>

          {/* State field - only show for CGST and SGST, not for IGST */}
          {formData.taxType !== "IGST" && (
            <div className="mb-6">
              <Select
                label="State"
                value={formData.stateCode || ""}
                onChange={(e) =>
                  setFormData({ ...formData, stateCode: e.target.value || null })
                }
                error={errors.stateCode}
                options={STATE_CODE_OPTIONS}
                required
                icon={<MapPin className="w-4 h-4 text-gray-400" />}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Input
              label="Min Amount (Optional)"
              type="number"
              step="0.01"
              min="0"
              value={formData.minAmount !== null && formData.minAmount !== undefined ? formData.minAmount : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minAmount: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              error={errors.minAmount}
              icon={<IndianRupee className="w-4 h-4 text-gray-400" />}
              placeholder="0.00"
            />
            <Input
              label="Max Amount (Optional)"
              type="number"
              step="0.01"
              min="0"
              value={formData.maxAmount !== null && formData.maxAmount !== undefined ? formData.maxAmount : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxAmount: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              error={errors.maxAmount}
              icon={<IndianRupee className="w-4 h-4 text-gray-400" />}
              placeholder="0.00"
            />
          </div>

          <div className="mb-6">
            <Input
              label="Effective From"
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) =>
                setFormData({ ...formData, effectiveFrom: e.target.value })
              }
              error={errors.effectiveFrom}
              required
              icon={<Calendar className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Tax" : "Update Tax"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status, active }: { status?: "ACTIVE" | "INACTIVE" | string | null; active?: boolean | null }) {
  // Handle boolean active field (new API format) - check this first
  if (active !== undefined && active !== null) {
    const config = active
      ? {
          label: "Active",
          icon: CheckCircle2,
          className: "bg-green-100 text-green-700",
        }
      : {
          label: "Inactive",
          icon: XCircle,
          className: "bg-gray-100 text-gray-700",
        };
    const Icon = config.icon;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
          config.className
        )}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  // Handle string status field (legacy format)
  const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
    ACTIVE: {
      label: "Active",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-700",
    },
    INACTIVE: {
      label: "Inactive",
      icon: XCircle,
      className: "bg-gray-100 text-gray-700",
    },
  };

  // Handle null, undefined, or unknown status values
  if (!status || !statusConfig[status]) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
          "bg-gray-100 text-gray-700"
        )}
      >
        <AlertCircle className="w-3 h-3" />
        {status || "Unknown"}
      </span>
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        config.className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function CommissionAndTaxPage() {
  const [activeTab, setActiveTab] = useState<"commission" | "tax">("commission");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  useEffect(() => {
    if (activeTab === "commission") {
      fetchCommissions();
    } else {
      fetchTaxes();
    }
  }, [activeTab]);

  const fetchCommissions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await commissionTaxService.getCommissions();
      setCommissions(response.commissions || []);
    } catch (err) {
      setError("Failed to load commissions");
      console.error("Error fetching commissions:", err);
      setCommissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaxes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await commissionTaxService.getTaxes();
      setTaxes(response.taxes || []);
    } catch (err) {
      setError("Failed to load taxes");
      console.error("Error fetching taxes:", err);
      setTaxes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCommission = async (data: CreateCommissionRequest) => {
    try {
      await commissionTaxService.createCommission(data);
      await fetchCommissions();
    } catch (error) {
      throw error;
    }
  };

  const handleCreateTax = async (data: CreateTaxRequest) => {
    try {
      // For IGST, ensure stateCode is null/empty
      const taxData = {
        ...data,
        stateCode: data.taxType === "IGST" ? null : data.stateCode,
      };
      await commissionTaxService.createTax(taxData);
      await fetchTaxes();
    } catch (error) {
      throw error;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Commission and Tax Management</h1>
          <p className="text-gray-600">
            Manage commission rules and tax configurations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "commission" | "tax")}>
        <TabsList className="mb-6">
          <TabsTrigger value="commission" className="gap-2">
            <Percent className="w-4 h-4" />
            Commissions
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-2">
            <Receipt className="w-4 h-4" />
            Taxes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commission">
          <Card variant="elevated" className="mb-6 bg-white shadow-lg border border-gray-200">
            <CardHeader className="border-b border-gray-200 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Percent className="w-5 h-5 text-blue-600" />
                  Commission Rules
                </CardTitle>
                <Button
                  variant="primary"
                  onClick={() => setShowCommissionModal(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Commission
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              {commissions.length === 0 ? (
                <div className="text-center py-12">
                  <Percent className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium mb-2">
                    No commissions yet
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Create your first commission rule to get started
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowCommissionModal(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Commission
                  </Button>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 shadow-md rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#2f3d95] border-b-2 border-[#1e2a7a]">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Scope
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Scope Value
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Value
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Effective From
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {commissions.map((commission) => {
                          let effectiveDate = "N/A";
                          try {
                            if (commission.effectiveFrom) {
                              // Handle both date formats: "2026-01-23" and ISO strings
                              const date = new Date(commission.effectiveFrom);
                              if (!isNaN(date.getTime())) {
                                effectiveDate = date.toLocaleDateString();
                              }
                            }
                          } catch (error) {
                            effectiveDate = "N/A";
                          }
                          return (
                            <tr
                              key={commission.id}
                              className="hover:bg-blue-50 transition-colors even:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-700">
                                  <Hash className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="font-medium" title={commission.id}>
                                    {typeof commission.id === 'string' && commission.id.length > 8
                                      ? `${commission.id.substring(0, 8)}...`
                                      : commission.id}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {commission.scope === "GLOBAL" ? (
                                    <Globe className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
                                  ) : commission.scope === "HOTEL" ? (
                                    <Building2 className="w-4 h-4 mr-2 text-purple-500 flex-shrink-0" />
                                  ) : commission.scope === "CITY" ? (
                                    <MapPin className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <Radio className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" />
                                  )}
                                  <span className="text-sm font-medium text-gray-900">
                                    {commission.scope}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-700">
                                  {commission.scopeValue || "N/A"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {commission.commissionType === "PERCENTAGE" ? (
                                    <Percent className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <IndianRupee className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  )}
                                  <span className="text-sm text-gray-700">
                                    {commission.commissionType === "PERCENTAGE" ? "Percentage" : "Flat"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {commission.commissionType === "PERCENTAGE" ? (
                                    <DollarSign className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <IndianRupee className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  )}
                                  <span className="text-sm font-semibold text-gray-900">
                                    {commission.commissionType === "PERCENTAGE" 
                                      ? `${commission.commissionValue}%`
                                      : `₹${commission.commissionValue.toFixed(2)}`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-700">
                                  <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  <span>{effectiveDate}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge active={commission.active} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card variant="elevated" className="mb-6 bg-white shadow-lg border border-gray-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Receipt className="w-5 h-5 text-green-600" />
                  Tax Rules
                </CardTitle>
                <Button
                  variant="primary"
                  onClick={() => setShowTaxModal(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Tax
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              {taxes.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium mb-2">
                    No taxes yet
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Create your first tax rule to get started
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowTaxModal(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Tax
                  </Button>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 shadow-md rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#2f3d95] border-b-2 border-[#1e2a7a]">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Tax Type
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Percentage
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            State Code
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Min Amount
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Max Amount
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Effective From
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {taxes.map((tax) => {
                          let effectiveDate = "N/A";
                          try {
                            if (tax.effectiveFrom) {
                              // Handle both date formats: "2026-01-23" and ISO strings
                              const date = new Date(tax.effectiveFrom);
                              if (!isNaN(date.getTime())) {
                                effectiveDate = date.toLocaleDateString();
                              }
                            }
                          } catch (error) {
                            effectiveDate = "N/A";
                          }
                          return (
                            <tr
                              key={tax.id}
                              className="hover:bg-blue-50 transition-colors even:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-700">
                                  <Hash className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="font-medium" title={tax.id}>
                                    {typeof tax.id === 'string' && tax.id.length > 8
                                      ? `${tax.id.substring(0, 8)}...`
                                      : tax.id}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Receipt className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {tax.taxType}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Percent className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm font-semibold text-gray-900">
                                    {tax.percentage}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
                                  <span className="text-sm text-gray-700">{tax.stateCode || "N/A"}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <IndianRupee className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-700">
                                    {tax.minAmount !== null && tax.minAmount !== undefined 
                                      ? `₹${tax.minAmount.toFixed(2)}` 
                                      : "N/A"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <IndianRupee className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-700">
                                    {tax.maxAmount !== null && tax.maxAmount !== undefined 
                                      ? `₹${tax.maxAmount.toFixed(2)}` 
                                      : "N/A"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-700">
                                  <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  <span>{effectiveDate}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge active={tax.active} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Commission Modal */}
      <CommissionFormModal
        isOpen={showCommissionModal}
        onClose={() => setShowCommissionModal(false)}
        onSubmit={handleCreateCommission}
        mode="create"
      />

      {/* Tax Modal */}
      <TaxFormModal
        isOpen={showTaxModal}
        onClose={() => setShowTaxModal(false)}
        onSubmit={handleCreateTax}
        mode="create"
      />
    </div>
  );
}

