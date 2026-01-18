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
import { adminService } from "@/features/admin/services/adminService";
import { ApproveRejectModal } from "@/features/admin/components/ApproveRejectModal";
import { Button } from "@/components/ui";
import { CheckCircle, XCircle } from "lucide-react";

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
  { id: "finance", title: "Finance and Legal" },
];

function Container() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const draftId = searchParams.get("draftId");

  const currentStep = stepRoutes.findIndex((step) =>
    location.pathname.endsWith(step.id)
  );

  const [ongoingStep, setOngoingStep] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { formDataState } = useFormContext();
  const { user } = useAuth();

  // Check if user is super admin - if so, hide navigation buttons
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;

  // ✅ NEW: derive allowedStep from server step
  const allowedStep = ongoingStep
    ? stepRoutes.findIndex((step) => step.id === ongoingStep)
    : 0;
  const navigateWithParams = useCallback(
    (path: string) => {
      navigate({
        pathname: path,
        search: draftId ? `?draftId=${draftId}` : "",
      });
    },
    [draftId, navigate]
  );
  useEffect(() => {
    async function getCurrentStep() {
      if (!draftId) return;
      const response = await propertyService.getOnboardingStatus(draftId);
      setOngoingStep(response.currentStep.toLowerCase());
      // Check if status is SUBMITTED or APPROVED - then it's read-only
      // REJECTED hotels can be edited, so don't set read-only for them
      setIsReadOnly(
        response.status === "SUBMITTED" || response.status === "APPROVED"
      );
      navigateWithParams(response.currentStep.toLowerCase());
    }
    getCurrentStep();
  }, [draftId, navigateWithParams]);

  // 🔹 derived error count
  const errorCount = Object.values(errors).flatMap((e) =>
    Object.values(e ?? {})
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
        { hotelId: draftId! }
      );
      return true;
    },

    async () => {
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
  ];

  // 🔹 safe field error reset (UNCHANGED)
  const resetFieldError = <S extends keyof Errors, F extends string>(
    step: S,
    field: F
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
  const handleNext = async () => {
    const isValid = await stepSubmit[currentStep]();
    if (!isValid) return;

    navigateWithParams(stepRoutes[currentStep + 1].id);
    setOngoingStep(stepRoutes[currentStep + 1].id);
  };

  const handlePrev = () => {
    navigateWithParams(stepRoutes[currentStep - 1].id);
  };
  const handleSubmitFinanceAndLegal = async () => {
    const stepErrors = financeAndLegalValidator(
      formDataState.financeAndLegalInfo
    );

    if (stepErrors) {
      setErrors((prev) => ({ ...prev, financeAndLegalInfo: stepErrors }));
      return;
    }

    await submitFinanceAndLegalStep(formDataState.financeAndLegalInfo, {
      hotelId: draftId!,
    });
    navigate("/", { replace: true });
  };

  const handleApprove = async (remarks: string) => {
    if (!draftId) return;
    setIsProcessing(true);
    try {
      await adminService.approveHotel(draftId, { remarks });
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
      await adminService.rejectHotel(draftId, { remarks });
      navigate("/admin/hotels/review", { replace: true });
    } catch (error) {
      console.error("Error rejecting hotel:", error);
      alert("Failed to reject hotel. Please try again.");
    } finally {
      setIsProcessing(false);
      setShowRejectModal(false);
    }
  };

  return (
    <>
      {isSuperAdmin && draftId && (
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
        readOnly={isReadOnly || (isSuperAdmin && !!draftId)}
        allowStepNavigation={isSuperAdmin && !!draftId}
      >
        <Outlet context={{ errors, resetFieldError }} />
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
