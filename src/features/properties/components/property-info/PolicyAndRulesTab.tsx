import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminService,
  type HotelPolicyRecord,
  type HotelPolicyRule,
  type CancellationPolicy,
  type CancellationPolicyPayload,
  type PaymentRule,
  type PaymentRulePayload,
} from "@/features/admin/services/adminService";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  PawPrint,
  Pencil,
  Percent,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  POLICY_TABS,
  PolicyCheckboxGrid,
  PolicyPageLoader,
  PolicySaveBar,
  PolicySectionCard,
  PolicySectionHeader,
  PolicyTimeField,
  PolicyToggleOption,
  BoundedHourSelect,
} from "./policyRulesUi";

interface PolicyAndRulesTabProps {
  hotelId: string;
}

type NumericInput = number | "";

interface PolicyFormState {
  checkinTime: string;
  checkoutTime: string;
  twentyFourHourCheckin: boolean;
  freeCancelBeforeHours: NumericInput;
  breakfastPrice: NumericInput;
  lunchPrice: NumericInput;
  dinnerPrice: NumericInput;
  extraBedAdultAllowed: boolean;
  extraBedChildAllowed: boolean;
  extraBedIncludedInRate: boolean;
  infantAllowedFree: boolean;
  infantComplimentaryFood: boolean;
  petsAllowed: boolean;
  petsLivingOnProperty: boolean;
  smokingAllowed: boolean;
  privatePartiesAllowed: boolean;
  outsideVisitorsAllowed: boolean;
  wheelchairAccessible: boolean;
  unmarriedCouplesAllowed: boolean;
  below18Allowed: boolean;
  onlyMaleGroupAllowed: boolean;
  acceptableIdProofs: string[];
  customPolicyText: string;
}

const DEFAULT_FORM: PolicyFormState = {
  checkinTime: "12:00",
  checkoutTime: "12:00",
  twentyFourHourCheckin: false,
  freeCancelBeforeHours: 0,
  breakfastPrice: "",
  lunchPrice: "",
  dinnerPrice: "",
  extraBedAdultAllowed: false,
  extraBedChildAllowed: false,
  extraBedIncludedInRate: false,
  infantAllowedFree: false,
  infantComplimentaryFood: false,
  petsAllowed: false,
  petsLivingOnProperty: false,
  smokingAllowed: false,
  privatePartiesAllowed: false,
  outsideVisitorsAllowed: true,
  wheelchairAccessible: false,
  unmarriedCouplesAllowed: true,
  below18Allowed: false,
  onlyMaleGroupAllowed: false,
  acceptableIdProofs: [],
  customPolicyText: "",
};

const ID_PROOF_OPTIONS = [
  { value: "AADHAR", label: "Aadhaar Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
];

type SlabPenaltyType = "PERCENTAGE" | "FIXED";
type NoShowPenaltyType = "NONE" | "PERCENTAGE" | "FIXED";

const HOURS_PER_DAY = 24;

const CUSTOM_CONDITION_HOUR_OPTIONS = Array.from(
  { length: 31 },
  (_, day) => day * HOURS_PER_DAY,
);

type RuleDraftState = {
  fromHours: NumericInput;
  toHours: NumericInput;
  penaltyType: SlabPenaltyType;
  penaltyValue: NumericInput;
};

const EMPTY_RULE_DRAFT: RuleDraftState = {
  fromHours: "",
  toHours: "",
  penaltyType: "PERCENTAGE",
  penaltyValue: "",
};

function splitTotalHoursToDaysAndHours(totalHours: number): {
  days: NumericInput;
  hours: NumericInput;
} {
  const safe = Math.max(0, Math.floor(totalHours));
  return {
    days: Math.floor(safe / HOURS_PER_DAY),
    hours: safe % HOURS_PER_DAY,
  };
}

function formatCancellationDuration(totalHours: number): string {
  const { days, hours } = splitTotalHoursToDaysAndHours(totalHours);
  if (days === 0 && hours === 0) return "0 hrs";
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
  return `${parts.join(" ")} (${totalHours} hrs)`;
}

function formatBeforeCheckinLabel(totalHours: number): string {
  if (totalHours === 0) return "check-in";
  const days = Math.floor(totalHours / HOURS_PER_DAY);
  if (days * HOURS_PER_DAY === totalHours) {
    return `${days} day${days === 1 ? "" : "s"} before check-in`;
  }
  return `${formatCancellationDuration(totalHours)} before check-in`;
}

function formatEffectiveDatesDisplay(
  effectiveFrom?: string | null,
  effectiveTo?: string | null,
): string {
  const from = effectiveFrom?.trim();
  const to = effectiveTo?.trim();

  if (!from && !to) return "Not set";
  if (from && to) return `${from} to ${to}`;
  if (from) return `From ${from}`;
  return `Until ${to}`;
}

interface CancellationSlabForm {
  fromHours: number;
  toHours: number;
  penaltyType: SlabPenaltyType;
  penaltyValue: number;
}

function slabsOverlap(
  a: { fromHours: number; toHours: number },
  b: { fromHours: number; toHours: number },
) {
  return a.fromHours < b.toHours && a.toHours > b.fromHours;
}

function findOverlappingSlabIndexes(slabs: CancellationSlabForm[]): number[] {
  for (let i = 0; i < slabs.length; i += 1) {
    for (let j = i + 1; j < slabs.length; j += 1) {
      if (slabsOverlap(slabs[i], slabs[j])) {
        return [i, j];
      }
    }
  }
  return [];
}

interface CancellationFormErrors {
  policyName?: string;
  noShowPenaltyValue?: string;
  slabs?: string;
}

interface RuleDraftErrors {
  fromHours?: string;
  toHours?: string;
  penaltyValue?: string;
  overlap?: string;
}

type CancellationPresetKey =
  | "FREE_TILL_CHECKIN"
  | "FREE_24_HOURS"
  | "FREE_48_HOURS"
  | "FREE_72_HOURS"
  | "NON_REFUNDABLE"
  | "CUSTOM";

const CANCELLATION_PRESET_OPTIONS: {
  key: CancellationPresetKey;
  label: string;
}[] = [
  {
    key: "FREE_TILL_CHECKIN",
    label: "Free cancellation till check-in",
  },
  {
    key: "FREE_24_HOURS",
    label: "Free cancellation till 24 hours before check-in",
  },
  {
    key: "FREE_48_HOURS",
    label: "Free cancellation till 48 hours before check-in",
  },
  {
    key: "FREE_72_HOURS",
    label: "Free cancellation till 72 hours before check-in",
  },
  {
    key: "NON_REFUNDABLE",
    label: "Non-refundable",
  },
  {
    key: "CUSTOM",
    label: "Create a custom cancellation policy",
  },
];

const getCancellationPresetLabel = (preset: CancellationPresetKey) =>
  CANCELLATION_PRESET_OPTIONS.find((option) => option.key === preset)?.label ??
  "Custom cancellation policy";

const normalizeCreationType = (
  value: unknown,
): CancellationPolicy["creationType"] => {
  if (value === "DEFAULT" || value === "CUSTOM") return value;
  if (typeof value === "string") {
    const normalized = value.toUpperCase();
    if (normalized === "DEFAULT" || normalized === "CUSTOM") {
      return normalized;
    }
  }
  return undefined;
};

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return fallback;
};

const toStringValue = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  return fallback;
};

const getRuleValue = (
  record: HotelPolicyRecord | undefined,
  category: string,
  ruleCode: string
) => {
  if (!record?.policies) return undefined;
  return record.policies?.[category]?.find(
    (rule) => rule.ruleCode === ruleCode
  )?.value;
};

const transformPolicyRecord = (
  record: HotelPolicyRecord | undefined
): PolicyFormState => {
  if (!record) return DEFAULT_FORM;

  const policyValue = (category: string, code: string) =>
    getRuleValue(record, category, code);

  return {
    checkinTime:
      (policyValue("CHECKIN_CHECKOUT", "CHECKIN_TIME") as string) ||
      DEFAULT_FORM.checkinTime,
    checkoutTime:
      (policyValue("CHECKIN_CHECKOUT", "CHECKOUT_TIME") as string) ||
      DEFAULT_FORM.checkoutTime,
    twentyFourHourCheckin: toBoolean(
      policyValue("CHECKIN_CHECKOUT", "TWENTY_FOUR_HOUR_CHECKIN"),
      DEFAULT_FORM.twentyFourHourCheckin
    ),
    freeCancelBeforeHours: toNumber(
      policyValue("CANCELLATION", "FREE_CANCEL_BEFORE_HOURS"),
      Number(DEFAULT_FORM.freeCancelBeforeHours) || 0
    ),
    breakfastPrice: toNumber(
      policyValue("MEAL_POLICY", "BREAKFAST_PRICE"),
      0
    ),
    lunchPrice: toNumber(policyValue("MEAL_POLICY", "LUNCH_PRICE"), 0),
    dinnerPrice: toNumber(policyValue("MEAL_POLICY", "DINNER_PRICE"), 0),
    extraBedAdultAllowed: toBoolean(
      policyValue("EXTRA_BED", "EXTRA_BED_ADULT_ALLOWED"),
      DEFAULT_FORM.extraBedAdultAllowed
    ),
    extraBedChildAllowed: toBoolean(
      policyValue("EXTRA_BED", "EXTRA_BED_CHILD_ALLOWED"),
      DEFAULT_FORM.extraBedChildAllowed
    ),
    extraBedIncludedInRate: toBoolean(
      policyValue("EXTRA_BED", "EXTRA_BED_INCLUDED_IN_RATE"),
      DEFAULT_FORM.extraBedIncludedInRate
    ),
    infantAllowedFree: toBoolean(
      policyValue("INFANT_POLICY", "INFANT_ALLOWED_FREE"),
      DEFAULT_FORM.infantAllowedFree
    ),
    infantComplimentaryFood: toBoolean(
      policyValue("INFANT_POLICY", "INFANT_COMPLIMENTARY_FOOD"),
      DEFAULT_FORM.infantComplimentaryFood
    ),
    petsAllowed: toBoolean(
      policyValue("PET_POLICY", "PETS_ALLOWED"),
      DEFAULT_FORM.petsAllowed
    ),
    petsLivingOnProperty: toBoolean(
      policyValue("PET_POLICY", "PETS_LIVING_ON_PROPERTY"),
      DEFAULT_FORM.petsLivingOnProperty
    ),
    smokingAllowed: toBoolean(
      policyValue("PROPERTY_RESTRICTIONS", "SMOKING_ALLOWED"),
      DEFAULT_FORM.smokingAllowed
    ),
    privatePartiesAllowed: toBoolean(
      policyValue("PROPERTY_RESTRICTIONS", "PRIVATE_PARTIES_ALLOWED"),
      DEFAULT_FORM.privatePartiesAllowed
    ),
    outsideVisitorsAllowed: toBoolean(
      policyValue("PROPERTY_RESTRICTIONS", "OUTSIDE_VISITORS_ALLOWED"),
      DEFAULT_FORM.outsideVisitorsAllowed
    ),
    wheelchairAccessible: toBoolean(
      policyValue("PROPERTY_RESTRICTIONS", "WHEELCHAIR_ACCESSIBLE"),
      DEFAULT_FORM.wheelchairAccessible
    ),
    unmarriedCouplesAllowed: toBoolean(
      policyValue("GUEST_PROFILE", "UNMARRIED_COUPLES_ALLOWED"),
      DEFAULT_FORM.unmarriedCouplesAllowed
    ),
    below18Allowed: toBoolean(
      policyValue("GUEST_PROFILE", "BELOW_18_ALLOWED"),
      DEFAULT_FORM.below18Allowed
    ),
    onlyMaleGroupAllowed: toBoolean(
      policyValue("GUEST_PROFILE", "ONLY_MALE_GROUP_ALLOWED"),
      DEFAULT_FORM.onlyMaleGroupAllowed
    ),
    acceptableIdProofs: Array.isArray(
      policyValue("IDENTITY_PROOF", "ACCEPTABLE_ID_PROOFS")
    )
      ? (policyValue("IDENTITY_PROOF", "ACCEPTABLE_ID_PROOFS") as string[])
      : DEFAULT_FORM.acceptableIdProofs,
    customPolicyText: toStringValue(
      policyValue("CUSTOM_POLICY", "CUSTOM_POLICY_TEXT"),
      DEFAULT_FORM.customPolicyText
    ),
  };
};

export function PolicyAndRulesTab({ hotelId }: PolicyAndRulesTabProps) {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("policy");
  const [formState, setFormState] = useState<PolicyFormState>(DEFAULT_FORM);
  const [hasExistingPolicy, setHasExistingPolicy] = useState(false);
  const [cancellationList, setCancellationList] = useState<CancellationPolicy[]>(
    []
  );
  const [selectedCancellationId, setSelectedCancellationId] = useState<
    number | null
  >(null);
  const [cancellationForm, setCancellationForm] =
    useState<CancellationPolicyPayload>({
      policyName: "",
      noShowPenaltyType: "NONE",
      noShowPenaltyValue: null,
      applyChannel: "B2C",
      effectiveFrom: null,
      effectiveTo: null,
      slabs: [],
    });
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancellationSaving, setCancellationSaving] = useState(false);
  const [cancellationViewLoading, setCancellationViewLoading] = useState(false);
  const [viewingCancellationPolicy, setViewingCancellationPolicy] =
    useState<CancellationPolicy | null>(null);
  const cancellationNameInputRef = useRef<HTMLInputElement | null>(null);
  const [isCancellationModalOpen, setIsCancellationModalOpen] =
    useState(false);
  const [ruleDraft, setRuleDraft] = useState<RuleDraftState>(EMPTY_RULE_DRAFT);
  const [ruleDraftErrors, setRuleDraftErrors] = useState<RuleDraftErrors>({});
  const [cancellationErrors, setCancellationErrors] =
    useState<CancellationFormErrors>({});
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [cancellationPreset, setCancellationPreset] =
    useState<CancellationPresetKey>("FREE_24_HOURS");
  const [childPolicy, setChildPolicy] = useState<{
    childrenAllowed: boolean;
    freeStayMaxAge: number;
    paidStayMaxAge: number;
  }>({
    childrenAllowed: true,
    freeStayMaxAge: 0,
    paidStayMaxAge: 0,
  });
  const [childLoading, setChildLoading] = useState(false);
  const [childSaving, setChildSaving] = useState(false);
  const [hasChildPolicy, setHasChildPolicy] = useState(false);
  const [isChildPolicyModalOpen, setIsChildPolicyModalOpen] = useState(false);
  const childPolicyFreeAgeInputRef = useRef<HTMLInputElement | null>(null);
  const [paymentRules, setPaymentRules] = useState<PaymentRule[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentRule, setSelectedPaymentRule] = useState<PaymentRule | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentRulePayload>({
    paymentType: "FULL_PREPAID",
    status: "ACTIVE",
    advancePercent: 100,
    allowedModes: [],
  });

  const visiblePaymentModes =
    paymentForm.paymentType === "FULL_PREPAID"
      ? ["UPI", "CARD", "NETBANKING", "WALLET"]
      : ["UPI", "CARD", "NETBANKING", "WALLET", "CASH"];

  const NO_SHOW_LABELS: Record<NoShowPenaltyType, string> = {
    NONE: "None",
    PERCENTAGE: "Percentage",
    FIXED: "Fixed",
  };

  const SLAB_TYPE_LABELS: Record<SlabPenaltyType, string> = {
    PERCENTAGE: "Percentage",
    FIXED: "Fixed Amount",
  };

  const normalizeNoShowType = (rawType: string | undefined): NoShowPenaltyType => {
    if (rawType === "NONE" || rawType === "PERCENTAGE" || rawType === "FIXED") {
      return rawType;
    }
    if (
      rawType === "FIRST_NIGHT" ||
      rawType === "FULL_STAY" ||
      rawType === "FIRST_NIGHT_COST" ||
      rawType === "FULL_STAY_COST"
    ) {
      return "FIXED";
    }
    return "NONE";
  };

  const getNoShowBadgeClass = (type: NoShowPenaltyType) => {
    if (type === "PERCENTAGE") return "bg-amber-100 text-amber-800";
    if (type === "FIXED") return "bg-fuchsia-100 text-fuchsia-800";
    if (type === "NONE") return "bg-gray-100 text-gray-700";
    return "bg-gray-100 text-gray-700";
  };

  const getApplyChannelBadgeClass = (channel?: string) => {
    switch (channel) {
      case "B2B":
        return "bg-violet-100 text-violet-800";
      case "BUNDLE":
        return "bg-emerald-100 text-emerald-800";
      case "B2C":
      default:
        return "bg-sky-100 text-sky-800";
    }
  };

  const getDefaultSlabsForHours = (hours: number): CancellationSlabForm[] => {
    if (hours <= 0) {
      return [
        {
          fromHours: 0,
          toHours: 9999,
          penaltyType: "PERCENTAGE",
          penaltyValue: 0,
        },
      ];
    }

    return [
      {
        fromHours: hours,
        toHours: 9999,
        penaltyType: "PERCENTAGE",
        penaltyValue: 0,
      },
      {
        fromHours: 0,
        toHours: hours,
        penaltyType: "PERCENTAGE",
        penaltyValue: 100,
      },
    ];
  };

  const getPresetConfig = (preset: CancellationPresetKey) => {
    switch (preset) {
      case "FREE_TILL_CHECKIN":
        return {
          noShowPenaltyType: "PERCENTAGE" as const,
          noShowPenaltyValue: 100,
          slabs: getDefaultSlabsForHours(0),
        };
      case "FREE_24_HOURS":
        return {
          noShowPenaltyType: "PERCENTAGE" as const,
          noShowPenaltyValue: 100,
          slabs: getDefaultSlabsForHours(24),
        };
      case "FREE_48_HOURS":
        return {
          noShowPenaltyType: "PERCENTAGE" as const,
          noShowPenaltyValue: 100,
          slabs: getDefaultSlabsForHours(48),
        };
      case "FREE_72_HOURS":
        return {
          noShowPenaltyType: "PERCENTAGE" as const,
          noShowPenaltyValue: 100,
          slabs: getDefaultSlabsForHours(72),
        };
      case "NON_REFUNDABLE":
        return {
          noShowPenaltyType: "PERCENTAGE" as const,
          noShowPenaltyValue: 100,
          slabs: [
            {
              fromHours: 0,
              toHours: 9999,
              penaltyType: "PERCENTAGE" as const,
              penaltyValue: 100,
            },
          ],
        };
      default:
        return null;
    }
  };

  const isOpenEndedToHours = (toHours: number) => toHours >= 9999;

  const inferPresetFromSlabs = (
    slabs: CancellationSlabForm[],
  ): CancellationPresetKey => {
    const sorted = [...slabs].sort((a, b) => a.fromHours - b.fromHours);

    if (sorted.length === 1) {
      const slab = sorted[0];
      if (
        slab.fromHours === 0 &&
        isOpenEndedToHours(slab.toHours) &&
        slab.penaltyType === "PERCENTAGE"
      ) {
        if (slab.penaltyValue === 0) return "FREE_TILL_CHECKIN";
        if (slab.penaltyValue === 100) return "NON_REFUNDABLE";
      }
    }

    if (sorted.length === 2) {
      const [first, second] = sorted;
      const hours = second.fromHours;
      const matches =
        first.fromHours === 0 &&
        first.toHours === hours &&
        first.penaltyType === "PERCENTAGE" &&
        first.penaltyValue === 100 &&
        isOpenEndedToHours(second.toHours) &&
        second.penaltyType === "PERCENTAGE" &&
        second.penaltyValue === 0;
      if (matches) {
        if (hours === 24) return "FREE_24_HOURS";
        if (hours === 48) return "FREE_48_HOURS";
        if (hours === 72) return "FREE_72_HOURS";
        if (hours === 0) return "FREE_TILL_CHECKIN";
      }
    }

    const freeSlab = sorted.find(
      (slab) =>
        slab.penaltyType === "PERCENTAGE" &&
        slab.penaltyValue === 0 &&
        isOpenEndedToHours(slab.toHours),
    );
    if (freeSlab) {
      const cutoff = freeSlab.fromHours;
      if (cutoff === 0) return "FREE_TILL_CHECKIN";
      if (cutoff === 24) return "FREE_24_HOURS";
      if (cutoff === 48) return "FREE_48_HOURS";
      if (cutoff === 72) return "FREE_72_HOURS";
    }

    const nonRefundableSlab = sorted.find(
      (slab) =>
        slab.fromHours === 0 &&
        isOpenEndedToHours(slab.toHours) &&
        slab.penaltyType === "PERCENTAGE" &&
        slab.penaltyValue === 100,
    );
    if (nonRefundableSlab) return "NON_REFUNDABLE";

    return "FREE_24_HOURS";
  };

  const inferCancellationPreset = (
    slabs: CancellationSlabForm[],
    noShowPenaltyType: NoShowPenaltyType,
    noShowPenaltyValue: number | null,
  ): CancellationPresetKey => {
    const sorted = [...slabs].sort((a, b) => a.fromHours - b.fromHours);
    const noShowIs100 =
      noShowPenaltyType === "PERCENTAGE" && Number(noShowPenaltyValue ?? 0) === 100;

    if (sorted.length === 1) {
      const slab = sorted[0];
      if (
        slab.fromHours === 0 &&
        isOpenEndedToHours(slab.toHours) &&
        slab.penaltyType === "PERCENTAGE"
      ) {
        if (slab.penaltyValue === 0 && noShowIs100) return "FREE_TILL_CHECKIN";
        if (slab.penaltyValue === 100 && noShowIs100) return "NON_REFUNDABLE";
      }
    }

    if (sorted.length === 2) {
      const [first, second] = sorted;
      const hours = second.fromHours;
      const matches =
        first.fromHours === 0 &&
        first.toHours === hours &&
        first.penaltyType === "PERCENTAGE" &&
        first.penaltyValue === 100 &&
        isOpenEndedToHours(second.toHours) &&
        second.penaltyType === "PERCENTAGE" &&
        second.penaltyValue === 0 &&
        noShowIs100;
      if (matches) {
        if (hours === 24) return "FREE_24_HOURS";
        if (hours === 48) return "FREE_48_HOURS";
        if (hours === 72) return "FREE_72_HOURS";
      }
    }

    return "CUSTOM";
  };

  const resolveCancellationPreset = (
    creationType: CancellationPolicy["creationType"],
    slabs: CancellationSlabForm[],
    noShowPenaltyType: NoShowPenaltyType,
    noShowPenaltyValue: number | null,
  ): CancellationPresetKey => {
    if (creationType === "CUSTOM") return "CUSTOM";
    if (creationType === "DEFAULT") {
      return inferPresetFromSlabs(slabs);
    }
    return inferCancellationPreset(
      slabs,
      noShowPenaltyType,
      noShowPenaltyValue,
    );
  };

  const isCustomCancellationPolicy = (
    policy: CancellationPolicy,
    preset: CancellationPresetKey,
  ) => {
    if (policy.creationType === "DEFAULT") return false;
    if (policy.creationType === "CUSTOM") return true;
    return preset === "CUSTOM";
  };

  const parseNumberInput = (value: string): NumericInput => {
    if (value.trim() === "") return "";
    const parsed = Number(value);
    return Number.isNaN(parsed) ? "" : parsed;
  };

  const fetchPolicies = async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const response = await adminService.getHotelPolicies(hotelId);
      const latestPolicy =
        response?.policies?.find((item) => item.isLatest) ||
        response?.policies?.[0];

      if (latestPolicy) {
        setFormState(transformPolicyRecord(latestPolicy));
        setHasExistingPolicy(true);
      } else {
        setFormState(DEFAULT_FORM);
        setHasExistingPolicy(false);
      }
    } catch (error) {
      console.error("Error fetching policies:", error);
      showToast("Failed to load policies", "error");
      setFormState(DEFAULT_FORM);
      setHasExistingPolicy(false);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentRules = async () => {
    if (!hotelId) return;
    setPaymentLoading(true);
    try {
      const response = await adminService.getPaymentRules(hotelId);
      setPaymentRules(response.paymentRules || []);
    } catch (error) {
      console.error("Error fetching payment rules:", error);
      showToast("Failed to load payment rules", "error");
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
    loadCancellationPolicies();
    loadChildPolicy();
    loadPaymentRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  useEffect(() => {
    // Prevent stale cancellation form/view state when switching hotels
    const preset = "FREE_24_HOURS";
    const presetConfig = getPresetConfig(preset);
    setIsCancellationModalOpen(false);
    setSelectedCancellationId(null);
    setViewingCancellationPolicy(null);
    setCancellationViewLoading(false);
    setShowRuleBuilder(false);
    setEditingRuleIndex(null);
    setRuleDraftErrors({});
    setCancellationErrors({});
    setCancellationForm({
      policyName: "",
      noShowPenaltyType: presetConfig?.noShowPenaltyType ?? "NONE",
      noShowPenaltyValue: presetConfig?.noShowPenaltyValue ?? null,
      applyChannel: "B2C",
      effectiveFrom: null,
      effectiveTo: null,
      slabs: presetConfig?.slabs ?? [],
    });
    setCancellationPreset(preset);
    setRuleDraft(EMPTY_RULE_DRAFT);
  }, [hotelId]);

  useEffect(() => {
    if (activeTab !== "cancellation") {
      setIsCancellationModalOpen(false);
      setSelectedCancellationId(null);
      setShowRuleBuilder(false);
      setEditingRuleIndex(null);
      setRuleDraftErrors({});
      setCancellationErrors({});
      setViewingCancellationPolicy(null);
      setCancellationViewLoading(false);
    }
  }, [activeTab]);

  const updateField = <K extends keyof PolicyFormState>(
    key: K,
    value: PolicyFormState[K]
  ) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const buildRulesPayload = (): HotelPolicyRule[] => {
    const numeric = (value: NumericInput, fallback = 0) =>
      value === "" ? fallback : Number(value);

    return [
      {
          category: "CHECKIN_CHECKOUT",
          ruleCode: "CHECKIN_TIME",
        value: formState.checkinTime || DEFAULT_FORM.checkinTime,
          active: true,
      },
      {
          category: "CHECKIN_CHECKOUT",
          ruleCode: "CHECKOUT_TIME",
        value: formState.checkoutTime || DEFAULT_FORM.checkoutTime,
          active: true,
      },
      {
        category: "CHECKIN_CHECKOUT",
        ruleCode: "TWENTY_FOUR_HOUR_CHECKIN",
        value: formState.twentyFourHourCheckin,
        active: true,
      },
      {
          category: "CANCELLATION",
          ruleCode: "FREE_CANCEL_BEFORE_HOURS",
        value: numeric(formState.freeCancelBeforeHours, 0),
          active: true,
      },
      {
        category: "MEAL_POLICY",
        ruleCode: "BREAKFAST_PRICE",
        value: numeric(formState.breakfastPrice, 0),
        active: true,
      },
      {
        category: "MEAL_POLICY",
        ruleCode: "LUNCH_PRICE",
        value: numeric(formState.lunchPrice, 0),
        active: true,
      },
      {
        category: "MEAL_POLICY",
        ruleCode: "DINNER_PRICE",
        value: numeric(formState.dinnerPrice, 0),
        active: true,
      },
      {
        category: "EXTRA_BED",
        ruleCode: "EXTRA_BED_ADULT_ALLOWED",
        value: formState.extraBedAdultAllowed,
        active: true,
      },
      {
        category: "EXTRA_BED",
        ruleCode: "EXTRA_BED_CHILD_ALLOWED",
        value: formState.extraBedChildAllowed,
        active: true,
      },
      {
        category: "EXTRA_BED",
        ruleCode: "EXTRA_BED_INCLUDED_IN_RATE",
        value: formState.extraBedIncludedInRate,
        active: true,
      },
      {
        category: "INFANT_POLICY",
        ruleCode: "INFANT_ALLOWED_FREE",
        value: formState.infantAllowedFree,
        active: true,
      },
      {
        category: "INFANT_POLICY",
        ruleCode: "INFANT_COMPLIMENTARY_FOOD",
        value: formState.infantComplimentaryFood,
        active: true,
      },
      {
        category: "PET_POLICY",
        ruleCode: "PETS_ALLOWED",
        value: formState.petsAllowed,
        active: true,
      },
      {
        category: "PET_POLICY",
        ruleCode: "PETS_LIVING_ON_PROPERTY",
        value: formState.petsLivingOnProperty,
        active: true,
      },
      {
        category: "PROPERTY_RESTRICTIONS",
        ruleCode: "SMOKING_ALLOWED",
        value: formState.smokingAllowed,
        active: true,
      },
      {
        category: "PROPERTY_RESTRICTIONS",
        ruleCode: "PRIVATE_PARTIES_ALLOWED",
        value: formState.privatePartiesAllowed,
        active: true,
      },
      {
        category: "PROPERTY_RESTRICTIONS",
        ruleCode: "OUTSIDE_VISITORS_ALLOWED",
        value: formState.outsideVisitorsAllowed,
        active: true,
      },
      {
        category: "PROPERTY_RESTRICTIONS",
        ruleCode: "WHEELCHAIR_ACCESSIBLE",
        value: formState.wheelchairAccessible,
        active: true,
      },
      {
        category: "GUEST_PROFILE",
        ruleCode: "UNMARRIED_COUPLES_ALLOWED",
        value: formState.unmarriedCouplesAllowed,
        active: true,
      },
      {
        category: "GUEST_PROFILE",
        ruleCode: "BELOW_18_ALLOWED",
        value: formState.below18Allowed,
        active: true,
      },
      {
        category: "GUEST_PROFILE",
        ruleCode: "ONLY_MALE_GROUP_ALLOWED",
        value: formState.onlyMaleGroupAllowed,
        active: true,
      },
      {
        category: "IDENTITY_PROOF",
        ruleCode: "ACCEPTABLE_ID_PROOFS",
        value: formState.acceptableIdProofs,
        active: true,
      },
      {
        category: "CUSTOM_POLICY",
        ruleCode: "CUSTOM_POLICY_TEXT",
        value: formState.customPolicyText || "",
        active: true,
      },
    ];
  };

  const handleSave = async () => {
    if (!hotelId) return;
    setSaving(true);
    try {
      const payload = {
        draft: false,
        rules: buildRulesPayload(),
      };

      if (hasExistingPolicy) {
        await adminService.updateHotelPolicies(hotelId, payload);
      } else {
        await adminService.createHotelPolicies(hotelId, payload);
        setHasExistingPolicy(true);
      }
      showToast("Policies saved successfully", "success");
      await fetchPolicies();
    } catch (error) {
      console.error("Error saving policies:", error);
      showToast("Failed to save policies", "error");
    } finally {
      setSaving(false);
    }
  };

  const loadCancellationPolicies = async () => {
    if (!hotelId) return;
    setCancellationLoading(true);
    try {
      const list = await adminService.getCancellationPolicies(hotelId);
      setCancellationList(list.policies || []);
    } catch (error) {
      console.error("Error fetching cancellation policies:", error);
      showToast("Failed to load cancellation policies", "error");
    } finally {
      setCancellationLoading(false);
    }
  };

  const loadCancellationDetail = async (policyId: number) => {
    if (!hotelId) return;
    setCancellationLoading(true);
    try {
      const detail = await adminService.getCancellationPolicy(
        hotelId,
        policyId
      );
      const rawNoShowType = detail.noShowPenaltyType as string | undefined;
      const mappedNoShowType: NoShowPenaltyType = normalizeNoShowType(rawNoShowType);

      const normalizedSlabs: CancellationSlabForm[] = (detail.slabs || [])
        .filter((slab) => slab.toHours > slab.fromHours)
        .map((slab) => {
          const isFixedByAmount =
            slab.penaltyType === "FIXED" ||
            (typeof slab.penaltyAmount === "number" &&
              slab.penaltyAmount > 0 &&
              slab.penaltyType !== "PERCENTAGE");
          const penaltyType: SlabPenaltyType = isFixedByAmount
            ? "FIXED"
            : "PERCENTAGE";
          const fallbackPercent =
            typeof slab.refundPercent === "number"
              ? Math.max(0, Math.min(100, 100 - slab.refundPercent))
              : 0;
          const penaltyValue =
            typeof slab.penaltyValue === "number"
              ? slab.penaltyValue
              : penaltyType === "FIXED"
              ? slab.penaltyAmount ?? 0
              : fallbackPercent;
          return {
            fromHours: slab.fromHours,
            toHours: slab.toHours,
            penaltyType,
            penaltyValue,
          };
        });

      setCancellationForm({
        policyName: detail.policyName,
        noShowPenaltyType: mappedNoShowType,
        noShowPenaltyValue:
          mappedNoShowType === "PERCENTAGE" || mappedNoShowType === "FIXED"
            ? Number(detail.noShowPenaltyValue ?? 0)
            : null,
        applyChannel: detail.applyChannel ?? "B2C",
        effectiveFrom: detail.effectiveFrom ?? null,
        effectiveTo: detail.effectiveTo ?? null,
        slabs: normalizedSlabs,
      });
      setCancellationPreset(
        resolveCancellationPreset(
          normalizeCreationType(detail.creationType),
          normalizedSlabs,
          mappedNoShowType,
          mappedNoShowType === "PERCENTAGE" || mappedNoShowType === "FIXED"
            ? Number(detail.noShowPenaltyValue ?? 0)
            : null,
        ),
      );
      setCancellationErrors({});
      setRuleDraftErrors({});
      setShowRuleBuilder(false);
      setSelectedCancellationId(policyId);
      setIsCancellationModalOpen(true);
      if (cancellationNameInputRef.current) {
        cancellationNameInputRef.current.focus();
      }
    } catch (error) {
      console.error("Error loading cancellation policy detail:", error);
      showToast("Failed to load cancellation policy detail", "error");
    } finally {
      setCancellationLoading(false);
    }
  };

  const loadCancellationView = async (policyId: number) => {
    if (!hotelId) return;
    setCancellationViewLoading(true);
    try {
      const detail = await adminService.getCancellationPolicy(hotelId, policyId);
      setViewingCancellationPolicy(detail);
    } catch (error) {
      console.error("Error loading cancellation policy for view:", error);
      showToast("Failed to load policy details", "error");
    } finally {
      setCancellationViewLoading(false);
    }
  };

  const resetCancellationForm = () => {
    const preset = "FREE_24_HOURS";
    const presetConfig = getPresetConfig(preset);
    setCancellationForm({
      policyName: "",
      noShowPenaltyType: presetConfig?.noShowPenaltyType ?? "NONE",
      noShowPenaltyValue: presetConfig?.noShowPenaltyValue ?? null,
      applyChannel: "B2C",
      effectiveFrom: null,
      effectiveTo: null,
      slabs: presetConfig?.slabs ?? [],
    });
    setCancellationPreset(preset);
    setRuleDraft(EMPTY_RULE_DRAFT);
    setRuleDraftErrors({});
    setCancellationErrors({});
    setSelectedCancellationId(null);
    setShowRuleBuilder(false);
    setEditingRuleIndex(null);
    setIsCancellationModalOpen(true);
    if (cancellationNameInputRef.current) {
      cancellationNameInputRef.current.focus();
    }
  };

  const closeCancellationModal = () => {
    setIsCancellationModalOpen(false);
    setSelectedCancellationId(null);
    setRuleDraftErrors({});
    setCancellationErrors({});
    setShowRuleBuilder(false);
    setEditingRuleIndex(null);
  };

  const validateRuleDraft = (
    draft = ruleDraft,
    ignoreIndex: number | null = editingRuleIndex
  ): RuleDraftErrors => {
    const errors: RuleDraftErrors = {};
    if (draft.fromHours === "") {
      errors.fromHours = "Please select a from time";
    }
    if (draft.toHours === "") {
      errors.toHours = "Please select a to time";
    }
    const from = draft.fromHours === "" ? NaN : Number(draft.fromHours);
    const to = draft.toHours === "" ? NaN : Number(draft.toHours);
    const value = draft.penaltyValue === "" ? NaN : Number(draft.penaltyValue);

    if (!errors.fromHours && (Number.isNaN(from) || from < 0)) {
      errors.fromHours = "From time must be 0 or greater";
    }
    if (!errors.toHours && (Number.isNaN(to) || to < 0)) {
      errors.toHours = "To time must be 0 or greater";
    }
    if (!errors.fromHours && !errors.toHours && !Number.isNaN(from) && !Number.isNaN(to) && from >= to) {
      errors.toHours = "From time must be less than To time";
    }
    if (Number.isNaN(value) || value < 0) {
      errors.penaltyValue = "Penalty value must be 0 or greater";
    } else if (draft.penaltyType === "PERCENTAGE" && value > 100) {
      errors.penaltyValue = "Penalty value cannot be more than 100%";
    }

    if (!errors.fromHours && !errors.toHours) {
      const hasOverlap = cancellationForm.slabs.some(
        (slab, index) =>
          index !== ignoreIndex &&
          slabsOverlap(
            { fromHours: from, toHours: to },
            slab,
          ),
      );
      if (hasOverlap) {
        errors.overlap =
          "This window overlaps an existing condition. Choose a non-overlapping range.";
      }
    }
    return errors;
  };

  const saveRule = () => {
    const errors = validateRuleDraft();
    setRuleDraftErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const nextSlab: CancellationSlabForm = {
      fromHours: Number(ruleDraft.fromHours),
      toHours: Number(ruleDraft.toHours),
      penaltyType: ruleDraft.penaltyType,
      penaltyValue: Number(ruleDraft.penaltyValue),
    };
    setCancellationForm((prev) => {
      if (editingRuleIndex === null) {
        return {
          ...prev,
          slabs: [...prev.slabs, nextSlab],
        };
      }
      return {
        ...prev,
        slabs: prev.slabs.map((slab, index) =>
          index === editingRuleIndex ? nextSlab : slab
        ),
      };
    });
    setRuleDraft(EMPTY_RULE_DRAFT);
    setEditingRuleIndex(null);
    setRuleDraftErrors({});
    setShowRuleBuilder(false);
  };

  const startEditRule = (index: number) => {
    const slab = cancellationForm.slabs[index];
    if (!slab) return;
    setRuleDraft({
      fromHours: slab.fromHours,
      toHours: slab.toHours,
      penaltyType: slab.penaltyType,
      penaltyValue: slab.penaltyValue,
    });
    setEditingRuleIndex(index);
    setRuleDraftErrors({});
    setShowRuleBuilder(true);
  };

  const removeRule = (index: number) => {
    setCancellationForm((prev) => ({
      ...prev,
      slabs: prev.slabs.filter((_, slabIndex) => slabIndex !== index),
    }));
    if (editingRuleIndex === index) {
      setEditingRuleIndex(null);
      setRuleDraft(EMPTY_RULE_DRAFT);
      setRuleDraftErrors({});
      setShowRuleBuilder(false);
    }
  };

  const validateCancellationForm = () => {
    const errors: CancellationFormErrors = {};
    if (!cancellationForm.policyName.trim()) {
      errors.policyName = "Policy name is required";
    }
    if (cancellationPreset === "CUSTOM") {
      if (showRuleBuilder) {
        errors.slabs =
          "Save or cancel the condition you are editing before submitting.";
      } else if (!cancellationForm.slabs.length) {
        errors.slabs = "Add at least one cancellation rule";
      } else if (findOverlappingSlabIndexes(cancellationForm.slabs).length > 0) {
        errors.slabs =
          "Cancellation windows cannot overlap. Please fix overlapping conditions.";
      }
    } else if (!cancellationForm.slabs.length) {
      errors.slabs = "Add at least one cancellation rule";
    }
    if (
      cancellationForm.noShowPenaltyType === "PERCENTAGE" ||
      cancellationForm.noShowPenaltyType === "FIXED"
    ) {
      const value = Number(cancellationForm.noShowPenaltyValue);
      if (Number.isNaN(value) || value < 0) {
        errors.noShowPenaltyValue = "No-show value must be 0 or greater";
      } else if (cancellationForm.noShowPenaltyType === "PERCENTAGE" && value > 100) {
        errors.noShowPenaltyValue = "No-show percentage must be between 0 and 100";
      }
    }
    setCancellationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveCancellation = async () => {
    if (!hotelId) return;
    if (!validateCancellationForm()) return;
    setCancellationSaving(true);
    try {
      const payload: CancellationPolicyPayload = {
        policyName: cancellationForm.policyName.trim(),
        creationType: cancellationPreset === "CUSTOM" ? "CUSTOM" : "DEFAULT",
        noShowPenaltyType: cancellationForm.noShowPenaltyType,
        noShowPenaltyValue:
          cancellationForm.noShowPenaltyType === "PERCENTAGE" ||
          cancellationForm.noShowPenaltyType === "FIXED"
            ? Number(cancellationForm.noShowPenaltyValue ?? 0)
            : null,
        applyChannel: cancellationForm.applyChannel ?? "B2C",
        effectiveFrom: cancellationForm.effectiveFrom ?? null,
        effectiveTo: cancellationForm.effectiveTo ?? null,
        slabs: cancellationForm.slabs.map((slab) => ({
          fromHours: slab.fromHours,
          toHours: slab.toHours,
          penaltyType: slab.penaltyType,
          penaltyValue: slab.penaltyValue,
        })),
      };
      if (selectedCancellationId) {
        await adminService.updateCancellationPolicy(
          hotelId,
          selectedCancellationId,
          payload
        );
      } else {
        await adminService.createCancellationPolicy(hotelId, payload);
      }
      showToast("Cancellation policy saved", "success");
      closeCancellationModal();
      await loadCancellationPolicies();
    } catch (error) {
      console.error("Error saving cancellation policy:", error);
      showToast("Failed to save cancellation policy", "error");
    } finally {
      setCancellationSaving(false);
    }
  };

  const loadChildPolicy = async () => {
    if (!hotelId) return;
    setChildLoading(true);
    try {
      const data = await adminService.getChildAgePolicy(hotelId);
      if (data) {
        setChildPolicy({
          childrenAllowed: data.childrenAllowed,
          freeStayMaxAge: data.freeStayMaxAge,
          paidStayMaxAge: data.paidStayMaxAge,
        });
        setHasChildPolicy(true);
      } else {
        setHasChildPolicy(false);
      }
    } catch (error: any) {
      // 404 means no policy exists yet
      if (error?.response?.status === 404) {
        setHasChildPolicy(false);
        setChildPolicy({
          childrenAllowed: true,
          freeStayMaxAge: 0,
          paidStayMaxAge: 0,
        });
      } else {
        console.error("Error fetching child policy:", error);
        showToast("Failed to load child policy", "error");
      }
    } finally {
      setChildLoading(false);
    }
  };

  const openChildPolicyModal = () => {
    setIsChildPolicyModalOpen(true);
    // Focus the first input after modal opens
    setTimeout(() => {
      if (childPolicyFreeAgeInputRef.current) {
        childPolicyFreeAgeInputRef.current.focus();
      }
    }, 100);
  };

  const closeChildPolicyModal = () => {
    setIsChildPolicyModalOpen(false);
    // Reset form to current policy values
    if (hasChildPolicy) {
      loadChildPolicy();
    } else {
      setChildPolicy({
        childrenAllowed: true,
        freeStayMaxAge: 0,
        paidStayMaxAge: 0,
      });
    }
  };

  const saveChildPolicy = async () => {
    if (!hotelId) return;
    setChildSaving(true);
    try {
      const payload = { ...childPolicy };
      if (hasChildPolicy) {
        await adminService.updateChildAgePolicy(hotelId, payload);
      } else {
        await adminService.createChildAgePolicy(hotelId, payload);
        setHasChildPolicy(true);
      }
      showToast("Child policy saved", "success");
      await loadChildPolicy();
      setIsChildPolicyModalOpen(false);
    } catch (error) {
      console.error("Error saving child policy:", error);
      showToast("Failed to save child policy", "error");
    } finally {
      setChildSaving(false);
    }
  };

  const openPaymentModal = (rule?: PaymentRule) => {
    if (rule) {
      setSelectedPaymentRule(rule);
      const normalizedAdvancePercent =
        rule.paymentType === "FULL_PREPAID"
          ? 100
          : rule.paymentType === "PAY_AT_HOTEL"
            ? 0
            : rule.advancePercent;
      const normalizedModes =
        rule.paymentType === "FULL_PREPAID"
          ? (rule.allowedModes || []).filter((mode) => mode !== "CASH")
          : [...(rule.allowedModes || [])];
      setPaymentForm({
        paymentType: rule.paymentType,
        status: rule.status,
        advancePercent: normalizedAdvancePercent,
        allowedModes: normalizedModes,
      });
    } else {
      setSelectedPaymentRule(null);
      setPaymentForm({
        paymentType: "FULL_PREPAID",
        status: "ACTIVE",
        advancePercent: 100,
        allowedModes: [],
      });
    }
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPaymentRule(null);
  };

  const savePaymentRule = async () => {
    if (!hotelId) return;
    setPaymentSaving(true);
    try {
      const normalizedAdvancePercent =
        paymentForm.paymentType === "FULL_PREPAID"
          ? 100
          : paymentForm.paymentType === "PAY_AT_HOTEL"
            ? 0
            : paymentForm.advancePercent;
      const normalizedModes =
        paymentForm.paymentType === "FULL_PREPAID"
          ? paymentForm.allowedModes.filter((mode) => mode !== "CASH")
          : paymentForm.allowedModes;
      const payload: PaymentRulePayload = {
        paymentType: paymentForm.paymentType,
        status: paymentForm.status,
        advancePercent: normalizedAdvancePercent,
        allowedModes: normalizedModes,
      };
      if (selectedPaymentRule) {
        await adminService.updatePaymentRule(hotelId, {
          ...payload,
          id: selectedPaymentRule.id,
        });
      } else {
        await adminService.createPaymentRule(hotelId, payload);
      }
      showToast("Payment rule saved", "success");
      await loadPaymentRules();
      setIsPaymentModalOpen(false);
    } catch (error) {
      console.error("Error saving payment rule:", error);
      showToast("Failed to save payment rule", "error");
    } finally {
      setPaymentSaving(false);
    }
  };

  if (loading) {
    return <PolicyPageLoader message="Loading policies and rules..." />;
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="mx-auto max-w-5xl space-y-4">
        <Tabs
          defaultValue="policy"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="sticky top-0 z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-gray-50 px-4 py-3">
            <h1 className="shrink-0 text-xl font-bold tracking-tight text-gray-900">
              Policy and Rules
            </h1>
            <TabsList className="inline-flex h-auto w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
              {POLICY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "group gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      isActive ? tab.active : tab.idle,
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? tab.iconActive : tab.iconIdle,
                      )}
                      strokeWidth={2.25}
                    />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="policy">
            <div className="mt-0 space-y-3">
        <PolicySectionCard theme="blue">
          <PolicySectionHeader
            icon={CalendarClock}
            title="Check-in & Check-out Time"
            theme="blue"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PolicyTimeField
              label="Check-in Time"
              value={formState.checkinTime}
              onChange={(value) => updateField("checkinTime", value)}
              theme="blue"
            />
            <PolicyTimeField
              label="Check-out Time"
              value={formState.checkoutTime}
              onChange={(value) => updateField("checkoutTime", value)}
              theme="blue"
            />
          </div>
          <div className="mt-3">
            <PolicyToggleOption
              id="twentyFourCheckin"
              label="24-hour check-in available"
              checked={formState.twentyFourHourCheckin}
              onChange={(checked) =>
                updateField("twentyFourHourCheckin", checked)
              }
              theme="blue"
            />
          </div>
        </PolicySectionCard>

        <PolicySectionCard theme="violet">
          <PolicySectionHeader
            icon={UserCircle2}
            title="Guest Profile"
            theme="violet"
          />
          <PolicyCheckboxGrid>
            <PolicyToggleOption
              label="Unmarried couples allowed"
              checked={formState.unmarriedCouplesAllowed}
              onChange={(checked) =>
                updateField("unmarriedCouplesAllowed", checked)
              }
              theme="violet"
            />
            <PolicyToggleOption
              label="Guests below 18 allowed"
              checked={formState.below18Allowed}
              onChange={(checked) => updateField("below18Allowed", checked)}
              theme="violet"
            />
            <PolicyToggleOption
              label="Only male groups allowed"
              checked={formState.onlyMaleGroupAllowed}
              onChange={(checked) =>
                updateField("onlyMaleGroupAllowed", checked)
              }
              theme="violet"
            />
          </PolicyCheckboxGrid>
        </PolicySectionCard>

              <PolicySectionCard theme="indigo">
                <PolicySectionHeader
                  icon={ShieldCheck}
                  title="Identity Proofs"
                  subtitle="Select acceptable identity proofs for check-in."
                  theme="indigo"
                />
                <PolicyCheckboxGrid columns={1}>
                  {ID_PROOF_OPTIONS.map((proof) => {
                    const isSelected = formState.acceptableIdProofs.includes(
                      proof.value,
                    );
                    return (
                      <PolicyToggleOption
                        key={proof.value}
                        label={proof.label}
                        checked={isSelected}
                        onChange={(checked) => {
                          const updated = checked
                            ? [...formState.acceptableIdProofs, proof.value]
                            : formState.acceptableIdProofs.filter(
                                (item) => item !== proof.value,
                              );
                          updateField("acceptableIdProofs", updated);
                        }}
                        theme="indigo"
                      />
                    );
                  })}
                </PolicyCheckboxGrid>
              </PolicySectionCard>

              <PolicySectionCard theme="amber">
                <PolicySectionHeader
                  icon={Sparkles}
                  title="Property Restrictions"
                  theme="amber"
                />
                <PolicyCheckboxGrid>
                  <PolicyToggleOption
                    label="Smoking allowed"
                    checked={formState.smokingAllowed}
                    onChange={(checked) =>
                      updateField("smokingAllowed", checked)
                    }
                    theme="amber"
                  />
                  <PolicyToggleOption
                    label="Private parties allowed"
                    checked={formState.privatePartiesAllowed}
                    onChange={(checked) =>
                      updateField("privatePartiesAllowed", checked)
                    }
                    theme="amber"
                  />
                  <PolicyToggleOption
                    label="Outside visitors allowed"
                    checked={formState.outsideVisitorsAllowed}
                    onChange={(checked) =>
                      updateField("outsideVisitorsAllowed", checked)
                    }
                    theme="amber"
                  />
                  <PolicyToggleOption
                    label="Wheelchair accessible"
                    checked={formState.wheelchairAccessible}
                    onChange={(checked) =>
                      updateField("wheelchairAccessible", checked)
                    }
                    theme="amber"
                  />
                </PolicyCheckboxGrid>
              </PolicySectionCard>

              <PolicySectionCard theme="rose">
                <PolicySectionHeader
                  icon={PawPrint}
                  title="Pet Policy"
                  theme="rose"
                />
                <PolicyCheckboxGrid>
                  <PolicyToggleOption
                    label="Pets allowed"
                    checked={formState.petsAllowed}
                    onChange={(checked) => updateField("petsAllowed", checked)}
                    theme="rose"
                  />
                  <PolicyToggleOption
                    label="Pets living on property"
                    checked={formState.petsLivingOnProperty}
                    onChange={(checked) =>
                      updateField("petsLivingOnProperty", checked)
                    }
                    theme="rose"
                  />
                </PolicyCheckboxGrid>
              </PolicySectionCard>

              <PolicySectionCard theme="slate">
                <PolicySectionHeader
                  icon={FileText}
                  title="Custom Policy"
                  subtitle="This text will be shared with guests during booking and check-in."
                  theme="slate"
                />
                <Textarea
                  placeholder="Add any additional policy information for guests."
                  value={formState.customPolicyText}
                  onChange={(e) => updateField("customPolicyText", e.target.value)}
                  rows={4}
                  className="rounded-lg border-slate-200 bg-slate-50/50 focus:border-[#2f3d95] focus:ring-[#2f3d95]/20"
                />
              </PolicySectionCard>
              <PolicySaveBar>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#2f3d95] hover:bg-[#263578] text-white"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </PolicySaveBar>
            </div>
          </TabsContent>

          <TabsContent value="cancellation">
            {viewingCancellationPolicy && !cancellationViewLoading ? (
              (() => {
                const viewingSlabs: CancellationSlabForm[] = (
                  viewingCancellationPolicy.slabs || []
                )
                  .filter((slab) => slab.toHours > slab.fromHours)
                  .map((slab) => {
                    const isFixedByAmount =
                      slab.penaltyType === "FIXED" ||
                      (typeof slab.penaltyAmount === "number" &&
                        slab.penaltyAmount > 0 &&
                        slab.penaltyType !== "PERCENTAGE");
                    const penaltyType: SlabPenaltyType = isFixedByAmount
                      ? "FIXED"
                      : "PERCENTAGE";
                    const fallbackPercent =
                      typeof slab.refundPercent === "number"
                        ? Math.max(0, Math.min(100, 100 - slab.refundPercent))
                        : 0;
                    const penaltyValue =
                      typeof slab.penaltyValue === "number"
                        ? slab.penaltyValue
                        : penaltyType === "FIXED"
                        ? slab.penaltyAmount ?? 0
                        : fallbackPercent;
                    return {
                      fromHours: slab.fromHours,
                      toHours: slab.toHours,
                      penaltyType,
                      penaltyValue,
                    };
                  });
                const viewingNoShowType = normalizeNoShowType(
                  viewingCancellationPolicy.noShowPenaltyType,
                );
                const viewingNoShowValue =
                  viewingNoShowType === "PERCENTAGE" ||
                  viewingNoShowType === "FIXED"
                    ? Number(viewingCancellationPolicy.noShowPenaltyValue ?? 0)
                    : null;
                const viewingPreset = resolveCancellationPreset(
                  normalizeCreationType(viewingCancellationPolicy.creationType),
                  viewingSlabs,
                  viewingNoShowType,
                  viewingNoShowValue,
                );
                const viewingIsCustom = isCustomCancellationPolicy(
                  {
                    ...viewingCancellationPolicy,
                    creationType: normalizeCreationType(
                      viewingCancellationPolicy.creationType,
                    ),
                  },
                  viewingPreset,
                );

                return (
              <div className="mt-2 rounded-xl border border-cyan-100 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-linear-to-r from-cyan-50 to-indigo-50 border-b border-cyan-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-cyan-700" />
                      View Cancellation Policy
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Read-only view aligned with cancellation create form.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                    onClick={() => setViewingCancellationPolicy(null)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Policies
                  </Button>
                </div>

                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-gray-200 px-3 py-2 bg-slate-50/50">
                      <p className="text-xs text-gray-500">Policy Name</p>
                      <p className="font-medium text-gray-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        {viewingCancellationPolicy.policyName}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 px-3 py-2 bg-slate-50/50">
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="font-medium text-emerald-700">
                        {viewingCancellationPolicy.status}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 px-3 py-2 bg-slate-50/50">
                      <p className="text-xs text-gray-500">Created By</p>
                      <p className="font-medium text-gray-900 flex items-center gap-1.5">
                        <UserCircle2 className="w-4 h-4 text-slate-600" />
                        {viewingCancellationPolicy.createdByEmail || "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 px-3 py-2 bg-slate-50/50">
                      <p className="text-xs text-gray-500">Created At</p>
                      <p className="font-medium text-gray-900 flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4 text-slate-600" />
                        {new Date(viewingCancellationPolicy.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 px-3 py-2 bg-slate-50/50">
                      <p className="text-xs text-gray-500">Apply Channel</p>
                      <p className="font-medium text-gray-900">
                        {viewingCancellationPolicy.applyChannel || "B2C"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 px-3 py-2 bg-slate-50/50">
                      <p className="text-xs text-gray-500">Effective Dates</p>
                      {!viewingCancellationPolicy.effectiveFrom &&
                      !viewingCancellationPolicy.effectiveTo ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          Not set
                        </span>
                      ) : (
                        <p className="font-medium text-gray-900">
                          {formatEffectiveDatesDisplay(
                            viewingCancellationPolicy.effectiveFrom,
                            viewingCancellationPolicy.effectiveTo,
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {viewingIsCustom ? (
                    <div className="rounded-lg border border-cyan-100 overflow-hidden">
                      <div className="px-4 py-2 bg-cyan-50 text-xs font-semibold text-cyan-900">
                        Custom Conditions
                      </div>
                      <div className="grid grid-cols-4 bg-cyan-50 text-xs font-semibold text-cyan-900 px-4 py-2">
                        <span>From</span>
                        <span>To</span>
                        <span>Penalty Type</span>
                        <span>Value</span>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {[...viewingSlabs]
                          .sort((a, b) => b.fromHours - a.fromHours)
                          .map((slab) => (
                            <div
                              key={`${slab.fromHours}-${slab.toHours}-${slab.penaltyType}-${slab.penaltyValue}`}
                              className="grid grid-cols-4 items-center px-4 py-2 text-sm"
                            >
                              <span>{formatBeforeCheckinLabel(slab.fromHours)}</span>
                              <span>{formatBeforeCheckinLabel(slab.toHours)}</span>
                              <span>
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                    slab.penaltyType === "PERCENTAGE"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-fuchsia-100 text-fuchsia-800"
                                  }`}
                                >
                                  {slab.penaltyType === "PERCENTAGE"
                                    ? "Percentage"
                                    : "Fixed"}
                                </span>
                              </span>
                              <span>
                                {slab.penaltyType === "PERCENTAGE"
                                  ? `${Number(slab.penaltyValue ?? 0)}%`
                                  : `Rs ${Number(slab.penaltyValue ?? 0)}`}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Cancellation Option
                      </h4>
                      <p className="text-sm text-blue-900 font-medium">
                        {getCancellationPresetLabel(viewingPreset)}
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="text-sm font-semibold text-emerald-900 mb-2">
                      Cancellation Summary
                    </p>
                    <div className="space-y-1">
                      {[...viewingSlabs]
                        .sort((a, b) => b.fromHours - a.fromHours)
                        .map((slab) => (
                          <p
                            key={`summary-${slab.fromHours}-${slab.toHours}`}
                            className="text-sm text-emerald-900"
                          >
                            {slab.fromHours === 0
                              ? `< ${formatBeforeCheckinLabel(slab.toHours)}`
                              : slab.toHours >= 9999
                              ? `> ${formatBeforeCheckinLabel(slab.fromHours)}`
                              : `${formatBeforeCheckinLabel(slab.fromHours)} to ${formatBeforeCheckinLabel(slab.toHours)}`}{" "}
                            -{" "}
                            {slab.penaltyType === "PERCENTAGE"
                              ? `${Number(slab.penaltyValue ?? 0)}% charge`
                              : `Rs ${Number(slab.penaltyValue ?? 0)} charge`}
                          </p>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      No-show Penalty
                    </h4>
                    <div className="rounded-md bg-white/80 border border-blue-200 px-3 py-2 flex items-center justify-between gap-2">
                      <p className="text-sm text-blue-900 font-medium">No-show</p>
                      <span className="inline-flex rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-semibold">
                        {viewingNoShowType === "PERCENTAGE"
                          ? `${Number(viewingNoShowValue ?? 0)}% charge`
                          : viewingNoShowType === "FIXED"
                          ? `Rs ${Number(viewingNoShowValue ?? 0)} charge`
                          : `${NO_SHOW_LABELS[viewingNoShowType]}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
                );
              })()
            ) : !isCancellationModalOpen ? (
              <div className="mt-2 rounded-xl border border-indigo-100 bg-linear-to-b from-indigo-50/40 to-white shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Cancellation Policy
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage multiple cancellation policies for the hotel.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={resetCancellationForm}
                  >
                    + New Policy
                  </Button>
                </div>
              </div>

              <div className="space-y-4 border border-indigo-100 rounded-xl overflow-hidden shadow-sm bg-white">
                <div>
                  <div className="grid grid-cols-5 bg-indigo-50 text-xs font-semibold text-indigo-900 px-4 py-2">
                    <span>Name</span>
                    <span className="text-center">Rules</span>
                    <span className="text-center">Apply Channel</span>
                    <span className="text-center">No-show Penalty</span>
                    <span className="text-right">Action</span>
                  </div>
                  {cancellationLoading ? (
                    <div className="p-6 flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading policies...
                    </div>
                  ) : cancellationList.length === 0 ? (
                    <div className="p-6 flex items-start gap-3 text-sm text-gray-600">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-800">
                          No cancellation policies found.
                        </p>
                        <p>Create one using the form below.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {cancellationList.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-5 items-center px-4 py-3 text-sm hover:bg-indigo-50/40 transition"
                        >
                          <span className="truncate font-medium text-gray-900 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            {item.policyName}
                          </span>
                          <span className="text-center text-gray-700">
                            {item.slabs.filter((s) => s.toHours > s.fromHours).length}
                          </span>
                          <span className="text-center text-gray-700">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getApplyChannelBadgeClass(
                                item.applyChannel,
                              )}`}
                            >
                              {item.applyChannel || "B2C"}
                            </span>
                          </span>
                          <span className="text-center text-gray-700">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getNoShowBadgeClass(
                                normalizeNoShowType(item.noShowPenaltyType as string | undefined)
                              )}`}
                            >
                              {NO_SHOW_LABELS[
                                normalizeNoShowType(item.noShowPenaltyType as string | undefined)
                              ] || "None"}
                            </span>
                          </span>
                          <div className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                                onClick={() => loadCancellationView(item.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-violet-200 text-violet-700 hover:bg-violet-50"
                                onClick={() => loadCancellationDetail(item.id)}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {cancellationViewLoading && (
                <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50 text-sm text-indigo-700 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading policy details...
                </div>
              )}
            </div>
            ) : null}

            {isCancellationModalOpen && (
              <div className="mt-2 rounded-xl border border-violet-100 bg-linear-to-b from-violet-50/40 to-white shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {selectedCancellationId ? (
                      <Pencil className="w-5 h-5 text-violet-700" />
                    ) : (
                      <Plus className="w-5 h-5 text-violet-700" />
                    )}
                    {selectedCancellationId
                      ? "Edit Cancellation Policy"
                      : "New Cancellation Policy"}
                  </h3>
                  <Button
                    variant="outline"
                    className="border-violet-200 text-violet-700 hover:bg-violet-50"
                    onClick={closeCancellationModal}
                  >
                    Close
                  </Button>
                </div>

                <div className="space-y-6">
                      <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Policy name
                      </label>
                      <Input
                        ref={cancellationNameInputRef}
                        value={cancellationForm.policyName}
                        onChange={(e) =>
                          setCancellationForm((prev) => ({
                            ...prev,
                            policyName: e.target.value,
                          }))
                        }
                        placeholder="e.g. Standard 24 Hours Cancellation"
                          />
                          {cancellationErrors.policyName && (
                            <p className="mt-1 text-xs text-red-600">
                              {cancellationErrors.policyName}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Apply Channel
                            </label>
                            <select
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              value={cancellationForm.applyChannel ?? "B2C"}
                              onChange={(e) =>
                                setCancellationForm((prev) => ({
                                  ...prev,
                                  applyChannel: e.target.value as "B2C" | "B2B" | "BUNDLE",
                                }))
                              }
                            >
                              <option value="B2C">B2C</option>
                              <option value="B2B">B2B</option>
                              <option value="BUNDLE">BUNDLE</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Effective From
                            </label>
                            <Input
                              type="date"
                              value={cancellationForm.effectiveFrom ?? ""}
                              onChange={(e) =>
                                setCancellationForm((prev) => ({
                                  ...prev,
                                  effectiveFrom: e.target.value || null,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Effective To
                            </label>
                            <Input
                              type="date"
                              value={cancellationForm.effectiveTo ?? ""}
                              min={cancellationForm.effectiveFrom ?? undefined}
                              onChange={(e) =>
                                setCancellationForm((prev) => ({
                                  ...prev,
                                  effectiveTo: e.target.value || null,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Cancellation Options
                          </h4>
                          <div className="space-y-2">
                            {CANCELLATION_PRESET_OPTIONS.map((option) => (
                              <label
                                key={option.key}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                                  cancellationPreset === option.key
                                    ? "border-blue-400 bg-blue-100/60 text-blue-900"
                                    : "border-blue-100 bg-white text-gray-700 hover:bg-blue-50",
                                )}
                              >
                                <input
                                  type="radio"
                                  name="cancellationPreset"
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                  checked={cancellationPreset === option.key}
                                  onChange={() => {
                                    setCancellationPreset(option.key);
                                    const presetConfig = getPresetConfig(option.key);
                                    if (presetConfig) {
                                      setCancellationForm((prev) => ({
                                        ...prev,
                                        noShowPenaltyType: presetConfig.noShowPenaltyType,
                                        noShowPenaltyValue: presetConfig.noShowPenaltyValue,
                                        slabs: presetConfig.slabs,
                                      }));
                                      setShowRuleBuilder(false);
                                      setEditingRuleIndex(null);
                                      setRuleDraft(EMPTY_RULE_DRAFT);
                                      setRuleDraftErrors({});
                                    } else if (option.key === "CUSTOM") {
                                      setCancellationForm((prev) => ({
                                        ...prev,
                                        noShowPenaltyType: "PERCENTAGE",
                                        noShowPenaltyValue: 100,
                                        slabs: [],
                                      }));
                                      setShowRuleBuilder(false);
                                      setEditingRuleIndex(null);
                                      setRuleDraft(EMPTY_RULE_DRAFT);
                                      setRuleDraftErrors({});
                                    }
                                  }}
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      {cancellationPreset === "CUSTOM" ? (
                        <div className="rounded-xl border border-indigo-100 bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Custom Conditions
                            </h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              onClick={() => setShowRuleBuilder(true)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Condition
                            </Button>
                          </div>
                          <div className="border border-indigo-100 rounded-lg overflow-hidden">
                            <div className="grid grid-cols-5 bg-indigo-50 text-xs font-semibold text-indigo-900 px-4 py-2">
                              <span>From</span>
                              <span>To</span>
                              <span>Penalty Type</span>
                              <span>Value</span>
                              <span className="text-right">Action</span>
                            </div>
                            {cancellationForm.slabs.length === 0 ? (
                              <div className="px-4 py-5 text-sm text-gray-500">
                                No conditions added yet.
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-200">
                                {[...cancellationForm.slabs]
                                  .sort((a, b) => b.fromHours - a.fromHours)
                                  .map((slab) => {
                                    const sourceIndex = cancellationForm.slabs.findIndex(
                                      (item) =>
                                        item.fromHours === slab.fromHours &&
                                        item.toHours === slab.toHours &&
                                        item.penaltyType === slab.penaltyType &&
                                        item.penaltyValue === slab.penaltyValue
                                    );
                                    return (
                                      <div
                                        key={`${slab.fromHours}-${slab.toHours}-${slab.penaltyType}-${slab.penaltyValue}`}
                                        className="grid grid-cols-5 items-center px-4 py-2 text-sm hover:bg-indigo-50/30"
                                      >
                                        <span>{formatCancellationDuration(slab.fromHours)}</span>
                                        <span>{formatCancellationDuration(slab.toHours)}</span>
                                        <span>{SLAB_TYPE_LABELS[slab.penaltyType]}</span>
                                        <span>
                                          {slab.penaltyType === "PERCENTAGE"
                                            ? `${slab.penaltyValue}%`
                                            : `Rs ${slab.penaltyValue}`}
                                        </span>
                                        <div className="text-right">
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => startEditRule(sourceIndex)}
                                            >
                                              Edit
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => removeRule(sourceIndex)}
                                            >
                                              Delete
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                          {cancellationErrors.slabs && (
                            <p className="text-xs text-red-600">{cancellationErrors.slabs}</p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                          <p className="text-sm text-indigo-900">
                            Rule values are auto-applied from selected option. Choose{" "}
                            <span className="font-semibold">Custom</span> to add multiple conditions.
                          </p>
                        </div>
                      )}

                      {showRuleBuilder && (
                        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-4">
                          <h4 className="text-sm font-semibold text-sky-900 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            {editingRuleIndex === null
                              ? "Add Cancellation Rule"
                              : "Edit Cancellation Rule"}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BoundedHourSelect
                              label="From (before check-in)"
                              value={ruleDraft.fromHours}
                              options={CUSTOM_CONDITION_HOUR_OPTIONS}
                              formatOption={formatBeforeCheckinLabel}
                              error={ruleDraftErrors.fromHours}
                              onChange={(hours) => {
                                const nextDraft = {
                                  ...ruleDraft,
                                  fromHours: hours,
                                };
                                setRuleDraft(nextDraft);
                                setRuleDraftErrors(
                                  validateRuleDraft(nextDraft, editingRuleIndex),
                                );
                              }}
                            />
                            <BoundedHourSelect
                              label="To (before check-in)"
                              value={ruleDraft.toHours}
                              options={CUSTOM_CONDITION_HOUR_OPTIONS}
                              formatOption={formatBeforeCheckinLabel}
                              error={ruleDraftErrors.toHours}
                              onChange={(hours) => {
                                const nextDraft = {
                                  ...ruleDraft,
                                  toHours: hours,
                                };
                                setRuleDraft(nextDraft);
                                setRuleDraftErrors(
                                  validateRuleDraft(nextDraft, editingRuleIndex),
                                );
                              }}
                            />
                          </div>
                          {ruleDraftErrors.overlap && (
                            <p className="text-xs text-red-600">
                              {ruleDraftErrors.overlap}
                            </p>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Penalty Type
                            </p>
                            <div className="flex items-center gap-5">
                              {(Object.keys(SLAB_TYPE_LABELS) as SlabPenaltyType[]).map(
                                (type) => (
                                  <label key={type} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="radio"
                                      checked={ruleDraft.penaltyType === type}
                                      onChange={() =>
                                        setRuleDraft((prev) => ({
                                          ...prev,
                                          penaltyType: type,
                                        }))
                                      }
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    {SLAB_TYPE_LABELS[type]}
                                  </label>
                                )
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Value {ruleDraft.penaltyType === "PERCENTAGE" ? "(%)" : "(Rs)"}
                            </label>
                            <Input
                              type="number"
                              min={0}
                              value={ruleDraft.penaltyValue}
                              onChange={(e) =>
                                setRuleDraft((prev) => ({
                                  ...prev,
                                  penaltyValue: parseNumberInput(e.target.value),
                                }))
                              }
                            />
                            {ruleDraftErrors.penaltyValue && (
                              <p className="mt-1 text-xs text-red-600">
                                {ruleDraftErrors.penaltyValue}
                              </p>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowRuleBuilder(false);
                                setEditingRuleIndex(null);
                                setRuleDraft(EMPTY_RULE_DRAFT);
                                setRuleDraftErrors({});
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="button" onClick={saveRule}>
                              Save
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          No-show Penalty
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Penalty Type
                            </label>
                            <select
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              value={cancellationForm.noShowPenaltyType}
                              onChange={(e) => {
                                const type = e.target.value as NoShowPenaltyType;
                                setCancellationForm((prev) => ({
                                  ...prev,
                                  noShowPenaltyType: type,
                                  noShowPenaltyValue:
                                    type === "PERCENTAGE" || type === "FIXED"
                                      ? Number(prev.noShowPenaltyValue ?? 0)
                                      : null,
                                }));
                              }}
                            >
                              <option value="NONE">None</option>
                              <option value="PERCENTAGE">Percentage</option>
                              <option value="FIXED">Fixed</option>
                            </select>
                          </div>
                          {(cancellationForm.noShowPenaltyType === "PERCENTAGE" ||
                            cancellationForm.noShowPenaltyType === "FIXED") && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Value {cancellationForm.noShowPenaltyType === "PERCENTAGE" ? "(%)" : "(Rs)"}
                              </label>
                              <Input
                                type="number"
                                min={0}
                                max={
                                  cancellationForm.noShowPenaltyType === "PERCENTAGE"
                                    ? 100
                                    : undefined
                                }
                                value={cancellationForm.noShowPenaltyValue ?? ""}
                                onChange={(e) =>
                                  setCancellationForm((prev) => ({
                                    ...prev,
                                    noShowPenaltyValue: parseNumberInput(e.target.value),
                                  }))
                                }
                                placeholder="e.g. 100"
                              />
                              {cancellationErrors.noShowPenaltyValue && (
                                <p className="mt-1 text-xs text-red-600">
                                  {cancellationErrors.noShowPenaltyValue}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Cancellation Summary
                        </h4>
                        {cancellationForm.slabs.length === 0 ? (
                          <div className="rounded-lg border border-emerald-200 bg-white/70 p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-emerald-900">
                                Add rules to see live preview
                              </p>
                              <p className="text-xs text-emerald-800">
                                Once you add cancellation slabs, summary lines will appear here.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {[...cancellationForm.slabs]
                              .sort((a, b) => b.fromHours - a.fromHours)
                              .map((slab) => (
                                <p
                                  key={`preview-${slab.fromHours}-${slab.toHours}-${slab.penaltyType}-${slab.penaltyValue}`}
                                  className="text-sm text-emerald-900 rounded-md bg-white/75 border border-emerald-200 px-3 py-1.5"
                                >
                                  {slab.fromHours === 0
                                    ? `< ${formatCancellationDuration(slab.toHours)}`
                                    : slab.toHours >= 9999
                                    ? `> ${formatCancellationDuration(slab.fromHours)}`
                                    : `${formatCancellationDuration(slab.fromHours)} - ${formatCancellationDuration(slab.toHours)}`}{" "}
                                  -{" "}
                                  {slab.penaltyType === "PERCENTAGE"
                                    ? `${slab.penaltyValue}% charge`
                                    : `Rs ${slab.penaltyValue} charge`}
                                </p>
                              ))}
                          </div>
                        )}
                        <div className="rounded-md bg-white/75 border border-emerald-200 px-3 py-2 flex items-center justify-between gap-2">
                          <p className="text-sm text-emerald-900 font-medium">No-show</p>
                          <span className="inline-flex rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-semibold">
                            {cancellationForm.noShowPenaltyType === "PERCENTAGE"
                              ? `${cancellationForm.noShowPenaltyValue ?? 0}% charge`
                              : cancellationForm.noShowPenaltyType === "FIXED"
                              ? `Rs ${cancellationForm.noShowPenaltyValue ?? 0} charge`
                              : `${NO_SHOW_LABELS[cancellationForm.noShowPenaltyType]}`}
                          </span>
                        </div>
                      </div>
                  </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button variant="outline" onClick={closeCancellationModal}>
                    Cancel
                  </Button>
                  <Button onClick={saveCancellation} disabled={cancellationSaving}>
                    {cancellationSaving ? "Saving..." : "Save Policy"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="child">
            <PolicySectionCard className="mt-0 space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <PolicySectionHeader
                  icon={UserCircle2}
                  title="Child Policy"
                  subtitle="Define age limits for free and paid child stays."
                  theme="violet"
                />
                {!childLoading && (
                  <Button
                    variant="outline"
                    onClick={openChildPolicyModal}
                  >
                    {hasChildPolicy ? "Edit Policy" : "+ Create Policy"}
                  </Button>
                )}
              </div>

              {childLoading ? (
                <div className="p-6 flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading policy...
                </div>
              ) : hasChildPolicy ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Current Child Policy
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 font-medium">
                          Children Allowed:
                        </span>{" "}
                        <span className="text-gray-900 font-semibold">
                          {childPolicy.childrenAllowed ? "Yes" : "No"}
                        </span>
                      </div>
                      {childPolicy.childrenAllowed && (
                        <>
                          <div>
                            <span className="text-gray-600 font-medium">
                              Free Stay Max Age:
                            </span>{" "}
                            <span className="text-gray-900 font-semibold">
                              {childPolicy.freeStayMaxAge} years
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">
                              Paid Stay Max Age:
                            </span>{" "}
                            <span className="text-gray-900 font-semibold">
                              {childPolicy.paidStayMaxAge} years
                            </span>
      </div>
    </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 flex items-start gap-3 text-sm text-gray-600 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">
                      No child policy found.
                    </p>
                    <p>Create one using the button above.</p>
                  </div>
                </div>
              )}
            </PolicySectionCard>

            {isChildPolicyModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-lg rounded-xl bg-white shadow-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {hasChildPolicy ? "Edit Child Policy" : "Create Child Policy"}
                    </h3>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                      onClick={closeChildPolicyModal}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={childPolicy.childrenAllowed}
                        onChange={(e) =>
                          setChildPolicy((prev) => ({
                            ...prev,
                            childrenAllowed: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        Children allowed at the property
                      </span>
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Free stay max age (years)
                        </label>
                        <Input
                          ref={childPolicyFreeAgeInputRef}
                          type="number"
                          min={0}
                          disabled={!childPolicy.childrenAllowed}
                          value={childPolicy.freeStayMaxAge}
                          onChange={(e) =>
                            setChildPolicy((prev) => ({
                              ...prev,
                              freeStayMaxAge: Number(e.target.value),
                            }))
                          }
                          placeholder="e.g. 5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Paid stay max age (years)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          disabled={!childPolicy.childrenAllowed}
                          value={childPolicy.paidStayMaxAge}
                          onChange={(e) =>
                            setChildPolicy((prev) => ({
                              ...prev,
                              paidStayMaxAge: Number(e.target.value),
                            }))
                          }
                          placeholder="e.g. 12"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={closeChildPolicyModal}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveChildPolicy} disabled={childSaving}>
                      {childSaving ? "Saving..." : "Save Policy"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payment">
            <PolicySectionCard className="mt-0 space-y-6 border-teal-100">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <PolicySectionHeader
                  icon={CreditCard}
                  title="Payment Policy"
                  subtitle="Manage how guests pay for this hotel."
                  theme="teal"
                />
                {!paymentLoading && (
                  <Button
                    variant="outline"
                    className="border-teal-200 text-teal-800 hover:bg-teal-50"
                    onClick={() => openPaymentModal()}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Payment Rule
                  </Button>
                )}
              </div>

              {paymentLoading ? (
                <div className="p-6 flex items-center gap-2 text-sm text-teal-800">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading payment rules...
                </div>
              ) : paymentRules.length === 0 ? (
                <div className="p-6 flex items-start gap-3 text-sm text-gray-600 border border-teal-100 rounded-lg bg-white/80">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">
                      No payment rules found.
                    </p>
                    <p>Create one using the button above.</p>
                  </div>
                </div>
              ) : (
                <div className="border border-teal-100 rounded-xl overflow-hidden bg-white">
                  <div className="grid grid-cols-5 bg-teal-50 text-xs font-semibold text-teal-900 px-4 py-2">
                    <span>Payment Type</span>
                    <span className="text-center">Advance %</span>
                    <span className="text-center">Status</span>
                    <span>Allowed Modes</span>
                    <span className="text-right">Action</span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {paymentRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="grid grid-cols-5 items-center px-4 py-3 text-sm hover:bg-teal-50/40 transition"
                      >
                        <span className="truncate font-medium text-gray-900 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-teal-600 shrink-0" />
                          {rule.paymentType.replace(/_/g, " ")}
                        </span>
                        <span className="text-center text-gray-700 font-medium">
                          {rule.advancePercent}%
                        </span>
                        <span className="text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              rule.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {rule.status}
                          </span>
                        </span>
                        <span className="text-gray-700 text-xs flex flex-wrap gap-1">
                          {(rule.allowedModes?.length ? rule.allowedModes : []).map((mode) => (
                            <span
                              key={`${rule.id}-${mode}`}
                              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700"
                            >
                              {mode}
                            </span>
                          ))}
                          {!rule.allowedModes?.length && (
                            <span className="text-gray-400">—</span>
                          )}
                        </span>
                        <div className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-teal-200 text-teal-800 hover:bg-teal-50"
                            onClick={() => openPaymentModal(rule)}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PolicySectionCard>

            {isPaymentModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4">
                <div className="w-full max-w-lg rounded-2xl border border-teal-100 bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="px-5 py-4 bg-linear-to-r from-teal-50 to-cyan-50 border-b border-teal-100 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-teal-700" />
                      {selectedPaymentRule ? "Edit Payment Rule" : "New Payment Rule"}
                    </h3>
                    <button
                      type="button"
                      className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white/80 transition"
                      onClick={closePaymentModal}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-5 space-y-5 overflow-y-auto flex-1">
                    <div className="rounded-xl border border-teal-100 bg-teal-50/30 p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                            <Wallet className="w-3.5 h-3.5 text-teal-600" />
                            Payment Type
                          </label>
                          <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                            value={paymentForm.paymentType}
                            onChange={(e) =>
                              setPaymentForm((prev) => {
                                const nextType = e.target.value as PaymentRulePayload["paymentType"];
                                const nextAdvance =
                                  nextType === "FULL_PREPAID"
                                    ? 100
                                    : nextType === "PAY_AT_HOTEL"
                                      ? 0
                                      : prev.advancePercent;
                                const nextModes =
                                  nextType === "FULL_PREPAID"
                                    ? prev.allowedModes.filter((mode) => mode !== "CASH")
                                    : prev.allowedModes;
                                return {
                                  ...prev,
                                  paymentType: nextType,
                                  advancePercent: nextAdvance,
                                  allowedModes: nextModes,
                                };
                              })
                            }
                          >
                            <option value="FULL_PREPAID">Full Prepaid</option>
                            <option value="PAY_AT_HOTEL">Pay at Hotel</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                            Status
                          </label>
                          <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                            value={paymentForm.status}
                            onChange={(e) =>
                              setPaymentForm((prev) => ({
                                ...prev,
                                status: e.target.value as PaymentRulePayload["status"],
                              }))
                            }
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </select>
                        </div>
                      </div>
                      {paymentForm.paymentType === "PARTIAL_PREPAID" && (
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                          <Percent className="w-3.5 h-3.5 text-teal-600" />
                          Advance percent
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={paymentForm.advancePercent}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              advancePercent: Number(e.target.value),
                            }))
                          }
                          placeholder="e.g. 100"
                        />
                      </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        Allowed payment modes
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {visiblePaymentModes.map((mode) => {
                          const isSelected = paymentForm.allowedModes.includes(mode);
                          return (
                            <label
                              key={mode}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                                isSelected
                                  ? "border-teal-400 bg-teal-50 text-teal-900"
                                  : "border-gray-200 bg-white hover:border-teal-200 hover:bg-teal-50/40"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPaymentForm((prev) => ({
                                      ...prev,
                                      allowedModes: [...prev.allowedModes, mode],
                                    }));
                                  } else {
                                    setPaymentForm((prev) => ({
                                      ...prev,
                                      allowedModes: prev.allowedModes.filter((m) => m !== mode),
                                    }));
                                  }
                                }}
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 rounded"
                              />
                              {mode}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/80 shrink-0">
                    <Button variant="outline" onClick={closePaymentModal}>
                      Cancel
                    </Button>
                    <Button
                      onClick={savePaymentRule}
                      disabled={paymentSaving}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {paymentSaving ? "Saving..." : "Save Rule"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

