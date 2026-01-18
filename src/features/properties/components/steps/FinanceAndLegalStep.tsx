import { useEffect } from "react";
import { useSearchParams, useOutletContext } from "react-router";
import { useFormContext } from "../../context/useFormContext";
import { updateGstin } from "../../state/actionCreators";
import { Input } from "@/components/ui";
import type { Errors, FinanceAndLegalInfo } from "../../types";
import { propertyService } from "../../services/propertyService";

export function FinanceAndLegalStep() {
  const { errors: errorsFromContext, resetFieldError } = useOutletContext<{
    errors: Errors;
    resetFieldError: (
      step: keyof Errors,
      field: keyof FinanceAndLegalInfo
    ) => void;
  }>();
  const errors = errorsFromContext.financeAndLegalInfo as
    | Partial<Record<keyof FinanceAndLegalInfo, string>>
    | undefined;

  const { formDataState, setFormDataState } = useFormContext();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draftId");

  const financeAndLegalData = formDataState.financeAndLegalInfo || {
    gstin: "",
  };

  useEffect(() => {
    async function fetchFinanceDetails() {
      if (!draftId) return;

      try {
        const response = await propertyService.getFinanceAndLegal(draftId);
        if (response.gstin) {
          setFormDataState(updateGstin(response.gstin));
        }
      } catch (error) {
        // If finance data doesn't exist yet, that's okay - just don't update
        console.log("Finance data not available yet:", error);
      }
    }

    fetchFinanceDetails();
  }, [draftId, setFormDataState]);

  const handleGstinChange = (value: string) => {
    setFormDataState(updateGstin(value));
    if (resetFieldError && errors?.gstin) {
      resetFieldError("financeAndLegalInfo", "gstin");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Finance and Legal
          </h2>
          <p className="text-sm text-gray-600">
            Provide financial and legal information for your property
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="gstin"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              GSTIN (GST Identification Number)
              <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              id="gstin"
              type="text"
              placeholder="Enter 15-character GSTIN (e.g., 09ABCDE1234F1Z5)"
              value={financeAndLegalData.gstin || ""}
              onChange={(e) => {
                const value = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "");
                if (value.length <= 15) {
                  handleGstinChange(value);
                }
              }}
              maxLength={15}
              className={errors?.gstin ? "border-red-500" : ""}
            />
            {errors?.gstin && (
              <p className="mt-1 text-sm text-red-600">{errors.gstin}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              GSTIN is a 15-character alphanumeric code. Format: 2 digits + 5
              letters + 4 digits + 1 letter + 1 digit + Z + 1 alphanumeric
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
