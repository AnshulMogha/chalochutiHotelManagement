import {
  EARLY_LATE_COMBO_CONFIG,
  TimeOffsetInclusionForm,
} from "./TimeOffsetInclusionForm";
import type {
  InclusionCatalogueItem,
  InclusionEditTarget,
} from "../../services/inclusionsTypes";

type EarlyLateComboInclusionFormProps = {
  hotelId: string;
  inclusion: InclusionCatalogueItem;
  onBack: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  editTarget?: InclusionEditTarget | null;
};

export function EarlyLateComboInclusionForm(
  props: EarlyLateComboInclusionFormProps,
) {
  return (
    <TimeOffsetInclusionForm {...props} config={EARLY_LATE_COMBO_CONFIG} />
  );
}
