import { useState } from "react";
import { useFormContext } from "../../context/useFormContext";
import { updatePolicy } from "../../state/actionCreators";
import {
  Users,
  CreditCard,
  Ban,
  Dog,
  Building2,
  Baby,
  Bed,
  Zap,
  UtensilsCrossed,
  ChevronUp,
  ChevronDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui";
import type { PoliciesInfo, Errors } from "../../types";
import { useOutletContext } from "react-router";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  rulesCount: number;
  maxRules: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection = ({
  title,
  icon,
  rulesCount,
  maxRules,
  isExpanded,
  onToggle,
  children,
}: CollapsibleSectionProps) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-purple-600">{icon}</div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <span
              className={cn(
                "text-xs font-medium",
                rulesCount === 0 ? "text-red-600" : "text-green-600"
              )}
            >
              {rulesCount}/{maxRules} RULES ADDED
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-6 py-4 border-t border-gray-200">{children}</div>
      )}
    </div>
  );
};

interface RadioQuestionProps {
  question: string;
  value: string | boolean | undefined;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
  defaultOptions?: boolean;
}

const RadioQuestion = ({
  question,
  value,
  onChange,
  options,
}: RadioQuestionProps) => {
  const standardOptions = [
    { value: "no", label: "No" },
    { value: "yes", label: "Yes" },
  ];

  const displayOptions = options || standardOptions;
  const currentValue =
    typeof value === "boolean" ? (value ? "yes" : "no") : value || "";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{question}</p>
      <div className="flex gap-4">
        {displayOptions.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name={question}
              value={option.value}
              checked={currentValue === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const TIME_OPTIONS = [
  { value: "00:00", label: "12:00 am (midnight)" },
  { value: "01:00", label: "1:00 am" },
  { value: "02:00", label: "2:00 am" },
  { value: "03:00", label: "3:00 am" },
  { value: "04:00", label: "4:00 am" },
  { value: "05:00", label: "5:00 am" },
  { value: "06:00", label: "6:00 am" },
  { value: "07:00", label: "7:00 am" },
  { value: "08:00", label: "8:00 am" },
  { value: "09:00", label: "9:00 am" },
  { value: "10:00", label: "10:00 am" },
  { value: "11:00", label: "11:00 am" },
  { value: "12:00", label: "12:00 pm (noon)" },
  { value: "13:00", label: "1:00 pm" },
  { value: "14:00", label: "2:00 pm" },
  { value: "15:00", label: "3:00 pm" },
  { value: "16:00", label: "4:00 pm" },
  { value: "17:00", label: "5:00 pm" },
  { value: "18:00", label: "6:00 pm" },
  { value: "19:00", label: "7:00 pm" },
  { value: "20:00", label: "8:00 pm" },
  { value: "21:00", label: "9:00 pm" },
  { value: "22:00", label: "10:00 pm" },
  { value: "23:00", label: "11:00 pm" },
];

const CANCELLATION_POLICIES = [
  {
    value: "free_till_checkin",
    label: "Free Cancellation till check-in",
    recommended: true,
  },
  {
    value: "free_24h",
    label: "Free Cancellation till 24 hours before check-in",
  },
  {
    value: "free_48h",
    label: "Free Cancellation till 48 hours before check-in",
  },
  {
    value: "free_72h",
    label: "Free Cancellation till 72 hours before check-in",
  },
  { value: "free_7d", label: "Free Cancellation till 7 days before check-in" },
  { value: "non_refundable", label: "Non-Refundable" },
];

const IDENTITY_PROOFS = [
  { value: "aadhar", label: "Aadhar Card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "pan_card", label: "PAN Card" },
];

export function PoliciesStep() {
  const { errors: errorsFromContext, resetFieldError } = useOutletContext<{
    errors: Errors;
    resetFieldError: (step: keyof Errors, field: keyof PoliciesInfo) => void;
  }>();
  const errors = errorsFromContext.policiesInfo as Partial<Record<keyof PoliciesInfo, string>> | undefined;
  
  const { formDataState, setFormDataState } = useFormContext();
  const policiesData = formDataState.policiesInfo || {};

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    guestProfile: true,
    identityProofs: true,
    propertyRestrictions: true,
    petPolicy: true,
    checkinCheckout: true,
    infantPolicy: true,
    extraBedInclusion: true,
    extraBedPolicies: true,
    customPolicy: true,
    mealPrices: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleUpdatePolicy = (
    key: keyof PoliciesInfo,
    value: string | boolean | string[] | undefined
  ) => {
    setFormDataState(updatePolicy(key, value));
    // Clear error when field is updated
    if (resetFieldError && errors?.[key]) {
      resetFieldError("policiesInfo", key);
    }
  };

  // Count rules for each section
  const countRules = (keys: (keyof typeof policiesData)[]) => {
    return keys.filter((key) => {
      const value = policiesData[key];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== "";
    }).length;
  };

  const guestProfileCount = countRules([
    "allowUnmarriedCouples",
    "allowGuestsBelow18",
    "allowMaleOnlyGroups",
  ] as (keyof typeof policiesData)[]);

  const identityProofsCount = countRules([
    "acceptableIdentityProofs",
  ] as (keyof typeof policiesData)[]);

  const propertyRestrictionsCount = countRules([
    "smokingAllowed",
    "privatePartiesAllowed",
    "outsideVisitorsAllowed",
    "wheelchairAccessible",
  ] as (keyof typeof policiesData)[]);

  const petPolicyCount = countRules([
    "petsAllowed",
    "petsOnProperty",
  ] as (keyof typeof policiesData)[]);

  const checkinCheckoutCount = countRules([
    "has24HourCheckin",
  ] as (keyof typeof policiesData)[]);

  const infantPolicyCount = countRules([
    "includeInfantWithoutOccupancy",
    "provideInfantFood",
  ] as (keyof typeof policiesData)[]);

  const extraBedInclusionCount = countRules([
    "extraBedIncludedInRates",
  ] as (keyof typeof policiesData)[]);

  const extraBedPoliciesCount = countRules([
    "bedToExtraAdults",
    "bedToExtraKids",
  ] as (keyof typeof policiesData)[]);

  const customPolicyCount = countRules([
    "customPolicy",
  ] as (keyof typeof policiesData)[]);

  const mealPricesCount = countRules([
    "breakfastPrice",
    "lunchPrice",
    "dinnerPrice",
  ] as (keyof typeof policiesData)[]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Check-in & Check-out Time */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Check-in & Check-out Time
          </h2>
          <p className="text-sm text-gray-600">
            Specify the check-in & check-out time at your property
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Select
              label="Check-in Time"
              options={TIME_OPTIONS}
              value={policiesData.checkinTime || "12:00"}
              onChange={(e) =>
                handleUpdatePolicy("checkinTime", e.target.value)
              }
              error={errors?.checkinTime}
            />
          </div>
          <div>
            <Select
              label="Check-out Time"
              options={TIME_OPTIONS}
              value={policiesData.checkoutTime || "12:00"}
              onChange={(e) =>
                handleUpdatePolicy("checkoutTime", e.target.value)
              }
              error={errors?.checkoutTime}
            />
          </div>
        </div>
      </div>

      {/* Cancellation Policy */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Cancellation Policy
          </h2>
          <p className="text-sm text-gray-600">
            Offering a flexible cancellation policy helps traveller book in
            advance.
          </p>
        </div>
        <div className="space-y-3">
          {CANCELLATION_POLICIES.map((policy) => (
            <label
              key={policy.value}
              className={cn(
                "flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors",
                errors?.cancellationPolicy
                  ? "border-red-500 bg-red-50/50"
                  : "border-gray-200"
              )}
            >
              <input
                type="radio"
                name="cancellationPolicy"
                value={policy.value}
                checked={
                  policy.value ===
                  (policiesData.cancellationPolicy || "free_till_checkin")
                }
                onChange={(e) =>
                  handleUpdatePolicy("cancellationPolicy", e.target.value)
                }
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex-1 text-sm font-medium text-gray-900">
                {policy.label}
              </span>
              {policy.recommended && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                  RECOMMENDED
                </span>
              )}
            </label>
          ))}
        </div>
        {errors?.cancellationPolicy && (
          <p className="mt-2 text-sm text-red-600">{errors.cancellationPolicy}</p>
        )}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Selected policy would be applicable to 1 rateplan created. You can
            modify this policy after completing the listing.
          </p>
        </div>
      </div>

      {/* Property Rules */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Property Rules (optional)
          </h2>
          <p className="text-sm text-gray-600">
            Add property rules basis the requirement of your property listing
          </p>
        </div>

        <div className="space-y-4">
          {/* Guest Profile */}
          <CollapsibleSection
            title="Guest Profile"
            icon={<Users className="w-5 h-5" />}
            rulesCount={guestProfileCount}
            maxRules={3}
            isExpanded={expandedSections.guestProfile}
            onToggle={() => toggleSection("guestProfile")}
          >
            <div className="space-y-6">
              <RadioQuestion
                question="Do you allow unmarried couples?"
                value={policiesData.allowUnmarriedCouples}
                onChange={(value) =>
                  handleUpdatePolicy("allowUnmarriedCouples", value === "yes")
                }
              />
              <RadioQuestion
                question="Do you allow guests below 18 years of age at your property?"
                value={policiesData.allowGuestsBelow18}
                onChange={(value) =>
                  handleUpdatePolicy("allowGuestsBelow18", value === "yes")
                }
              />
              <RadioQuestion
                question="Groups with only male guests are allowed at your property?"
                value={policiesData.allowMaleOnlyGroups}
                onChange={(value) =>
                  handleUpdatePolicy("allowMaleOnlyGroups", value === "yes")
                }
              />
            </div>
          </CollapsibleSection>

          {/* Acceptable Identity Proofs */}
          <CollapsibleSection
            title="Acceptable Identity Proofs"
            icon={<CreditCard className="w-5 h-5" />}
            rulesCount={identityProofsCount}
            maxRules={5}
            isExpanded={expandedSections.identityProofs}
            onToggle={() => toggleSection("identityProofs")}
          >
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Select acceptable identity proofs
              </p>
              <div className="space-y-2">
                {IDENTITY_PROOFS.map((proof) => {
                  const currentProofs =
                    policiesData.acceptableIdentityProofs || [];
                  const isSelected = currentProofs.includes(proof.value);
                  return (
                    <label
                      key={proof.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newProofs = e.target.checked
                            ? [...currentProofs, proof.value]
                            : currentProofs.filter((p) => p !== proof.value);
                          handleUpdatePolicy(
                            "acceptableIdentityProofs",
                            newProofs
                          );
                        }}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {proof.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </CollapsibleSection>

          {/* Property Restrictions */}
          <CollapsibleSection
            title="Property Restrictions"
            icon={<Ban className="w-5 h-5" />}
            rulesCount={propertyRestrictionsCount}
            maxRules={4}
            isExpanded={expandedSections.propertyRestrictions}
            onToggle={() => toggleSection("propertyRestrictions")}
          >
            <div className="space-y-6">
              <RadioQuestion
                question="Is smoking allowed anywhere within the premises? (Select 'No' if it's not permitted, even in outdoor spaces like balconies or lawns, or any designated smoking area)"
                value={policiesData.smokingAllowed}
                onChange={(value) =>
                  handleUpdatePolicy("smokingAllowed", value === "yes")
                }
              />
              <RadioQuestion
                question="Are Private parties or events allowed at the property?"
                value={policiesData.privatePartiesAllowed}
                onChange={(value) =>
                  handleUpdatePolicy("privatePartiesAllowed", value === "yes")
                }
              />
              <RadioQuestion
                question="Can guests invite any outside visitors in the room during their stay?"
                value={policiesData.outsideVisitorsAllowed}
                onChange={(value) =>
                  handleUpdatePolicy("outsideVisitorsAllowed", value === "yes")
                }
              />
              <RadioQuestion
                question="Is your property accessible for guests who use a wheelchair?"
                value={policiesData.wheelchairAccessible}
                onChange={(value) =>
                  handleUpdatePolicy("wheelchairAccessible", value === "yes")
                }
              />
            </div>
          </CollapsibleSection>

          {/* Pet Policy */}
          <CollapsibleSection
            title="Pet Policy"
            icon={<Dog className="w-5 h-5" />}
            rulesCount={petPolicyCount}
            maxRules={2}
            isExpanded={expandedSections.petPolicy}
            onToggle={() => toggleSection("petPolicy")}
          >
            <div className="space-y-6">
              <RadioQuestion
                question="Are Pets Allowed?"
                value={policiesData.petsAllowed}
                onChange={(value) =>
                  handleUpdatePolicy("petsAllowed", value === "yes")
                }
              />
              <RadioQuestion
                question="Any Pet(s) living on the property?"
                value={policiesData.petsOnProperty}
                onChange={(value) =>
                  handleUpdatePolicy("petsOnProperty", value === "yes")
                }
              />
            </div>
          </CollapsibleSection>

          {/* Checkin and Checkout Policies */}
          <CollapsibleSection
            title="Checkin and Checkout Policies"
            icon={<Building2 className="w-5 h-5" />}
            rulesCount={checkinCheckoutCount}
            maxRules={1}
            isExpanded={expandedSections.checkinCheckout}
            onToggle={() => toggleSection("checkinCheckout")}
          >
            <div>
              <RadioQuestion
                question="Do you have a 24-hour check-in?"
                value={policiesData.has24HourCheckin}
                onChange={(value) =>
                  handleUpdatePolicy("has24HourCheckin", value === "yes")
                }
              />
            </div>
          </CollapsibleSection>

          {/* Infant Policy */}
          <CollapsibleSection
            title="Infant Policy"
            icon={<Baby className="w-5 h-5" />}
            rulesCount={infantPolicyCount}
            maxRules={2}
            isExpanded={expandedSections.infantPolicy}
            onToggle={() => toggleSection("infantPolicy")}
          >
            <div className="space-y-6">
              <RadioQuestion
                question="Do you want to include 1 infant (0-2 yrs) per room without counting them in total room occupancy?"
                value={policiesData.includeInfantWithoutOccupancy}
                onChange={(value) =>
                  handleUpdatePolicy(
                    "includeInfantWithoutOccupancy",
                    value === "yes"
                  )
                }
              />
              <RadioQuestion
                question="Do you provide complimentary food item(s) like warm milk for infants (0-2 yrs) on request?"
                value={policiesData.provideInfantFood}
                onChange={(value) =>
                  handleUpdatePolicy("provideInfantFood", value === "yes")
                }
              />
            </div>
          </CollapsibleSection>

          {/* Extra Bed Inclusion Policy */}
          <CollapsibleSection
            title="Extra Bed Inclusion Policy"
            icon={<Bed className="w-5 h-5" />}
            rulesCount={extraBedInclusionCount}
            maxRules={1}
            isExpanded={expandedSections.extraBedInclusion}
            onToggle={() => toggleSection("extraBedInclusion")}
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This confirms whether extra bed/mattress is included in the
                extra adult/paid child rates defined for each rate plan
              </p>
              <RadioQuestion
                question="Is extra bed/mattress included in extra adult/paid child rates?"
                value={policiesData.extraBedIncludedInRates}
                onChange={(value) =>
                  handleUpdatePolicy("extraBedIncludedInRates", value === "yes")
                }
              />
            </div>
          </CollapsibleSection>

          {/* Extra Bed Policies */}
          <CollapsibleSection
            title="Extra Bed Policies"
            icon={<Bed className="w-5 h-5" />}
            rulesCount={extraBedPoliciesCount}
            maxRules={2}
            isExpanded={expandedSections.extraBedPolicies}
            onToggle={() => toggleSection("extraBedPolicies")}
          >
            <div className="space-y-6">
              <RadioQuestion
                question="Do you provide bed to extra adults?"
                value={policiesData.bedToExtraAdults}
                onChange={(value) =>
                  handleUpdatePolicy("bedToExtraAdults", value)
                }
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Yes" },
                  {
                    value: "subject_to_availability",
                    label: "Subject to availability",
                  },
                ]}
              />
              <RadioQuestion
                question="Do you provide bed to extra kids?"
                value={policiesData.bedToExtraKids}
                onChange={(value) =>
                  handleUpdatePolicy("bedToExtraKids", value)
                }
                options={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Yes" },
                  {
                    value: "subject_to_availability",
                    label: "Subject to availability",
                  },
                ]}
              />
            </div>
          </CollapsibleSection>

          {/* Custom Policy */}
          <CollapsibleSection
            title="Custom Policy"
            icon={<Zap className="w-5 h-5" />}
            rulesCount={customPolicyCount}
            maxRules={1}
            isExpanded={expandedSections.customPolicy}
            onToggle={() => toggleSection("customPolicy")}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Policy
              </label>
              <textarea
                value={policiesData.customPolicy || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 3000) {
                    handleUpdatePolicy("customPolicy", value);
                  }
                }}
                placeholder="Please add details"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="mt-2 text-xs text-gray-500 text-right">
                {(policiesData.customPolicy || "").length} of 3000
              </p>
            </div>
          </CollapsibleSection>

          {/* Meal rack prices */}
          <CollapsibleSection
            title="Meal rack prices"
            icon={<UtensilsCrossed className="w-5 h-5" />}
            rulesCount={mealPricesCount}
            maxRules={3}
            isExpanded={expandedSections.mealPrices}
            onToggle={() => toggleSection("mealPrices")}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Breakfast
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="Enter"
                    value={policiesData.breakfastPrice || ""}
                    onChange={(e) =>
                      handleUpdatePolicy("breakfastPrice", e.target.value)
                    }
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lunch
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="Enter"
                    value={policiesData.lunchPrice || ""}
                    onChange={(e) =>
                      handleUpdatePolicy("lunchPrice", e.target.value)
                    }
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dinner
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="Enter"
                    value={policiesData.dinnerPrice || ""}
                    onChange={(e) =>
                      handleUpdatePolicy("dinnerPrice", e.target.value)
                    }
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
