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
import { AlertCircle, Loader2 } from "lucide-react";

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
      freeCancellationTillHours: 0,
      noShowPenalty: "NONE",
    });
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancellationSaving, setCancellationSaving] = useState(false);
  const cancellationNameInputRef = useRef<HTMLInputElement | null>(null);
  const [isCancellationModalOpen, setIsCancellationModalOpen] =
    useState(false);
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
    refundable: false,
    refundBeforeHours: null,
    allowedModes: [],
    effectiveFrom: "",
    effectiveTo: "",
  });

  const NO_SHOW_LABELS: Record<string, string> = {
    NONE: "None",
    FIRST_NIGHT_COST: "First night cost",
    FULL_STAY_COST: "Full stay cost",
  };

  const parseNumberInput = (value: string): NumericInput => {
    if (value === "") return "";
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
      setCancellationForm({
        policyName: detail.policyName,
        // Backend derives slabs from this simple payload; for editing,
        // approximate free-cancel hours from the 100% refund slab and
        // no-show penalty from a 0/0 hours slab.
        freeCancellationTillHours:
          detail.slabs.find(
            (s) => s.refundPercent === 100 && s.penaltyType === null
          )?.fromHours ?? 0,
        noShowPenalty:
          detail.slabs.find(
            (s) => s.fromHours === 0 && s.toHours === 0 && s.penaltyType
          )?.penaltyType ?? "NONE",
      });
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

  const resetCancellationForm = () => {
    setCancellationForm({
      policyName: "",
      freeCancellationTillHours: 0,
      noShowPenalty: "NONE",
    });
    setSelectedCancellationId(null);
    setIsCancellationModalOpen(true);
    if (cancellationNameInputRef.current) {
      cancellationNameInputRef.current.focus();
    }
  };

  const saveCancellation = async () => {
    if (!hotelId) return;
    if (!cancellationForm.policyName) {
      showToast("Policy name is required", "error");
      return;
    }
    setCancellationSaving(true);
    try {
      if (selectedCancellationId) {
        await adminService.updateCancellationPolicy(
          hotelId,
          selectedCancellationId,
          cancellationForm
        );
      } else {
        await adminService.createCancellationPolicy(hotelId, cancellationForm);
      }
      showToast("Cancellation policy saved", "success");
      resetCancellationForm();
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
      setPaymentForm({
        paymentType: rule.paymentType,
        status: rule.status,
        advancePercent: rule.advancePercent,
        refundable: rule.refundable,
        refundBeforeHours: rule.refundBeforeHours,
        allowedModes: [...rule.allowedModes],
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
      });
    } else {
      setSelectedPaymentRule(null);
      setPaymentForm({
        paymentType: "FULL_PREPAID",
        status: "ACTIVE",
        advancePercent: 100,
        refundable: false,
        refundBeforeHours: null,
        allowedModes: [],
        effectiveFrom: "",
        effectiveTo: "",
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
    if (!paymentForm.effectiveFrom || !paymentForm.effectiveTo) {
      showToast("Effective dates are required", "error");
      return;
    }
    setPaymentSaving(true);
    try {
      if (selectedPaymentRule) {
        await adminService.updatePaymentRule(hotelId, paymentForm);
      } else {
        await adminService.createPaymentRule(hotelId, paymentForm);
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
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
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between flex-col md:flex-row md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Policy and Rules</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage check-in/check-out times, cancellation, child and meal policies for this hotel.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Tabs
          defaultValue="policy"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="policy">Policy</TabsTrigger>
            <TabsTrigger value="cancellation">Cancellation Policy</TabsTrigger>
            <TabsTrigger value="child">Child Policy</TabsTrigger>
            <TabsTrigger value="payment">Payment Policy</TabsTrigger>
          </TabsList>

          <TabsContent value="policy">
            <div className="space-y-6 mt-2">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Check-in & Check-out Time
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check-in Time
              </label>
              <Input
                type="time"
                      value={formState.checkinTime}
                      onChange={(e) => updateField("checkinTime", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check-out Time
              </label>
              <Input
                type="time"
                      value={formState.checkoutTime}
                      onChange={(e) =>
                        updateField("checkoutTime", e.target.value)
                      }
              />
            </div>
          </div>
                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="twentyFourCheckin"
                    checked={formState.twentyFourHourCheckin}
                    onChange={(e) =>
                      updateField("twentyFourHourCheckin", e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <label
                    htmlFor="twentyFourCheckin"
                    className="text-sm text-gray-700"
                  >
                    24-hour check-in available
                  </label>
                </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Guest Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.unmarriedCouplesAllowed}
                      onChange={(e) =>
                        updateField("unmarriedCouplesAllowed", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Unmarried couples allowed
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.below18Allowed}
                      onChange={(e) =>
                        updateField("below18Allowed", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Guests below 18 allowed
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.onlyMaleGroupAllowed}
                      onChange={(e) =>
                        updateField("onlyMaleGroupAllowed", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Only male groups allowed
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Identity Proofs
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Select acceptable identity proofs for check-in.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ID_PROOF_OPTIONS.map((proof) => {
                    const isSelected = formState.acceptableIdProofs.includes(
                      proof.value
                    );
                    return (
                      <label
                        key={proof.value}
                        className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...formState.acceptableIdProofs, proof.value]
                              : formState.acceptableIdProofs.filter(
                                  (item) => item !== proof.value
                                );
                            updateField("acceptableIdProofs", updated);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          {proof.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Property Restrictions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.smokingAllowed}
                      onChange={(e) =>
                        updateField("smokingAllowed", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Smoking allowed
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.privatePartiesAllowed}
                      onChange={(e) =>
                        updateField("privatePartiesAllowed", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Private parties allowed
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.outsideVisitorsAllowed}
                      onChange={(e) =>
                        updateField("outsideVisitorsAllowed", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Outside visitors allowed
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.wheelchairAccessible}
                      onChange={(e) =>
                        updateField("wheelchairAccessible", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Wheelchair accessible
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Pet Policy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.petsAllowed}
                      onChange={(e) =>
                        updateField("petsAllowed", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">Pets allowed</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formState.petsLivingOnProperty}
                      onChange={(e) =>
                        updateField("petsLivingOnProperty", e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Pets living on property
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Custom Policy
                </h3>
                <Textarea
                  placeholder="Add any additional policy information for guests."
                  value={formState.customPolicyText}
                  onChange={(e) => updateField("customPolicyText", e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-2">
                  This text will be shared with guests during booking and check-in.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cancellation">
            <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
            Cancellation Policy
          </h3>
                  <p className="text-sm text-gray-600">
                    Manage multiple cancellation policies for the hotel.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={resetCancellationForm}>
                    + New Policy
                  </Button>
                </div>
              </div>

              <div className="space-y-4 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div>
                  <div className="grid grid-cols-4 bg-slate-50 text-xs font-semibold text-slate-700 px-4 py-2">
                    <span>Name</span>
                    <span className="text-center">Free Cancel (hrs)</span>
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
                          className="grid grid-cols-4 items-center px-4 py-3 text-sm hover:bg-slate-50 transition"
                        >
                          <span className="truncate font-medium text-gray-900">
                            {item.policyName}
                          </span>
                          <span className="text-center text-gray-700">
                            {item.slabs.find(
                              (s) =>
                                s.refundPercent === 100 && s.penaltyType === null
                            )?.fromHours ?? "-"}
                          </span>
                          <span className="text-center text-gray-700">
                            {(() => {
                              const slab = item.slabs.find(
                                (s) =>
                                  s.fromHours === 0 &&
                                  s.toHours === 0 &&
                                  s.penaltyType
                              );
                              return slab
                                ? NO_SHOW_LABELS[slab.penaltyType || ""] ||
                                    slab.penaltyType
                                : "None";
                            })()}
                          </span>
                          <div className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                loadCancellationDetail(item.id)
                              }
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isCancellationModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-lg rounded-xl bg-white shadow-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedCancellationId ? "Edit Cancellation Policy" : "New Cancellation Policy"}
                    </h3>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => setIsCancellationModalOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3">
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
                        placeholder="Standard 24 Hours Cancellation"
            />
          </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Free cancellation till (hours)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={cancellationForm.freeCancellationTillHours}
                          onChange={(e) =>
                            setCancellationForm((prev) => ({
                              ...prev,
                              freeCancellationTillHours: Number(e.target.value),
                            }))
                          }
                          placeholder="e.g. 24"
                        />
        </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          No-show penalty
                        </label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          value={cancellationForm.noShowPenalty}
                          onChange={(e) =>
                            setCancellationForm((prev) => ({
                              ...prev,
                              noShowPenalty: e.target.value,
                            }))
                          }
                        >
                          <option value="NONE">None</option>
                          <option value="FIRST_NIGHT_COST">First night cost</option>
                          <option value="FULL_STAY_COST">Full stay cost</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCancellationModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveCancellation} disabled={cancellationSaving}>
                      {cancellationSaving ? "Saving..." : "Save Policy"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="child">
            <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Child Policy
                  </h3>
                  <p className="text-sm text-gray-600">
                    Define age limits for free and paid child stays.
          </p>
        </div>
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
            </div>

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
            <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Payment Policy
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage payment rules for the hotel.
                  </p>
                </div>
                {!paymentLoading && (
                  <Button variant="outline" onClick={() => openPaymentModal()}>
                    + New Payment Rule
                  </Button>
                )}
              </div>

              {paymentLoading ? (
                <div className="p-6 flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading payment rules...
                </div>
              ) : paymentRules.length === 0 ? (
                <div className="p-6 flex items-start gap-3 text-sm text-gray-600 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">
                      No payment rules found.
                    </p>
                    <p>Create one using the button above.</p>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-7 bg-slate-50 text-xs font-semibold text-slate-700 px-4 py-2">
                    <span>Payment Type</span>
                    <span className="text-center">Advance %</span>
                    <span className="text-center">Refundable</span>
                    <span className="text-center">Refund Hours</span>
                    <span className="text-center">Effective From</span>
                    <span className="text-center">Effective To</span>
                    <span className="text-right">Action</span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {paymentRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="grid grid-cols-7 items-center px-4 py-3 text-sm hover:bg-slate-50 transition"
                      >
                        <span className="truncate font-medium text-gray-900">
                          {rule.paymentType.replace(/_/g, " ")}
                        </span>
                        <span className="text-center text-gray-700">
                          {rule.advancePercent}%
                        </span>
                        <span className="text-center text-gray-700">
                          {rule.refundable ? "Yes" : "No"}
                        </span>
                        <span className="text-center text-gray-700">
                          {rule.refundBeforeHours ?? "-"}
                        </span>
                        <span className="text-center text-gray-700">
                          {new Date(rule.effectiveFrom).toLocaleDateString()}
                        </span>
                        <span className="text-center text-gray-700">
                          {new Date(rule.effectiveTo).toLocaleDateString()}
                        </span>
                        <div className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentModal(rule)}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isPaymentModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedPaymentRule ? "Edit Payment Rule" : "New Payment Rule"}
                    </h3>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                      onClick={closePaymentModal}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Type
                        </label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          value={paymentForm.paymentType}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              paymentType: e.target.value as PaymentRulePayload["paymentType"],
                            }))
                          }
                        >
                          <option value="FULL_PREPAID">Full Prepaid</option>
                          <option value="PARTIAL_PREPAID">Partial Prepaid</option>
                          <option value="PAY_AT_HOTEL">Pay at Hotel</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Advance Percent
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Refund Before Hours
                        </label>
                        <Input
                          type="number"
                          min={0}
                          disabled={!paymentForm.refundable}
                          value={paymentForm.refundBeforeHours ?? ""}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              refundBeforeHours:
                                e.target.value === "" ? null : Number(e.target.value),
                            }))
                          }
                          placeholder="e.g. 24"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={paymentForm.refundable}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              refundable: e.target.checked,
                              refundBeforeHours: e.target.checked
                                ? prev.refundBeforeHours
                                : null,
                            }))
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                        />
                        <span className="text-sm text-gray-700">Refundable</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allowed Payment Modes
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {["UPI", "CARD", "NETBANKING", "WALLET", "CASH"].map(
                          (mode) => {
                            const isSelected = paymentForm.allowedModes.includes(mode);
                            return (
                              <label
                                key={mode}
                                className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition cursor-pointer"
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
                                        allowedModes: prev.allowedModes.filter(
                                          (m) => m !== mode
                                        ),
                                      }));
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{mode}</span>
                              </label>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Effective From
                        </label>
                        <Input
                          type="date"
                          value={paymentForm.effectiveFrom}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              effectiveFrom: e.target.value,
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
                          value={paymentForm.effectiveTo}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              effectiveTo: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={closePaymentModal}>
                      Cancel
                    </Button>
                    <Button onClick={savePaymentRule} disabled={paymentSaving}>
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

