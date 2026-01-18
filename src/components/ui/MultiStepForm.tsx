import { type ReactNode, useState } from "react";
import { Button } from "./Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FaCheck } from "react-icons/fa";
import { useNavigate } from "react-router";

export interface Step {
  id: string;
  title: string;
}

export interface MultiStepFormProps {
  errorCount: number;
  steps: Step[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void | Promise<void>;
  className?: string;
  children: ReactNode;
  allowedStep: number;
  draftId: string;
  readOnly?: boolean;
  allowStepNavigation?: boolean; // Allow navigation via step circles even in read-only mode
}

export function MultiStepForm({
  errorCount,
  steps,
  className,
  children,
  currentStep,
  onNext,
  onPrev,
  onSubmit,
  allowedStep,
  draftId,
  readOnly = false,
  allowStepNavigation = true,
}: MultiStepFormProps) {
 console.log(allowedStep)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      onNext();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      onPrev();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
     
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center  mx-auto",
        className
      )}
    >
      {/* Progress Indicator */}
      <div className="mb-8 w-full max-w-5xl px-4">
        {/* Progress Percentage Bar */}

        {/* Step Indicators */}
        <div className="flex items-start justify-between relative space-y-1 px-2">
          {/* Connection Line - Hidden on mobile */}
          <div className="hidden md:block absolute top-4  left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0">
            <div
              className="h-full bg-linear-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out shadow-sm"
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
            />
          </div>

          {steps.map((step, index) => {
            const isCompleted = allowedStep > index;
            const isCurrent = allowedStep === index;
            const isUpcoming = allowedStep < index;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center relative z-10 flex-1  group"
              >
                {/* Step Circle */}
                <button
                  type="button"
                  onClick={() => {
                    if (index <= allowedStep) {
                      navigate(`${step.id}?draftId=${draftId}`);
                    }
                  }}
                  disabled={isUpcoming}
                  className={cn(
                    "relative w-8 h-8  rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all duration-300",
                    "focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-300",
                    isCompleted &&
                      " bg-linear-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-110 cursor-pointer hover:scale-125 hover:shadow-xl",
                    isCurrent &&
                      "bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/40 scale-110 ring-4 ring-blue-200 ring-offset-2 cursor-pointer",
                    isUpcoming &&
                      "bg-white border-2 border-gray-300 text-gray-400 cursor-not-allowed hover:border-gray-400"
                  )}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                >
                  {isCompleted ? (
                    <FaCheck className="text-white text-sm transition-all duration-300" />
                  ) : (
                    <span className="font-bold">{index + 1}</span>
                  )}
                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20" />
                  )}
                </button>

                {/* Step Title */}
                <div className="mt-2 md:mt-3 text-center max-w-[100px] md:max-w-[120px]">
                  <span
                    className={cn(
                      "text-xs md:text-sm font-medium transition-colors duration-300 block leading-tight",
                      isCompleted && "text-green-600",
                      isCurrent && "text-blue-600 font-semibold",
                      isUpcoming && "text-gray-400"
                    )}
                  >
                    {step.title}
                  </span>
                  {/* Step number indicator - Hidden on mobile */}
                  <span
                    className={cn(
                      "hidden md:block text-xs mt-1 transition-colors duration-300",
                      isCompleted && "text-green-500",
                      isCurrent && "text-blue-500 font-medium",
                      isUpcoming && "text-gray-400"
                    )}
                  >
                    Step {index + 1}
                  </span>
                </div>

                {/* Tooltip on hover - Desktop only */}
                {isUpcoming && (
                  <div className="hidden md:block absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    Complete previous steps first
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white max-w-4xl rounded-lg shadow-sm border border-gray-200 p-6 mb-6 min-h-[400px]">
        {children}
      </div>

      {/* Navigation Buttons */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full max-w-4xl px-4">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="gap-2 w-full sm:w-auto sm:min-w-[120px] order-2 sm:order-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {/* Step Info Card */}
          <div className="flex flex-col items-center gap-1   order-1 sm:order-2 ">
            {errorCount > 0 && (
              <div className="flex flex-col items-center gap-1 px-4 py-2.5 bg-linear-to-br from-red-50 to-red-100 rounded-lg border border-red-200 shadow-sm order-1 sm:order-2 w-full sm:w-auto">
                <div className="text-xs text-red-600 font-medium">
                  {errorCount} errors found
                </div>
              </div>
            )}
            <div className="flex flex-col items-center gap-1 px-4 py-2.5 bg-linear-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm order-1 sm:order-2 w-full sm:w-auto">
              <div className="text-xs text-gray-600 font-medium">
                {steps[currentStep].title}
              </div>
              <div className="text-base font-bold text-gray-900">
                {currentStep + 1}{" "}
                <span className="text-gray-400 font-normal">of</span>{" "}
                {steps.length}
              </div>
            </div>
          </div>

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              variant="primary"
              onClick={nextStep}
              disabled={errorCount > 0}
              className={cn(
                "gap-2 w-full sm:w-auto sm:min-w-[120px] order-3",
              )}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="gap-2 w-full sm:w-auto sm:min-w-[120px] order-3"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          )}
        </div>
      )}
      
      {/* Step Info Card - Show in read-only mode */}
      {readOnly && (
        <div className="flex flex-col items-center gap-1 w-full max-w-4xl px-4">
          <div className="flex flex-col items-center gap-1 px-4 py-2.5 bg-linear-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
            <div className="text-xs text-gray-600 font-medium">
              {steps[currentStep].title}
            </div>
            <div className="text-base font-bold text-gray-900">
              {currentStep + 1}{" "}
              <span className="text-gray-400 font-normal">of</span>{" "}
              {steps.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
