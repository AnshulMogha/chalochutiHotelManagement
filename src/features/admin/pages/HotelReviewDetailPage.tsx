import { useState, useEffect } from "react";
import { useParams, useNavigate, Outlet, useLocation } from "react-router";
import { MultiStepForm } from "@/components/ui";
import { FormContextProvider } from "@/features/properties/context/FormContextProvider";
import { useFormContext } from "@/features/properties/context/useFormContext";
import { propertyService } from "@/features/properties/services/propertyService";
import { adminService } from "../services/adminService";
import { Button } from "@/components/ui";
import { CheckCircle, XCircle } from "lucide-react";
import { ApproveRejectModal } from "../components/ApproveRejectModal";

const stepRoutes = [
  { id: "basic_info", title: "Basic Info" },
  { id: "location", title: "Location" },
  { id: "amenities", title: "Amenities" },
  { id: "rooms", title: "Rooms" },
  { id: "media", title: "Media" },
  { id: "policies", title: "Policies" },
  { id: "finance", title: "Finance and Legal" },
];

export default function HotelReviewDetailPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <FormContextProvider>
        <Container />
      </FormContextProvider>
    </div>
  );
}

function Container() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [ongoingStep, setOngoingStep] = useState<string | null>(null);
  const { formDataState } = useFormContext();
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const stepId = pathParts[pathParts.length - 1];
    const stepIndex = stepRoutes.findIndex((step) => step.id === stepId);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    } else if (pathParts[pathParts.length - 2] === hotelId) {
      // If we're at the hotel detail page without a step, go to first step
      navigate(`/admin/hotels/review/${hotelId}/basic_info`, { replace: true });
    }
  }, [location.pathname, hotelId, navigate]);

  useEffect(() => {
    async function getCurrentStep() {
      if (!hotelId) return;
      try {
        const response = await propertyService.getOnboardingStatus(hotelId);
        setOngoingStep(response.currentStep.toLowerCase());
        const stepIndex = stepRoutes.findIndex(
          (step) => step.id === response.currentStep.toLowerCase()
        );
        if (stepIndex !== -1) {
          setCurrentStep(stepIndex);
        }
      } catch (error) {
        console.error("Error fetching onboarding status:", error);
      }
    }
    getCurrentStep();
  }, [hotelId]);

  const handleStepChange = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < stepRoutes.length) {
      setCurrentStep(stepIndex);
      navigate(`/admin/hotels/review/${hotelId}/${stepRoutes[stepIndex].id}`);
    }
  };

  const handleApprove = async (remarks: string) => {
    if (!hotelId) return;
    setIsProcessing(true);
    try {
      await adminService.approveHotel(hotelId, { remarks });
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
    if (!hotelId) return;
    setIsProcessing(true);
    try {
      await adminService.rejectHotel(hotelId, { remarks });
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Review Hotel: {formDataState.basicInfo?.name || "Loading..."}
          </h1>
          <p className="text-gray-600 mt-1">View-only mode - No edits allowed</p>
        </div>
        <div className="flex gap-3">
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
      </div>

      <MultiStepForm
        errorCount={0}
        steps={stepRoutes}
        currentStep={currentStep}
        allowedStep={stepRoutes.length - 1}
        onNext={() => handleStepChange(currentStep + 1)}
        onPrev={() => handleStepChange(currentStep - 1)}
        onSubmit={() => {}}
        draftId={hotelId!}
        readOnly={true}
      >
        <Outlet context={{ readOnly: true }} />
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

