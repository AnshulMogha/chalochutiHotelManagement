import { useState, useEffect, useRef } from "react";
import {
  commissionTaxService,
  type Commission,
  type Tax,
  type CreateCommissionRequest,
  type CreateTaxRequest,
  type ServiceFee,
  type CreateServiceFeeRequest,
} from "../services/commissionTaxService";
import {
  agentIncentiveService,
  type AgentIncentive,
  type AgentIncentiveConfigRequest,
} from "../services/agentIncentiveService";
import {
  AgencyIncentiveFormModal,
  AgencyIncentiveRulesPanel,
  matchesIncentiveSearch,
} from "../components/AgencyCommissionSection";
import {
  COMMISSION_TAB_STYLES,
  CommissionCellChip,
  CommissionEmptyState,
  CommissionFilterBar,
  CommissionPanelBody,
  CommissionPaginationFooter,
  CommissionSearchInput,
  CommissionTableHead,
  CommissionTableHeader,
  CommissionTableWrap,
  CommissionTabLoader,
  CommissionTh,
} from "../components/commissionTaxUi";
import {
  ListStatusFilterTabs,
  matchesListStatusFilter,
  type ListStatusFilterValue,
} from "../components/ListStatusFilter";
import {
  adminService,
  type HotelLookupItem,
} from "../services/adminService";
import { Button, Input, Select, LoadingSpinner, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
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
  Hash,
  Search
} from "lucide-react";

// Commission Constants
const OTA_COMMISSION_SCOPE_OPTIONS = [
  { value: "GLOBAL", label: "Global" },
  { value: "HOTEL", label: "Hotel" },
  // { value: "CITY", label: "City" }, // Temporarily disabled
  { value: "CHANNEL", label: "Channel" },
];

type AdminCommissionTab = "otaCommission" | "agencyCommission" | "tax" | "serviceFee";

const COMMISSION_TABS: {
  value: AdminCommissionTab;
  label: string;
  icon: typeof Percent;
}[] = [
  { value: "otaCommission", label: "OTA Commission", icon: Percent },
  { value: "agencyCommission", label: "Agency Commission", icon: Building2 },
  { value: "tax", label: "Taxes", icon: Receipt },
  { value: "serviceFee", label: "Service Fee", icon: IndianRupee },
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

const SERVICE_FEE_SCOPE_OPTIONS = [
  { value: "GLOBAL", label: "Global" },
  { value: "CUSTOMER_TYPE", label: "Customer Type" },
];

const SERVICE_FEE_CALCULATION_OPTIONS = [
  { value: "FLAT", label: "Flat" },
  { value: "PERCENTAGE", label: "Percentage" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: "B2C", label: "B2C" },
  { value: "B2B", label: "B2B" },
];

const CHANNEL_OPTIONS = [
  { value: "B2B", label: "B2B" },
  { value: "B2C", label: "B2C" },
];

const AGENCY_TIER_OPTIONS = [
  { value: "DIAMOND", label: "Diamond" },
  { value: "PLATINUM", label: "Platinum" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
  { value: "BRONZE", label: "Bronze" },
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

function CommissionFormModal({
  isOpen,
  onClose,
  onSubmit,
  commission,
  mode,
}: CommissionFormModalProps) {
  const [formData, setFormData] = useState<CreateCommissionRequest>({
    scope: "GLOBAL",
    scopeValue: null,
    commissionType: "PERCENTAGE",
    commissionValue: 0,
    effectiveFrom: "",
  });
  // Raw string mirror of commissionValue so the user can freely clear/edit the
  // field without a forced leading zero.
  const [commissionValueInput, setCommissionValueInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hotels, setHotels] = useState<HotelLookupItem[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  // Searchable hotel dropdown (matches the top-bar hotel selector behavior).
  const [hotelSearch, setHotelSearch] = useState("");
  const [isHotelDropdownOpen, setIsHotelDropdownOpen] = useState(false);
  const hotelDropdownRef = useRef<HTMLDivElement | null>(null);
  const todayIso = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (mode === "edit" && commission) {
      setFormData({
        scope: commission.scope,
        scopeValue:
          commission.scope === "AGENCY_TIER"
            ? commission.scopeValue || commission.agencyTier || null
            : commission.scopeValue,
        commissionType: commission.commissionType,
        commissionValue: commission.commissionValue,
        effectiveFrom: commission.effectiveFrom.split("T")[0],
      });
      setCommissionValueInput(String(commission.commissionValue ?? ""));
    } else {
      setFormData({
        scope: "GLOBAL",
        scopeValue: null,
        commissionType: "PERCENTAGE",
        commissionValue: 0,
        effectiveFrom: "",
      });
      setCommissionValueInput("");
    }
    setErrors({});
    setApiError(null);
  }, [mode, commission, isOpen]);

  // Fetch scope masters when scope changes
  useEffect(() => {
    const fetchScopeMasters = async () => {
      if (formData.scope === "HOTEL") {
        try {
          setIsLoadingHotels(true);
          // Use the same lookup API as the hotel selector dropdown so the list
          // includes city and can be searched by name or city.
          const lookupHotels = await adminService.getSuperAdminHotelLookup("");
          setHotels(lookupHotels);
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
      fetchScopeMasters();
    }
  }, [formData.scope, isOpen]);

  // Close the searchable hotel dropdown when clicking outside it.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        hotelDropdownRef.current &&
        !hotelDropdownRef.current.contains(event.target as Node)
      ) {
        setIsHotelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset the hotel search box when the dropdown closes or scope changes.
  useEffect(() => {
    if (!isHotelDropdownOpen) setHotelSearch("");
  }, [isHotelDropdownOpen]);

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
    } else if (formData.effectiveFrom < todayIso) {
      newErrors.effectiveFrom = "Effective from date cannot be in the past.";
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
      const payload: CreateCommissionRequest = {
        ...formData,
        scopeValue: formData.scope === "GLOBAL" ? null : formData.scopeValue,
      };
      await onSubmit(payload);
      onClose();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      const fieldErrors =
        error?.data?.data ||
        error?.response?.data?.data ||
        error?.data ||
        error?.response?.data ||
        {};
      const nextErrors: Record<string, string> = {};
      if (fieldErrors?.effectiveFrom) {
        nextErrors.effectiveFrom = String(fieldErrors.effectiveFrom);
      }
      if (fieldErrors?.scope) {
        nextErrors.scope = String(fieldErrors.scope);
      }
      if (fieldErrors?.scopeValue) {
        nextErrors.scopeValue = String(fieldErrors.scopeValue);
      }
      if (fieldErrors?.commissionType) {
        nextErrors.commissionType = String(fieldErrors.commissionType);
      }
      if (fieldErrors?.commissionValue) {
        nextErrors.commissionValue = String(fieldErrors.commissionValue);
      }
      if (Object.keys(nextErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...nextErrors }));
      }
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
                {mode === "create" ? "Create OTA Commission" : "Edit OTA Commission"}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === "create"
                  ? "Add a new OTA commission rule"
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
                  scopeValue: null,
                });
              }}
              error={errors.scope}
              options={OTA_COMMISSION_SCOPE_OPTIONS}
              required
              icon={<Globe className="w-4 h-4 text-gray-400" />}
            />
          </div>

          {formData.scope !== "GLOBAL" && (
            <div className="mb-6">
              {formData.scope === "HOTEL" ? (
                (() => {
                  const selectedHotel = hotels.find(
                    (h) => h.hotelId === formData.scopeValue,
                  );
                  const term = hotelSearch.trim().toLowerCase();
                  const visibleHotels = term
                    ? hotels.filter((hotel) =>
                        [hotel.hotelName, hotel.hotelCode, hotel.city]
                          .filter((field): field is string => Boolean(field))
                          .some((field) =>
                            field.toLowerCase().includes(term),
                          ),
                      )
                    : hotels;
                  return (
                    <div ref={hotelDropdownRef}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hotel
                        <span className="ml-1 text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            !isLoadingHotels &&
                            setIsHotelDropdownOpen((prev) => !prev)
                          }
                          disabled={isLoadingHotels}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm transition-colors",
                            errors.scopeValue
                              ? "border-red-400"
                              : "border-gray-300",
                            isLoadingHotels && "cursor-not-allowed opacity-60",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
                            <span
                              className={cn(
                                "truncate",
                                !selectedHotel && "text-gray-400",
                              )}
                            >
                              {isLoadingHotels
                                ? "Loading hotels..."
                                : selectedHotel
                                  ? `${selectedHotel.hotelName}${
                                      selectedHotel.city
                                        ? ` (${selectedHotel.city})`
                                        : ""
                                    }`
                                  : "Select a hotel"}
                            </span>
                          </span>
                        </button>

                        {isHotelDropdownOpen && !isLoadingHotels && (
                          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-2">
                              <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
                                <Search className="h-3.5 w-3.5 text-gray-400" />
                                <input
                                  autoFocus
                                  value={hotelSearch}
                                  onChange={(e) =>
                                    setHotelSearch(e.target.value)
                                  }
                                  placeholder="Search by name or city..."
                                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                                />
                              </div>
                            </div>
                            {visibleHotels.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                {hotels.length === 0
                                  ? "No hotels available"
                                  : "No hotels found. Try another search."}
                              </div>
                            ) : (
                              visibleHotels.map((hotel) => (
                                <button
                                  type="button"
                                  key={hotel.hotelId}
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      scopeValue: hotel.hotelId,
                                    });
                                    setIsHotelDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50",
                                    formData.scopeValue === hotel.hotelId &&
                                      "bg-[#2f3d95]/10",
                                  )}
                                >
                                  <Building2 className="h-4 w-4 shrink-0 text-[#2f3d95]" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">
                                      {hotel.hotelName}
                                    </span>
                                    {hotel.city && (
                                      <span className="block truncate text-xs text-gray-500">
                                        {hotel.city}
                                      </span>
                                    )}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {errors.scopeValue && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.scopeValue}
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : formData.scope === "CHANNEL" ? (
                <Select
                  label="Channel Name"
                  value={formData.scopeValue || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, scopeValue: e.target.value || null })
                  }
                  error={errors.scopeValue}
                  required
                  icon={<Radio className="w-4 h-4 text-gray-400" />}
                  options={CHANNEL_OPTIONS}
                />
              ) : formData.scope === "AGENCY_TIER" ? (
                <Select
                  label="Agency Tier"
                  value={formData.scopeValue || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scopeValue: e.target.value || null,
                    })
                  }
                  error={errors.scopeValue}
                  required
                  icon={<Building2 className="w-4 h-4 text-gray-400" />}
                  options={AGENCY_TIER_OPTIONS}
                />
              ) : (
                <Input
                  label="Scope Value"
                  value={formData.scopeValue || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, scopeValue: e.target.value || null })
                  }
                  error={errors.scopeValue}
                  required
                  icon={
                    <Radio className="w-4 h-4 text-gray-400" />
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
              value={commissionValueInput}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E") {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw.includes("-")) return;
                setCommissionValueInput(raw);
                setFormData({
                  ...formData,
                  commissionValue: raw === "" ? 0 : parseFloat(raw) || 0,
                });
              }}
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
              min={todayIso}
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
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Create OTA Commission"
                  : "Update Commission"}
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
  // Raw string for the percentage input so the user can clear/edit freely
  // (avoids a forced leading "0").
  const [percentageInput, setPercentageInput] = useState("");

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
      setPercentageInput(
        tax.percentage != null ? String(tax.percentage) : "",
      );
    } else {
      setFormData({
        taxType: "CGST",
        percentage: 0,
        stateCode: null,
        minAmount: null,
        maxAmount: null,
        effectiveFrom: "",
      });
      setPercentageInput("");
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
              value={percentageInput}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E") {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const raw = e.target.value;
                // Reject negative values.
                if (raw.includes("-")) return;
                setPercentageInput(raw);
                setFormData({
                  ...formData,
                  percentage: raw === "" ? 0 : parseFloat(raw) || 0,
                });
              }}
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

interface ServiceFeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateServiceFeeRequest) => Promise<void>;
}

function ServiceFeeFormModal({ isOpen, onClose, onSubmit }: ServiceFeeFormModalProps) {
  const [formData, setFormData] = useState<CreateServiceFeeRequest>({
    scope: "GLOBAL",
    scopeValue: null,
    calculationType: "FLAT",
    feeValue: 0,
    gstApplicable: true,
    gstRate: 18,
    effectiveFrom: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Raw strings for number inputs so the user can clear/edit freely
  // (avoids a forced leading "0").
  const [feeValueInput, setFeeValueInput] = useState("");
  const [gstRateInput, setGstRateInput] = useState("18");

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      scope: "GLOBAL",
      scopeValue: null,
      calculationType: "FLAT",
      feeValue: 0,
      gstApplicable: true,
      gstRate: 18,
      effectiveFrom: "",
    });
    setFeeValueInput("");
    setGstRateInput("18");
    setErrors({});
    setApiError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.scope) newErrors.scope = "Scope is required";
    if (formData.scope === "CUSTOMER_TYPE" && !formData.scopeValue) {
      newErrors.scopeValue = "Customer type is required";
    }
    if (!formData.calculationType) newErrors.calculationType = "Calculation type is required";
    if (formData.feeValue <= 0) newErrors.feeValue = "Fee value must be greater than 0";
    if (formData.gstApplicable && formData.gstRate <= 0) {
      newErrors.gstRate = "GST rate must be greater than 0";
    }
    if (!formData.effectiveFrom) newErrors.effectiveFrom = "Effective from date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setApiError(null);
    try {
      const payload: CreateServiceFeeRequest = {
        ...formData,
        scopeValue: formData.scope === "CUSTOMER_TYPE" ? formData.scopeValue : null,
      };
      await onSubmit(payload);
      onClose();
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        error?.data?.message ||
        "Failed to save service fee. Please try again.";
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-fuchsia-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create Service Fee</h2>
              <p className="text-sm text-gray-600">Add a service fee configuration</p>
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
            </div>
          )}

          <div className="mb-6">
            <Select
              label="Scope"
              value={formData.scope}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  scope: e.target.value as CreateServiceFeeRequest["scope"],
                  scopeValue:
                    e.target.value === "CUSTOMER_TYPE" ? prev.scopeValue : null,
                }))
              }
              error={errors.scope}
              options={SERVICE_FEE_SCOPE_OPTIONS}
              required
            />
          </div>

          {formData.scope === "CUSTOMER_TYPE" && (
            <div className="mb-6">
              <Select
                label="Customer Type"
                value={formData.scopeValue || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    scopeValue: e.target.value || null,
                  }))
                }
                error={errors.scopeValue}
                options={CUSTOMER_TYPE_OPTIONS}
                required
              />
            </div>
          )}

          <div className="mb-6">
            <Select
              label="Calculation Type"
              value={formData.calculationType}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  calculationType:
                    e.target.value as CreateServiceFeeRequest["calculationType"],
                }))
              }
              error={errors.calculationType}
              options={SERVICE_FEE_CALCULATION_OPTIONS}
              required
            />
          </div>

          <div className="mb-6">
            <Input
              label={formData.calculationType === "PERCENTAGE" ? "Fee Value (%)" : "Fee Value (₹)"}
              type="number"
              step="0.01"
              min="0"
              value={feeValueInput}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E") {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const raw = e.target.value;
                // Reject negative values.
                if (raw.includes("-")) return;
                setFeeValueInput(raw);
                setFormData((prev) => ({
                  ...prev,
                  feeValue: raw === "" ? 0 : parseFloat(raw) || 0,
                }));
              }}
              error={errors.feeValue}
              required
            />
          </div>

          <div className="mb-6">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={formData.gstApplicable}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    gstApplicable: e.target.checked,
                  }))
                }
              />
              GST Applicable
            </label>
          </div>

          {formData.gstApplicable && (
            <div className="mb-6">
              <Input
                label="GST Rate (%)"
                type="number"
                step="0.01"
                min="0"
                value={gstRateInput}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e" || e.key === "E") {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const raw = e.target.value;
                  // Reject negative values.
                  if (raw.includes("-")) return;
                  setGstRateInput(raw);
                  setFormData((prev) => ({
                    ...prev,
                    gstRate: raw === "" ? 0 : parseFloat(raw) || 0,
                  }));
                }}
                error={errors.gstRate}
                required
              />
            </div>
          )}

          <div className="mb-6">
            <Input
              label="Effective From"
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, effectiveFrom: e.target.value }))
              }
              error={errors.effectiveFrom}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create Service Fee"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Status Badge Component
function matchesCommissionSearch(commission: Commission, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const id = String(commission.id ?? "").toLowerCase();
  const scope = (commission.scope ?? "").toLowerCase();
  const scopeValue = (commission.scopeValue ?? "").toLowerCase();
  const agencyTier = (commission.agencyTier ?? "").toLowerCase();
  const type = (commission.commissionType ?? "").toLowerCase();
  const value = String(commission.commissionValue ?? "").toLowerCase();
  const from = (commission.effectiveFrom ?? "").toLowerCase();
  return (
    id.includes(q) ||
    scope.includes(q) ||
    scopeValue.includes(q) ||
    agencyTier.includes(q) ||
    type.includes(q) ||
    value.includes(q) ||
    from.includes(q)
  );
}

interface CommissionRulesPanelProps {
  title: string;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  searchPlaceholder: string;
  commissions: Commission[];
  filteredCommissions: Commission[];
  commissionSearch: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  error: string | null;
  isLoading: boolean;
  commissionPage: number;
  commissionPageSize: number;
  commissionTotal: number;
  commissionTotalPages: number;
  commissionHasNext: boolean;
  commissionHasPrevious: boolean;
  onPageSizeChange: (size: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onDeactivate: (id: string) => void;
  statusFilter: ListStatusFilterValue;
  onStatusFilterChange: (value: ListStatusFilterValue) => void;
  activeCount?: number;
  inactiveCount?: number;
  statusFilteredCount: number;
}

function CommissionRulesPanel({
  title,
  addLabel,
  emptyTitle,
  emptyDescription,
  searchPlaceholder,
  commissions,
  filteredCommissions,
  commissionSearch,
  onSearchChange,
  onAdd,
  error,
  isLoading,
  commissionPage,
  commissionPageSize,
  commissionTotal,
  commissionTotalPages,
  commissionHasNext,
  commissionHasPrevious,
  onPageSizeChange,
  onPrevious,
  onNext,
  onDeactivate,
  statusFilter,
  onStatusFilterChange,
  activeCount,
  inactiveCount,
  statusFilteredCount,
}: CommissionRulesPanelProps) {
  const pageSizeId = `commission-page-size-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const showActions = statusFilter === "active";

  return (
    <CommissionPanelBody theme="blue">
      {error && (
        <div className="mb-2 flex shrink-0 items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <CommissionFilterBar>
        <ListStatusFilterTabs
          value={statusFilter}
          onChange={onStatusFilterChange}
          activeCount={activeCount}
          inactiveCount={inactiveCount}
        />
        <CommissionSearchInput
          value={commissionSearch}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
        <Button variant="primary" size="sm" onClick={onAdd} className="ml-auto shrink-0 gap-1.5">
          <Plus className="w-4 h-4" />
          {addLabel}
        </Button>
      </CommissionFilterBar>
      {commissions.length === 0 && statusFilter === "active" ? (
        <CommissionEmptyState
          icon={Percent}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Button variant="primary" onClick={onAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              {addLabel}
            </Button>
          }
        />
      ) : statusFilteredCount === 0 ? (
        <CommissionEmptyState
          icon={Percent}
          title={`No ${statusFilter === "active" ? "active" : "inactive"} rules`}
          description={`Switch to ${statusFilter === "active" ? "Inactive" : "Active"} to view other rules.`}
        />
      ) : filteredCommissions.length === 0 ? (
        <CommissionEmptyState
          icon={Search}
          title="No matching rules"
          description="Try a different search term."
        />
      ) : (
        <CommissionTableWrap
          footer={
            <CommissionPaginationFooter
              pageLabel={`Showing page ${commissionTotalPages === 0 ? 0 : commissionPage + 1} of ${commissionTotalPages} (${commissionTotal} total)`}
              pageSize={commissionPageSize}
              onPageSizeChange={onPageSizeChange}
              pageSizeId={pageSizeId}
              hasPrevious={commissionHasPrevious}
              hasNext={commissionHasNext}
              isLoading={isLoading}
              onPrevious={onPrevious}
              onNext={onNext}
            />
          }
        >
          <table className="w-full">
            <CommissionTableHead>
              <tr>
                <CommissionTh>
                  <CommissionTableHeader icon={Hash} label="ID" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={Globe} label="Scope" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={MapPin} label="Scope Value" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={Percent} label="Type" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={IndianRupee} label="Value" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={Calendar} label="Effective From" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={CheckCircle2} label="Status" />
                </CommissionTh>
                {showActions && (
                  <CommissionTh>
                    <CommissionTableHeader icon={Edit} label="Actions" />
                  </CommissionTh>
                )}
              </tr>
            </CommissionTableHead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredCommissions.map((commission) => {
                let effectiveDate = "N/A";
                try {
                  if (commission.effectiveFrom) {
                    const date = new Date(commission.effectiveFrom);
                    if (!isNaN(date.getTime())) {
                      effectiveDate = date.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                    }
                  }
                } catch {
                  effectiveDate = "N/A";
                }
                const scopeValueDisplay =
                  commission.scope === "AGENCY_TIER"
                    ? commission.agencyTier || commission.scopeValue || "N/A"
                    : commission.scopeValue || "N/A";
                const scopeTheme =
                  commission.scope === "GLOBAL"
                    ? "blue"
                    : commission.scope === "HOTEL"
                      ? "violet"
                      : commission.scope === "CITY"
                        ? "green"
                        : "orange";
                const ScopeIcon =
                  commission.scope === "GLOBAL"
                    ? Globe
                    : commission.scope === "HOTEL"
                      ? Building2
                      : commission.scope === "CITY"
                        ? MapPin
                        : Radio;
                return (
                  <tr
                    key={commission.id}
                    className="transition-colors even:bg-slate-50/60 hover:bg-blue-50/50"
                  >
                    <td className="whitespace-nowrap px-3 py-2 first:pl-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CommissionCellChip icon={Hash} theme="slate" />
                        <span className="font-medium" title={commission.id}>
                          {typeof commission.id === "string" && commission.id.length > 8
                            ? `${commission.id.substring(0, 8)}...`
                            : commission.id}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CommissionCellChip icon={ScopeIcon} theme={scopeTheme} />
                        <span className="text-sm font-medium text-gray-900">
                          {commission.scope}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                      {scopeValueDisplay}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                      {commission.commissionType === "PERCENTAGE" ? "Percentage" : "Flat"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm font-semibold text-gray-900">
                      {commission.commissionType === "PERCENTAGE"
                        ? `${commission.commissionValue}%`
                        : `₹${commission.commissionValue.toFixed(2)}`}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                      {effectiveDate}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-2",
                        !showActions && "last:pr-4",
                      )}
                    >
                      <StatusBadge active={commission.active} />
                    </td>
                    {showActions && (
                      <td className="whitespace-nowrap px-3 py-2 last:pr-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!commission.active}
                          onClick={() => onDeactivate(commission.id)}
                          className="border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Deactivate
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CommissionTableWrap>
      )}
    </CommissionPanelBody>
  );
}

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
  const [activeTab, setActiveTab] = useState<AdminCommissionTab>("otaCommission");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionPage, setCommissionPage] = useState(0);
  const [commissionPageSize, setCommissionPageSize] = useState(20);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [commissionTotalPages, setCommissionTotalPages] = useState(0);
  const [commissionHasNext, setCommissionHasNext] = useState(false);
  const [commissionHasPrevious, setCommissionHasPrevious] = useState(false);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [serviceFees, setServiceFees] = useState<ServiceFee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [showServiceFeeModal, setShowServiceFeeModal] = useState(false);
  const [showDeactivateCommissionModal, setShowDeactivateCommissionModal] =
    useState(false);
  const [deactivatingCommission, setDeactivatingCommission] = useState(false);
  const [commissionToDeactivate, setCommissionToDeactivate] = useState<
    string | null
  >(null);
  const [showDeactivateTaxModal, setShowDeactivateTaxModal] = useState(false);
  const [deactivatingTax, setDeactivatingTax] = useState(false);
  const [taxToDeactivate, setTaxToDeactivate] = useState<string | null>(null);
  const [showDeactivateServiceFeeModal, setShowDeactivateServiceFeeModal] =
    useState(false);
  const [deactivatingServiceFee, setDeactivatingServiceFee] = useState(false);
  const [serviceFeeToDeactivate, setServiceFeeToDeactivate] = useState<
    string | null
  >(null);
  const [otaCommissionSearch, setOtaCommissionSearch] = useState("");
  const [otaStatusFilter, setOtaStatusFilter] =
    useState<ListStatusFilterValue>("active");
  const [agencyCommissionSearch, setAgencyCommissionSearch] = useState("");
  const [agencyStatusFilter, setAgencyStatusFilter] =
    useState<ListStatusFilterValue>("active");
  const [serviceFeeStatusFilter, setServiceFeeStatusFilter] =
    useState<ListStatusFilterValue>("active");
  const [agentIncentives, setAgentIncentives] = useState<AgentIncentive[]>([]);
  const [agentIncentivePage, setAgentIncentivePage] = useState(0);
  const [agentIncentivePageSize, setAgentIncentivePageSize] = useState(20);
  const [agentIncentiveTotal, setAgentIncentiveTotal] = useState(0);
  const [agentIncentiveTotalPages, setAgentIncentiveTotalPages] = useState(0);
  const [agentIncentiveHasNext, setAgentIncentiveHasNext] = useState(false);
  const [agentIncentiveHasPrevious, setAgentIncentiveHasPrevious] = useState(false);
  const [showAgencyIncentiveModal, setShowAgencyIncentiveModal] = useState(false);
  const [showDeactivateAgentIncentiveModal, setShowDeactivateAgentIncentiveModal] =
    useState(false);
  const [deactivatingAgentIncentive, setDeactivatingAgentIncentive] = useState(false);
  const [agentIncentiveToDeactivate, setAgentIncentiveToDeactivate] = useState<
    string | null
  >(null);
  const [taxSearch, setTaxSearch] = useState("");
  const [taxStateFilter, setTaxStateFilter] = useState<string>("");
  const [serviceFeeSearch, setServiceFeeSearch] = useState("");

  const otaCommissions = commissions.filter((c) => c.scope !== "AGENCY_TIER");
  const otaStatusFiltered = otaCommissions.filter((c) =>
    matchesListStatusFilter(c.active, otaStatusFilter),
  );
  const filteredOtaCommissions = otaStatusFiltered.filter((c) =>
    matchesCommissionSearch(c, otaCommissionSearch),
  );

  const agencyStatusFiltered = agentIncentives.filter((row) =>
    matchesListStatusFilter(row.active, agencyStatusFilter),
  );
  const filteredAgentIncentives = agencyStatusFiltered.filter((row) =>
    matchesIncentiveSearch(row, agencyCommissionSearch),
  );

  const serviceFeeActiveCount = serviceFees.filter((f) => f.active !== false).length;
  const serviceFeeInactiveCount = serviceFees.filter((f) => f.active === false).length;
  const serviceFeeStatusFiltered = serviceFees.filter((fee) =>
    matchesListStatusFilter(fee.active, serviceFeeStatusFilter),
  );

  const taxStates = Array.from(
    new Set(taxes.map((t) => t.stateCode).filter(Boolean))
  ).sort() as string[];
  const filteredTaxes = taxes.filter((t) => {
    const matchState = !taxStateFilter || t.stateCode === taxStateFilter;
    if (!matchState) return false;
    if (!taxSearch.trim()) return true;
    const q = taxSearch.toLowerCase().trim();
    const id = String(t.id ?? "").toLowerCase();
    const type = (t.taxType ?? "").toLowerCase();
    const pct = String(t.percentage ?? "").toLowerCase();
    const state = (t.stateCode ?? "").toLowerCase();
    const from = (t.effectiveFrom ?? "").toLowerCase();
    return (
      id.includes(q) ||
      type.includes(q) ||
      pct.includes(q) ||
      state.includes(q) ||
      from.includes(q)
    );
  });

  const filteredServiceFees = serviceFeeStatusFiltered.filter((fee) => {
    if (!serviceFeeSearch.trim()) return true;
    const q = serviceFeeSearch.toLowerCase().trim();
    const scope = (fee.scope ?? "").toLowerCase();
    const scopeValue = (fee.scopeValue ?? "").toLowerCase();
    const type = (fee.calculationType ?? "").toLowerCase();
    const value = String(fee.feeValue ?? "").toLowerCase();
    const from = (fee.effectiveFrom ?? "").toLowerCase();
    return (
      scope.includes(q) ||
      scopeValue.includes(q) ||
      type.includes(q) ||
      value.includes(q) ||
      from.includes(q)
    );
  });

  useEffect(() => {
    setTabLoading(true);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    const loadActiveTab = async () => {
      try {
        if (activeTab === "otaCommission") {
          await fetchCommissions(commissionPage, commissionPageSize);
        } else if (activeTab === "agencyCommission") {
          await fetchAgentIncentives(agentIncentivePage, agentIncentivePageSize);
        } else if (activeTab === "tax") {
          await fetchTaxes();
        } else {
          await fetchServiceFees();
        }
      } finally {
        if (!cancelled) {
          setTabLoading(false);
        }
      }
    };

    void loadActiveTab();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    commissionPage,
    commissionPageSize,
    otaStatusFilter,
    agencyStatusFilter,
    agentIncentivePage,
    agentIncentivePageSize,
  ]);

  const fetchCommissions = async (page = 0, size = 20) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await commissionTaxService.getCommissions({
        page,
        size,
        active: otaStatusFilter === "active",
      });
      setCommissions(response.commissions || []);
      setCommissionTotal(response.total || 0);
      setCommissionTotalPages(
        response.totalPages ??
          Math.ceil((response.total || 0) / (response.size || size || 1)),
      );
      setCommissionHasNext(
        response.hasNext ?? page + 1 < Math.ceil((response.total || 0) / (size || 1)),
      );
      setCommissionHasPrevious(response.hasPrevious ?? page > 0);
    } catch (err) {
      setError("Failed to load commissions");
      console.error("Error fetching commissions:", err);
      setCommissions([]);
      setCommissionTotal(0);
      setCommissionTotalPages(0);
      setCommissionHasNext(false);
      setCommissionHasPrevious(false);
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

  const fetchServiceFees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await commissionTaxService.getServiceFees();
      setServiceFees(response.serviceFees || []);
    } catch (err) {
      setError("Failed to load service fees");
      console.error("Error fetching service fees:", err);
      setServiceFees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgentIncentives = async (page = 0, size = 20) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await agentIncentiveService.getList({
        page,
        size,
        active: agencyStatusFilter === "active",
      });
      setAgentIncentives(response.incentives || []);
      setAgentIncentiveTotal(response.total || 0);
      setAgentIncentiveTotalPages(
        response.totalPages ??
          Math.ceil((response.total || 0) / (response.size || size || 1)),
      );
      setAgentIncentiveHasNext(
        response.hasNext ?? page + 1 < Math.ceil((response.total || 0) / (size || 1)),
      );
      setAgentIncentiveHasPrevious(response.hasPrevious ?? page > 0);
    } catch (err) {
      setError("Failed to load agency commissions");
      console.error("Error fetching agent incentives:", err);
      setAgentIncentives([]);
      setAgentIncentiveTotal(0);
      setAgentIncentiveTotalPages(0);
      setAgentIncentiveHasNext(false);
      setAgentIncentiveHasPrevious(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCommission = async (data: CreateCommissionRequest) => {
    try {
      await commissionTaxService.createCommission(data);
      await fetchCommissions(commissionPage, commissionPageSize);
    } catch (error) {
      throw error;
    }
  };

  const handleCreateAgentIncentive = async (data: AgentIncentiveConfigRequest) => {
    await agentIncentiveService.create(data);
    await fetchAgentIncentives(agentIncentivePage, agentIncentivePageSize);
  };

  const handleDeactivateAgentIncentive = async () => {
    if (!agentIncentiveToDeactivate) return;
    setDeactivatingAgentIncentive(true);
    try {
      await agentIncentiveService.deactivate(agentIncentiveToDeactivate);
      await fetchAgentIncentives(agentIncentivePage, agentIncentivePageSize);
      setShowDeactivateAgentIncentiveModal(false);
      setAgentIncentiveToDeactivate(null);
    } catch (error) {
      console.error("Error deactivating agent incentive:", error);
      setError("Failed to deactivate agency commission");
    } finally {
      setDeactivatingAgentIncentive(false);
    }
  };

  const handleDeactivateCommission = async () => {
    if (!commissionToDeactivate) return;
    setDeactivatingCommission(true);
    try {
      await commissionTaxService.deactivateCommission(commissionToDeactivate);
      await fetchCommissions(commissionPage, commissionPageSize);
      setShowDeactivateCommissionModal(false);
      setCommissionToDeactivate(null);
    } catch (error) {
      console.error("Error deactivating commission:", error);
      setError("Failed to deactivate commission");
    } finally {
      setDeactivatingCommission(false);
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

  const handleDeactivateTax = async () => {
    if (!taxToDeactivate) return;
    setDeactivatingTax(true);
    try {
      await commissionTaxService.deactivateTax(taxToDeactivate);
      await fetchTaxes();
      setShowDeactivateTaxModal(false);
      setTaxToDeactivate(null);
    } catch (error) {
      console.error("Error deactivating tax:", error);
      setError("Failed to deactivate tax");
    } finally {
      setDeactivatingTax(false);
    }
  };

  const handleCreateServiceFee = async (data: CreateServiceFeeRequest) => {
    try {
      await commissionTaxService.createServiceFee(data);
      await fetchServiceFees();
    } catch (error) {
      throw error;
    }
  };

  const handleDeactivateServiceFee = async () => {
    if (!serviceFeeToDeactivate) return;
    setDeactivatingServiceFee(true);
    try {
      await commissionTaxService.deactivateServiceFee(serviceFeeToDeactivate);
      await fetchServiceFees();
      setShowDeactivateServiceFeeModal(false);
      setServiceFeeToDeactivate(null);
    } catch (error) {
      console.error("Error deactivating service fee:", error);
      setError("Failed to deactivate service fee");
    } finally {
      setDeactivatingServiceFee(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden">
    <div className="mx-auto flex h-full w-full max-w-7xl min-h-0 flex-1 flex-col px-4 py-3 sm:px-6 lg:px-8">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AdminCommissionTab)}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <TabsList className="inline-flex h-auto w-full shrink-0 flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
          {COMMISSION_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            const styles = COMMISSION_TAB_STYLES[tab.value];
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "group gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                  isActive ? styles.active : styles.idle,
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? styles.iconActive : styles.iconIdle,
                  )}
                  strokeWidth={2.25}
                />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="otaCommission" className="mt-0 flex min-h-0 flex-1 flex-col">
          {tabLoading ? (
            <CommissionTabLoader theme="blue" />
          ) : (
          <CommissionRulesPanel
            title="OTA Commission Rules"
            addLabel="Add OTA Commission"
            emptyTitle="No OTA commissions yet"
            emptyDescription="Create your first OTA commission rule to get started"
            searchPlaceholder="Search OTA commissions..."
            commissions={otaCommissions}
            filteredCommissions={filteredOtaCommissions}
            commissionSearch={otaCommissionSearch}
            onSearchChange={setOtaCommissionSearch}
            onAdd={() => {
              setEditingCommission(null);
              setShowCommissionModal(true);
            }}
            error={error}
            isLoading={isLoading}
            commissionPage={commissionPage}
            commissionPageSize={commissionPageSize}
            commissionTotal={commissionTotal}
            commissionTotalPages={commissionTotalPages}
            commissionHasNext={commissionHasNext}
            commissionHasPrevious={commissionHasPrevious}
            onPageSizeChange={(size) => {
              setCommissionPageSize(size);
              setCommissionPage(0);
            }}
            onPrevious={() => setCommissionPage((prev) => Math.max(0, prev - 1))}
            onNext={() => setCommissionPage((prev) => prev + 1)}
            onDeactivate={(id) => {
              setCommissionToDeactivate(id);
              setShowDeactivateCommissionModal(true);
            }}
            statusFilter={otaStatusFilter}
            onStatusFilterChange={(value) => {
              setCommissionPage(0);
              setOtaStatusFilter(value);
            }}
            activeCount={otaStatusFilter === "active" ? commissionTotal : undefined}
            inactiveCount={
              otaStatusFilter === "inactive" ? commissionTotal : undefined
            }
            statusFilteredCount={otaStatusFiltered.length}
          />
          )}
        </TabsContent>

        <TabsContent value="agencyCommission" className="mt-0 flex min-h-0 flex-1 flex-col">
          {tabLoading ? (
            <CommissionTabLoader theme="violet" />
          ) : (
          <AgencyIncentiveRulesPanel
            incentives={agentIncentives}
            filteredIncentives={filteredAgentIncentives}
            statusFilteredCount={agencyStatusFiltered.length}
            search={agencyCommissionSearch}
            onSearchChange={setAgencyCommissionSearch}
            statusFilter={agencyStatusFilter}
            onStatusFilterChange={(value) => {
              setAgentIncentivePage(0);
              setAgencyStatusFilter(value);
            }}
            activeCount={
              agencyStatusFilter === "active" ? agentIncentiveTotal : undefined
            }
            inactiveCount={
              agencyStatusFilter === "inactive" ? agentIncentiveTotal : undefined
            }
            onAdd={() => setShowAgencyIncentiveModal(true)}
            error={error}
            isLoading={isLoading}
            page={agentIncentivePage}
            pageSize={agentIncentivePageSize}
            total={agentIncentiveTotal}
            totalPages={agentIncentiveTotalPages}
            hasNext={agentIncentiveHasNext}
            hasPrevious={agentIncentiveHasPrevious}
            onPageSizeChange={(size) => {
              setAgentIncentivePageSize(size);
              setAgentIncentivePage(0);
            }}
            onPrevious={() =>
              setAgentIncentivePage((prev) => Math.max(0, prev - 1))
            }
            onNext={() => setAgentIncentivePage((prev) => prev + 1)}
            onDeactivate={(id) => {
              setAgentIncentiveToDeactivate(id);
              setShowDeactivateAgentIncentiveModal(true);
            }}
          />
          )}
        </TabsContent>

        <TabsContent value="tax" className="mt-0 flex min-h-0 flex-1 flex-col">
          {tabLoading ? (
            <CommissionTabLoader theme="green" />
          ) : (
          <CommissionPanelBody theme="green">
              {error && (
                <div className="mb-2 flex shrink-0 items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <CommissionFilterBar>
                <CommissionSearchInput
                  value={taxSearch}
                  onChange={setTaxSearch}
                  placeholder="Search taxes..."
                />
                <div className="flex shrink-0 items-center gap-2">
                  <span className="whitespace-nowrap text-xs font-medium text-gray-700">State</span>
                  <select
                    value={taxStateFilter}
                    onChange={(e) => setTaxStateFilter(e.target.value)}
                    className="min-w-[140px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/20"
                  >
                    <option value="">All states</option>
                    {taxStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowTaxModal(true)}
                  className="ml-auto shrink-0 gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Tax
                </Button>
              </CommissionFilterBar>
              {taxes.length === 0 ? (
                <CommissionEmptyState
                  icon={Receipt}
                  title="No taxes yet"
                  description="Create your first tax rule to get started"
                  action={
                    <Button variant="primary" onClick={() => setShowTaxModal(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Tax
                    </Button>
                  }
                />
              ) : (
                <CommissionTableWrap>
                  <table className="w-full">
                    <CommissionTableHead>
                      <tr>
                        <CommissionTh>
                          <CommissionTableHeader icon={Hash} label="ID" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={Receipt} label="Tax Type" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={Percent} label="Percentage" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={MapPin} label="State Code" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={IndianRupee} label="Min Amount" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={IndianRupee} label="Max Amount" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={Calendar} label="Effective From" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={CheckCircle2} label="Status" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={Edit} label="Actions" />
                        </CommissionTh>
                      </tr>
                    </CommissionTableHead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredTaxes.map((tax) => {
                          let effectiveDate = "N/A";
                          try {
                            if (tax.effectiveFrom) {
                              // Handle both date formats: "2026-01-23" and ISO strings
                              const date = new Date(tax.effectiveFrom);
                              if (!isNaN(date.getTime())) {
                                effectiveDate = date.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                });
                              }
                            }
                          } catch (error) {
                            effectiveDate = "N/A";
                          }
                          return (
                            <tr
                              key={tax.id}
                              className="transition-colors even:bg-slate-50/60 hover:bg-emerald-50/50"
                            >
                              <td className="whitespace-nowrap px-3 py-2 first:pl-4">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <CommissionCellChip icon={Hash} theme="slate" />
                                  <span className="font-medium" title={tax.id}>
                                    {typeof tax.id === "string" && tax.id.length > 8
                                      ? `${tax.id.substring(0, 8)}...`
                                      : tax.id}
                                  </span>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <CommissionCellChip icon={Receipt} theme="green" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {tax.taxType}
                                  </span>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                  <CommissionCellChip icon={Percent} theme="cyan" />
                                  {tax.percentage}%
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <CommissionCellChip icon={MapPin} theme="blue" />
                                  {tax.stateCode || "N/A"}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                                {tax.minAmount !== null && tax.minAmount !== undefined
                                  ? `₹${tax.minAmount.toFixed(2)}`
                                  : "N/A"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                                {tax.maxAmount !== null && tax.maxAmount !== undefined
                                  ? `₹${tax.maxAmount.toFixed(2)}`
                                  : "N/A"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <CommissionCellChip icon={Calendar} theme="amber" />
                                  {effectiveDate}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                <StatusBadge active={tax.active} />
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 last:pr-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!tax.active}
                                  onClick={() => {
                                    setTaxToDeactivate(tax.id);
                                    setShowDeactivateTaxModal(true);
                                  }}
                                  className="border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                >
                                  Deactivate
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                </CommissionTableWrap>
              )}
          </CommissionPanelBody>
          )}
        </TabsContent>

        <TabsContent value="serviceFee" className="mt-0 flex min-h-0 flex-1 flex-col">
          {tabLoading ? (
            <CommissionTabLoader theme="purple" />
          ) : (
          <CommissionPanelBody theme="purple">
              {error && (
                <div className="mb-2 flex shrink-0 items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <CommissionFilterBar>
                <ListStatusFilterTabs
                  value={serviceFeeStatusFilter}
                  onChange={setServiceFeeStatusFilter}
                  activeCount={serviceFeeActiveCount}
                  inactiveCount={serviceFeeInactiveCount}
                />
                <CommissionSearchInput
                  value={serviceFeeSearch}
                  onChange={setServiceFeeSearch}
                  placeholder="Search service fees..."
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowServiceFeeModal(true)}
                  className="ml-auto shrink-0 gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Service Fee
                </Button>
              </CommissionFilterBar>
              {serviceFees.length === 0 ? (
                <CommissionEmptyState
                  icon={IndianRupee}
                  title="No service fees yet"
                  description="Create your first service fee rule"
                  action={
                    <Button variant="primary" onClick={() => setShowServiceFeeModal(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Service Fee
                    </Button>
                  }
                />
              ) : serviceFeeStatusFiltered.length === 0 ? (
                <CommissionEmptyState
                  icon={IndianRupee}
                  title={`No ${serviceFeeStatusFilter === "active" ? "active" : "inactive"} service fee rules`}
                  description={`Switch to ${serviceFeeStatusFilter === "active" ? "Inactive" : "Active"} to view other rules.`}
                />
              ) : filteredServiceFees.length === 0 ? (
                <CommissionEmptyState
                  icon={Search}
                  title="No matching rules"
                  description="Try a different search term."
                />
              ) : (
                <CommissionTableWrap>
                  <table className="w-full">
                    <CommissionTableHead>
                      <tr>
                        <CommissionTh>
                          <CommissionTableHeader icon={Globe} label="Scope" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={MapPin} label="Scope Value" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={Percent} label="Type" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={IndianRupee} label="Fee" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={Receipt} label="GST" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={Calendar} label="Effective From" />
                        </CommissionTh>
                        <CommissionTh>
                          <CommissionTableHeader icon={CheckCircle2} label="Status" />
                        </CommissionTh>
                        {serviceFeeStatusFilter === "active" && (
                          <CommissionTh>
                            <CommissionTableHeader icon={Edit} label="Actions" />
                          </CommissionTh>
                        )}
                      </tr>
                    </CommissionTableHead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredServiceFees.map((fee) => (
                        <tr
                          key={fee.id}
                          className="transition-colors even:bg-slate-50/60 hover:bg-purple-50/50"
                        >
                          <td className="px-3 py-2 text-sm font-medium text-gray-900 first:pl-4">
                            <div className="flex items-center gap-2">
                              <CommissionCellChip icon={Globe} theme="purple" />
                              {fee.scope}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">{fee.scopeValue || "N/A"}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{fee.calculationType}</td>
                          <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                            {fee.calculationType === "PERCENTAGE"
                              ? `${fee.feeValue}%`
                              : `₹${Number(fee.feeValue).toFixed(2)}`}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {fee.gstApplicable ? `${fee.gstRate}%` : "Not Applicable"}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {fee.effectiveFrom
                              ? new Date(fee.effectiveFrom).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </td>
                          <td
                            className={cn(
                              "whitespace-nowrap px-3 py-2",
                              serviceFeeStatusFilter !== "active" && "last:pr-4",
                            )}
                          >
                            <StatusBadge active={fee.active ?? true} />
                          </td>
                          {serviceFeeStatusFilter === "active" && (
                            <td className="whitespace-nowrap px-3 py-2 last:pr-4">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={fee.active === false}
                                onClick={() => {
                                  setServiceFeeToDeactivate(fee.id);
                                  setShowDeactivateServiceFeeModal(true);
                                }}
                                className="border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              >
                                Deactivate
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CommissionTableWrap>
              )}
          </CommissionPanelBody>
          )}
        </TabsContent>
      </Tabs>

      {/* Commission Modal */}
      <CommissionFormModal
        isOpen={showCommissionModal}
        onClose={() => setShowCommissionModal(false)}
        onSubmit={handleCreateCommission}
        commission={editingCommission}
        mode={editingCommission ? "edit" : "create"}
      />

      <AgencyIncentiveFormModal
        isOpen={showAgencyIncentiveModal}
        onClose={() => setShowAgencyIncentiveModal(false)}
        onSubmit={handleCreateAgentIncentive}
      />

      {/* Tax Modal */}
      <TaxFormModal
        isOpen={showTaxModal}
        onClose={() => setShowTaxModal(false)}
        onSubmit={handleCreateTax}
        mode="create"
      />

      <ServiceFeeFormModal
        isOpen={showServiceFeeModal}
        onClose={() => setShowServiceFeeModal(false)}
        onSubmit={handleCreateServiceFee}
      />

      {showDeactivateAgentIncentiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Deactivate Agency Commission
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Are you sure you want to deactivate this agency commission rule?
              </p>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (deactivatingAgentIncentive) return;
                  setShowDeactivateAgentIncentiveModal(false);
                  setAgentIncentiveToDeactivate(null);
                }}
                disabled={deactivatingAgentIncentive}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeactivateAgentIncentive}
                disabled={deactivatingAgentIncentive}
                isLoading={deactivatingAgentIncentive}
                className="bg-rose-700 hover:bg-rose-800 text-white border-0"
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeactivateCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Deactivate Commission
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Are you sure you want to deactivate this commission?
              </p>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (deactivatingCommission) return;
                  setShowDeactivateCommissionModal(false);
                  setCommissionToDeactivate(null);
                }}
                disabled={deactivatingCommission}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeactivateCommission}
                disabled={deactivatingCommission}
                isLoading={deactivatingCommission}
                className="bg-rose-700 hover:bg-rose-800 text-white border-0"
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeactivateTaxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Deactivate Tax</h3>
              <p className="text-sm text-gray-600 mt-1">
                Are you sure you want to deactivate this tax rule?
              </p>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (deactivatingTax) return;
                  setShowDeactivateTaxModal(false);
                  setTaxToDeactivate(null);
                }}
                disabled={deactivatingTax}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeactivateTax}
                disabled={deactivatingTax}
                isLoading={deactivatingTax}
                className="bg-rose-700 hover:bg-rose-800 text-white border-0"
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeactivateServiceFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Deactivate Service Fee</h3>
              <p className="text-sm text-gray-600 mt-1">
                Are you sure you want to deactivate this service fee rule?
              </p>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (deactivatingServiceFee) return;
                  setShowDeactivateServiceFeeModal(false);
                  setServiceFeeToDeactivate(null);
                }}
                disabled={deactivatingServiceFee}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeactivateServiceFee}
                disabled={deactivatingServiceFee}
                isLoading={deactivatingServiceFee}
                className="bg-rose-700 hover:bg-rose-800 text-white border-0"
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

