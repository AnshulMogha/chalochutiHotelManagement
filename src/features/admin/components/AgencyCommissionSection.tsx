import { useState, useEffect } from "react";
import {
  agentIncentiveService,
  incentiveSourceForCategory,
  type AgentIncentive,
  type AgentIncentiveConfigRequest,
  type AgentAgencyTier,
  type IncentiveCategory,
  type IncentiveType,
} from "../services/agentIncentiveService";
import { cn } from "@/lib/utils";
import {
  Button,
  Input,
  Select,
} from "@/components/ui";
import {
  ListStatusFilterTabs,
  type ListStatusFilterValue,
} from "./ListStatusFilter";
import {
  CommissionCellChip,
  CommissionEmptyState,
  CommissionFilterBar,
  CommissionPanelBody,
  CommissionPaginationFooter,
  CommissionSearchInput,
  CommissionTableHead,
  CommissionTableHeader,
  CommissionTableWrap,
  CommissionTh,
} from "./commissionTaxUi";
import {
  Plus,
  X,
  Percent,
  IndianRupee,
  Calendar,
  AlertCircle,
  Search,
  Hash,
  Building2,
  Edit,
  CheckCircle2,
} from "lucide-react";

const AGENCY_TIER_OPTIONS = [
  { value: "DIAMOND", label: "Diamond" },
  { value: "PLATINUM", label: "Platinum" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
  { value: "BRONZE", label: "Bronze" },
];

const INCENTIVE_CATEGORY_OPTIONS = [
  { value: "HOTEL", label: "Hotel booking" },
  { value: "PACKAGE", label: "Package booking" },
];

const INCENTIVE_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FLAT", label: "Flat" },
];

const CATEGORY_LABELS: Record<IncentiveCategory, string> = {
  HOTEL: "Hotel booking",
  PACKAGE: "Package booking",
};

const SOURCE_LABELS = {
  OTA_COMMISSION: "OTA commission",
  PACKAGE_MARKUP: "Package markup",
} as const;

function matchesIncentiveSearch(incentive: AgentIncentive, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  return [
    incentive.id,
    incentive.agencyTier,
    incentive.incentiveCategory,
    incentive.incentiveSource,
    incentive.incentiveType,
    String(incentive.incentiveValue),
    incentive.effectiveFrom,
    incentive.effectiveTo ?? "",
  ].some((v) => String(v).toLowerCase().includes(q));
}

function StatusBadge({ active }: { active?: boolean | null }) {
  const isActive = active !== false;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

interface AgencyIncentiveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgentIncentiveConfigRequest) => Promise<void>;
}

export function AgencyIncentiveFormModal({
  isOpen,
  onClose,
  onSubmit,
}: AgencyIncentiveFormModalProps) {
  const [formData, setFormData] = useState({
    agencyTier: "GOLD" as AgentAgencyTier,
    incentiveCategory: "HOTEL" as IncentiveCategory,
    incentiveType: "PERCENTAGE" as IncentiveType,
    incentiveValue: 0,
    effectiveFrom: "",
    effectiveTo: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Raw string for the incentive value input so the user can clear/edit freely
  // (avoids a forced leading "0").
  const [incentiveValueInput, setIncentiveValueInput] = useState("");
  const todayIso = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      agencyTier: "GOLD",
      incentiveCategory: "HOTEL",
      incentiveType: "PERCENTAGE",
      incentiveValue: 0,
      effectiveFrom: "",
      effectiveTo: "",
    });
    setIncentiveValueInput("");
    setErrors({});
    setApiError(null);
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.agencyTier) newErrors.agencyTier = "Agency tier is required";
    if (!formData.incentiveCategory) {
      newErrors.incentiveCategory = "Booking category is required";
    }
    if (!formData.incentiveType) {
      newErrors.incentiveType = "Incentive type is required";
    }
    if (formData.incentiveValue <= 0) {
      newErrors.incentiveValue = "Incentive value must be greater than 0";
    }
    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = "Effective from date is required";
    } else if (formData.effectiveFrom < todayIso) {
      newErrors.effectiveFrom = "Effective from date cannot be in the past.";
    }
    if (
      formData.effectiveTo &&
      formData.effectiveFrom &&
      formData.effectiveTo < formData.effectiveFrom
    ) {
      newErrors.effectiveTo = "Effective to must be on or after effective from.";
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
      const payload: AgentIncentiveConfigRequest = {
        agencyTier: formData.agencyTier,
        incentiveCategory: formData.incentiveCategory,
        incentiveSource: incentiveSourceForCategory(formData.incentiveCategory),
        incentiveType: formData.incentiveType,
        incentiveValue: formData.incentiveValue,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo.trim() ? formData.effectiveTo : null,
      };
      await onSubmit(payload);
      onClose();
    } catch (error: unknown) {
      console.error("Error submitting agency incentive:", error);
      const err = error as {
        message?: string;
        data?: Record<string, string> | null;
        response?: {
          data?: { message?: string; data?: Record<string, string> };
        };
      };
      const fieldErrors: Record<string, string> =
        (err?.data &&
        typeof err.data === "object" &&
        !Array.isArray(err.data) &&
        err.data !== null
          ? err.data
          : null) ||
        err?.response?.data?.data ||
        {};

      const nextErrors: Record<string, string> = {};
      const fieldKeys = [
        "agencyTier",
        "incentiveCategory",
        "incentiveType",
        "incentiveValue",
        "effectiveFrom",
        "effectiveTo",
      ] as const;
      for (const key of fieldKeys) {
        const msg = fieldErrors[key];
        if (msg) nextErrors[key] = String(msg);
      }
      if (Object.keys(nextErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...nextErrors }));
        setApiError(null);
      } else {
        setApiError(
          err?.message ||
            err?.response?.data?.message ||
            "Failed to save agency commission. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Create Agency Commission
              </h2>
              <p className="text-sm text-gray-600">
                Configure agent incentive for hotel or package bookings
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
              <p className="text-sm text-red-700 flex-1">{apiError}</p>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="text-red-600 hover:text-red-800 shrink-0"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <Select
              label="Agency tier"
              value={formData.agencyTier}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  agencyTier: e.target.value as AgentAgencyTier,
                })
              }
              error={errors.agencyTier}
              options={AGENCY_TIER_OPTIONS}
              required
            />

            <Select
              label="Booking category"
              value={formData.incentiveCategory}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  incentiveCategory: e.target.value as IncentiveCategory,
                })
              }
              error={errors.incentiveCategory}
              options={INCENTIVE_CATEGORY_OPTIONS}
              required
            />

            <p className="sm:col-span-2 -mt-2 text-xs text-gray-500">
              {formData.incentiveCategory === "HOTEL"
                ? "Incentive is calculated as a share of OTA commission on hotel bookings."
                : "Incentive is calculated as a share of package markup on package bookings."}
            </p>

            <Select
              label="Incentive type"
              value={formData.incentiveType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  incentiveType: e.target.value as IncentiveType,
                })
              }
              error={errors.incentiveType}
              options={INCENTIVE_TYPE_OPTIONS}
              required
            />

            <Input
              label={
                formData.incentiveType === "PERCENTAGE"
                  ? "Incentive value (%)"
                  : "Incentive value (₹)"
              }
              type="number"
              step="0.01"
              min="0"
              value={incentiveValueInput}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E") {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const raw = e.target.value;
                // Reject negative values.
                if (raw.includes("-")) return;
                setIncentiveValueInput(raw);
                setFormData({
                  ...formData,
                  incentiveValue: raw === "" ? 0 : parseFloat(raw) || 0,
                });
              }}
              error={errors.incentiveValue}
              required
              icon={
                formData.incentiveType === "PERCENTAGE" ? (
                  <Percent className="w-4 h-4 text-gray-400" />
                ) : (
                  <IndianRupee className="w-4 h-4 text-gray-400" />
                )
              }
            />

            <Input
              label="Effective from"
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

            <Input
              label="Effective to (optional)"
              type="date"
              value={formData.effectiveTo}
              onChange={(e) =>
                setFormData({ ...formData, effectiveTo: e.target.value })
              }
              min={formData.effectiveFrom || todayIso}
              error={errors.effectiveTo}
              icon={<Calendar className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create Agency Commission"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface AgencyIncentiveRulesPanelProps {
  incentives: AgentIncentive[];
  filteredIncentives: AgentIncentive[];
  statusFilteredCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ListStatusFilterValue;
  onStatusFilterChange: (value: ListStatusFilterValue) => void;
  activeCount?: number;
  inactiveCount?: number;
  onAdd: () => void;
  error: string | null;
  isLoading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageSizeChange: (size: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onDeactivate: (id: string) => void;
}

export function AgencyIncentiveRulesPanel({
  incentives,
  filteredIncentives,
  statusFilteredCount,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  activeCount,
  inactiveCount,
  onAdd,
  error,
  isLoading,
  page,
  pageSize,
  total,
  totalPages,
  hasNext,
  hasPrevious,
  onPageSizeChange,
  onPrevious,
  onNext,
  onDeactivate,
}: AgencyIncentiveRulesPanelProps) {
  const showActions = statusFilter === "active";

  return (
    <CommissionPanelBody theme="violet">
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
          value={search}
          onChange={onSearchChange}
          placeholder="Search agency commissions..."
        />
        <Button variant="primary" size="sm" onClick={onAdd} className="ml-auto shrink-0 gap-1.5">
          <Plus className="w-4 h-4" />
          Add Agency Commission
        </Button>
      </CommissionFilterBar>
      {incentives.length === 0 && statusFilter === "active" ? (
        <CommissionEmptyState
          icon={Building2}
          title="No agency commissions yet"
          description="Create agent incentive rules by agency tier and booking category"
          action={
            <Button variant="primary" onClick={onAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Agency Commission
            </Button>
          }
        />
      ) : statusFilteredCount === 0 ? (
        <CommissionEmptyState
          icon={Building2}
          title={`No ${statusFilter === "active" ? "active" : "inactive"} rules`}
          description={`Switch to ${statusFilter === "active" ? "Inactive" : "Active"} to view other rules.`}
        />
      ) : filteredIncentives.length === 0 ? (
        <CommissionEmptyState
          icon={Search}
          title="No matching rules"
          description="Try a different search term."
        />
      ) : (
        <CommissionTableWrap
          footer={
            <CommissionPaginationFooter
              pageLabel={`Showing page ${totalPages === 0 ? 0 : page + 1} of ${totalPages} (${total} total)`}
              pageSize={pageSize}
              onPageSizeChange={onPageSizeChange}
              pageSizeId="agency-incentive-page-size"
              hasPrevious={hasPrevious}
              hasNext={hasNext}
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
                  <CommissionTableHeader icon={Building2} label="Agency tier" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={Percent} label="Category" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={IndianRupee} label="Basis" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={Percent} label="Type" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={IndianRupee} label="Value" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={Calendar} label="Effective from" />
                </CommissionTh>
                <CommissionTh>
                  <CommissionTableHeader icon={Calendar} label="Effective to" />
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
                  {filteredIncentives.map((row) => {
                    let effectiveFrom = "—";
                    let effectiveTo = "—";
                    try {
                      if (row.effectiveFrom) {
                        effectiveFrom = new Date(row.effectiveFrom).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                      }
                      if (row.effectiveTo) {
                        effectiveTo = new Date(row.effectiveTo).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                      }
                    } catch {
                      /* keep defaults */
                    }
                    return (
                      <tr
                        key={row.id}
                        className="transition-colors even:bg-slate-50/60 hover:bg-violet-50/50"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 first:pl-4">
                          <span className="inline-flex items-center gap-2">
                            <CommissionCellChip icon={Hash} theme="slate" />
                            <span className="font-medium" title={row.id}>
                              {row.id.length > 8 ? `${row.id.slice(0, 8)}…` : row.id}
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900">
                          {row.agencyTier}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                          {CATEGORY_LABELS[row.incentiveCategory] ?? row.incentiveCategory}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-600">
                          {SOURCE_LABELS[row.incentiveSource] ?? row.incentiveSource}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                          {row.incentiveType === "PERCENTAGE" ? "Percentage" : "Flat"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm font-semibold text-gray-900">
                          {row.incentiveType === "PERCENTAGE"
                            ? `${row.incentiveValue}%`
                            : `₹${Number(row.incentiveValue).toFixed(2)}`}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                          {effectiveFrom}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-700">
                          {effectiveTo}
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-3 py-2",
                            !showActions && "last:pr-4",
                          )}
                        >
                          <StatusBadge active={row.active} />
                        </td>
                        {showActions && (
                          <td className="whitespace-nowrap px-3 py-2 last:pr-4">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={row.active === false}
                              onClick={() => onDeactivate(row.id)}
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

export { matchesIncentiveSearch };
