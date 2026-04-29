import { MultiStepForm } from "@/components/ui";

import { useCallback, useEffect, useState } from "react";
import { FormContextProvider } from "../context/FormContextProvider";
import { useFormContext } from "../context/useFormContext";
import {
  useLocation,
  useNavigate,
  Outlet,
  useSearchParams,
} from "react-router";
import type { Errors } from "../types";
import { useAuth } from "@/hooks/useAuth";
import {
  canOnboardHotel,
  isQcReviewerRole,
  isZonalHotelReviewerRole,
} from "@/constants/roles";
import { adminService } from "@/features/admin/services/adminService";
import { ApproveRejectModal } from "@/features/admin/components/ApproveRejectModal";
import { Button } from "@/components/ui";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Toast, useToast } from "@/components/ui/Toast";

import {
  submitBasicInfoStep,
  submitLocationInfoStep,
  submitAmenitiesInfoStep,
  submitPoliciesStep,
  submitFinanceAndLegalStep,
} from "../submitter/stepSubmitters";

import {
  amenitiesValidator,
  basicInfoValidator,
  financeAndLegalValidator,
  locationValidator,
  policiesValidator,
} from "../submitter/stepValidators";

import { propertyService } from "../services/propertyService";
import type { ApiFailureResponse } from "@/services/api/types/api";

export default function CreatePropertyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormContextProvider>
        <Container />
      </FormContextProvider>
    </div>
  );
}

const stepRoutes = [
  { id: "basic_info", title: "Basic Info" },
  { id: "location", title: "Location" },
  { id: "amenities", title: "Amenities" },
  { id: "rooms", title: "Rooms" },
  { id: "media", title: "Media" },
  { id: "policies", title: "Policies" },
  { id: "documents", title: "Documents" },
  { id: "finance", title: "Finance and Legal" },
];
const REVIEW_CONTEXT_KEY = "hotel-review-context";
type ReviewTab = "pending" | "approved" | "rejected";
type StoredReviewContext = {
  tab?: ReviewTab;
  hotelId?: string | null;
  updatedAt?: number;
};

function Container() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const draftId = searchParams.get("draftId");
  const isForcedReadOnly = searchParams.get("readOnly") === "true";
  const reviewTabFromQuery = searchParams.get("reviewTab");
  const reviewTabFromState =
    (location.state as { reviewTab?: string } | null)?.reviewTab ?? null;
  const storedReviewContext: StoredReviewContext | null =
    typeof window !== "undefined"
      ? (() => {
          try {
            const raw = sessionStorage.getItem(REVIEW_CONTEXT_KEY);
            return raw ? (JSON.parse(raw) as StoredReviewContext) : null;
          } catch {
            return null;
          }
        })()
      : null;
  const reviewTabFromClientState =
    storedReviewContext?.hotelId &&
    draftId &&
    String(storedReviewContext.hotelId) === String(draftId)
      ? storedReviewContext.tab || null
      : null;
  const normalizedReviewTab = (
    reviewTabFromQuery ||
    reviewTabFromState ||
    reviewTabFromClientState ||
    ""
  )
    .trim()
    .toLowerCase();
  const reviewTab: ReviewTab | null =
    normalizedReviewTab === "pending" ||
    normalizedReviewTab === "approved" ||
    normalizedReviewTab === "rejected"
      ? normalizedReviewTab
      : null;

  const currentStep = stepRoutes.findIndex((step) =>
    location.pathname.endsWith(step.id),
  );

  const [ongoingStep, setOngoingStep] = useState<string | null>(null);
  const [hotelStatus, setHotelStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { formDataState } = useFormContext();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;
  const isQcUser = isQcReviewerRole(user?.roles);
  const isZonalUser = isZonalHotelReviewerRole(user?.roles);
  const isOnboardingReviewer =
    user?.roles?.includes("ONBOARDING_REVIEWER") ?? false;
  const isReviewActor =
    isSuperAdmin || isQcUser || isZonalUser || isOnboardingReviewer;
  const isAdminStyleReview = !!draftId && isReviewActor;
  const formReadOnly =
    isForcedReadOnly ||
    isReadOnly ||
    (isSuperAdmin && !!draftId) ||
    (isQcUser && !!draftId) ||
    (isZonalUser && !!draftId);

  const lastStepIndex = stepRoutes.length - 1;
  const onFinanceStep = currentStep >= 0 && currentStep === lastStepIndex;
  const isFinalReviewStatus =
    hotelStatus === "APPROVED" ||
    hotelStatus === "REJECTED" ||
    hotelStatus === "LIVE";
  const isPendingReviewContext =
    reviewTab === "pending" ||
    (reviewTab === null && !!draftId && isReviewActor && !isFinalReviewStatus);
  const showApproveRejectActions =
    !!draftId && isPendingReviewContext && onFinanceStep && isReviewActor;

  // ✅ NEW: derive allowedStep from server step
  const allowedStep = ongoingStep
    ? stepRoutes.findIndex((step) => step.id === ongoingStep)
    : 0;
  const navigateWithParams = useCallback(
    (path: string) => {
      const nextParams = new URLSearchParams();
      if (draftId) nextParams.set("draftId", draftId);
      if (isForcedReadOnly) nextParams.set("readOnly", "true");
      if (reviewTab) nextParams.set("reviewTab", reviewTab);
      navigate({
        pathname: path,
        search: nextParams.toString() ? `?${nextParams.toString()}` : "",
      });
    },
    [draftId, isForcedReadOnly, navigate, reviewTab],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !draftId || !reviewTab) return;
    sessionStorage.setItem(
      REVIEW_CONTEXT_KEY,
      JSON.stringify({
        tab: reviewTab,
        hotelId: draftId,
        updatedAt: Date.now(),
      }),
    );
  }, [draftId, reviewTab]);
  useEffect(() => {
    async function getCurrentStep() {
      if (!canOnboardHotel(user?.roles) || !draftId) return;
      const response = await propertyService.getOnboardingStatus(draftId);
      setOngoingStep(response.currentStep.toLowerCase());
      setHotelStatus((response.status || "").toUpperCase());
      // Check if status is SUBMITTED or APPROVED - then it's read-only
      // REJECTED hotels can be edited, so don't set read-only for them
      setIsReadOnly(
        response.status === "SUBMITTED" || response.status === "APPROVED",
      );
    }
    getCurrentStep();
  }, [draftId, navigateWithParams, user?.roles]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname, location.search]);

  // 🔹 derived error count
  const errorCount = Object.values(errors).flatMap((e) =>
    Object.values(e ?? {}),
  ).length;

  // 🔹 step submit handlers (UNCHANGED)
  const stepSubmit = [
    async () => {
      const stepErrors = basicInfoValidator(formDataState.basicInfo);
      if (stepErrors) {
        setErrors((prev) => ({ ...prev, basicInfo: stepErrors }));
        return false;
      }
      await submitBasicInfoStep(formDataState.basicInfo, { hotelId: draftId! });
      return true;
    },

    async () => {
      const stepErrors = locationValidator(formDataState.locationInfo);
      if (stepErrors) {
        setErrors((prev) => ({ ...prev, locationInfo: stepErrors }));
        return false;
      }
      await submitLocationInfoStep(formDataState.locationInfo, {
        hotelId: draftId!,
      });
      return true;
    },

    async () => {
      const stepErrors = amenitiesValidator(formDataState.amenitiesInfo);
      if (stepErrors) {
        setErrors((prev) => ({ ...prev, amenitiesInfo: stepErrors }));
        return false;
      }
      await submitAmenitiesInfoStep(
        formDataState.amenitiesInfo.selectedAmenities,
        { hotelId: draftId! },
      );
      return true;
    },

    async () => {
      const rooms = await propertyService.getAllRooms(draftId!);
      if (!rooms || rooms.length === 0) {
        showToast("Please add at least one room before proceeding.", "error");
        return false;
      }
      await propertyService.mediaOnboarding(false, draftId!);
      return true;
    },
    async () => {
      await propertyService.mediaOnboarding(true, draftId!);
      return true;
    },

    async () => {
      const stepErrors = policiesValidator(formDataState.policiesInfo);
      if (stepErrors) {
        setErrors((prev) => ({ ...prev, policiesInfo: stepErrors }));
        return false;
      }
      await submitPoliciesStep(formDataState.policiesInfo, {
        hotelId: draftId!,
      });
      return true;
    },

    async () => {
      // Documents step: allow moving next (draft: false is applied when user uploads on "Next" or backend marks step complete)
      return true;
    },
  ];

  // 🔹 safe field error reset (UNCHANGED)
  const resetFieldError = <S extends keyof Errors, F extends string>(
    step: S,
    field: F,
  ) => {
    setErrors((prev) => {
      const stepErrors = prev[step];
      if (!stepErrors || !stepErrors[field]) return prev;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [field]: _, ...rest } = stepErrors;

      return {
        ...prev,
        [step]: Object.keys(rest).length ? rest : undefined,
      };
    });
  };

  // ✅ UPDATED: block forward navigation beyond allowedStep
  const extractApiErrorMessage = (
    error: unknown,
    fallback: string = "Unable to proceed. Please review the form and try again.",
  ): string => {
    const apiError = error as ApiFailureResponse<Record<string, string>>;
    const fieldErrors = apiError?.data || {};
    if (fieldErrors && typeof fieldErrors === "object") {
      const firstFieldMessage = Object.values(fieldErrors).find(
        (value) => typeof value === "string" && value.trim().length > 0,
      );
      if (firstFieldMessage) return firstFieldMessage;
    }
    if (apiError?.message) return apiError.message;
    return fallback;
  };

  const handleNext = async () => {
    try {
      const isValid = await stepSubmit[currentStep]();
      if (!isValid) return;

      navigateWithParams(stepRoutes[currentStep + 1].id);
      setOngoingStep(stepRoutes[currentStep + 1].id);
    } catch (error: unknown) {
      showToast(extractApiErrorMessage(error), "error");
    }
  };

  const handlePrev = () => {
    navigateWithParams(stepRoutes[currentStep - 1].id);
  };

  const handleSubmitFinanceAndLegal = async () => {
    const stepErrors = financeAndLegalValidator(
      formDataState.financeAndLegalInfo,
    );

    if (stepErrors) {
      setErrors((prev) => ({ ...prev, financeAndLegalInfo: stepErrors }));
      return;
    }

    try {
      await submitFinanceAndLegalStep(formDataState.financeAndLegalInfo, {
        hotelId: draftId!,
      });
      navigate("/", { replace: true });
    } catch (error: any) {
      const apiError = error as ApiFailureResponse<Record<string, string>>;
      const data = apiError?.data || {};
      if (data.gstin) {
        setErrors((prev) => ({
          ...prev,
          financeAndLegalInfo: {
            gstin: data.gstin,
          },
        }));
        return;
      }
      const message =
        data.propertyName ||
        apiError?.message ||
        "Failed to submit finance and legal information. Please try again.";
      showToast(message, "error");
    }
  };

  const handleApprove = async (remarks: string) => {
    if (!draftId) return;
    setIsProcessing(true);
    try {
      if (!isSuperAdmin) {
        if (isZonalUser) {
          await adminService.zonalApproveHotel(draftId, { remarks });
        } else if (isQcUser) {
          await adminService.qcApproveHotel(draftId, { remarks });
        } else {
          await adminService.approveHotel(draftId, { remarks });
        }
      } else {
        await adminService.approveHotel(draftId, { remarks });
      }
      navigate("/admin/hotels/review", { replace: true });
    } catch (error) {
      console.error("Error approving hotel:", error);
      alert("Failed to approve hotel. Please try again.");
    } finally {
      setIsProcessing(false);
      setShowApproveModal(false);
    }
  };

  const handleReject = async (remarks: string) => {
    if (!draftId) return;
    setIsProcessing(true);
    try {
      if (!isSuperAdmin) {
        if (isZonalUser) {
          await adminService.zonalRejectHotel(draftId, { remarks });
        } else if (isQcUser) {
          await adminService.qcRejectHotel(draftId, { remarks });
        } else {
          await adminService.rejectHotel(draftId, { remarks });
        }
      } else {
        await adminService.rejectHotel(draftId, { remarks });
      }
      navigate("/admin/hotels/review", { replace: true });
    } catch (error) {
      console.error("Error rejecting hotel:", error);
      alert("Failed to reject hotel. Please try again.");
    } finally {
      setIsProcessing(false);
      setShowRejectModal(false);
    }
  };

  if (!canOnboardHotel(user?.roles)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-900 font-medium mb-2">
          You cannot onboard hotels with this account
        </p>
        <p className="text-gray-600 text-sm mb-6">
          Hotel onboarding is limited to Super Admins, Onboarding Reviewers,
          Hotel Owners, and Hotel BD. Ask a Super Admin to assign the correct
          role on <span className="font-medium">Admin → Users</span>.
        </p>
        <Button type="button" variant="primary" onClick={() => navigate("/")}>
          Back to properties
        </Button>
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
      <div className="mb-4 flex justify-start">
        <Button type="button" variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
      {showApproveRejectActions && !isFinalReviewStatus && (
        <div className="mb-6 flex justify-end items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowRejectModal(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowApproveModal(true)}
            disabled={isProcessing}
            className="gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </Button>
        </div>
      )}
      <MultiStepForm
        errorCount={errorCount}
        steps={stepRoutes}
        currentStep={currentStep}
        allowedStep={allowedStep} // ✅ NEW
        onNext={handleNext}
        onPrev={handlePrev}
        onSubmit={handleSubmitFinanceAndLegal}
        draftId={draftId!}
        readOnly={formReadOnly}
      >
        <Outlet
          context={{
            errors,
            resetFieldError,
            readOnly: formReadOnly,
          }}
        />
      </MultiStepForm>

      {showApproveModal && (
        <ApproveRejectModal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          onConfirm={handleApprove}
          type="approve"
          isLoading={isProcessing}
        />
      )}

      {showRejectModal && (
        <ApproveRejectModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
          type="reject"
          isLoading={isProcessing}
        />
      )}
    </>
  );
}
