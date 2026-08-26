import {
  EARLY_CHECKIN_CONFIG,
  TimeOffsetInclusionForm,
} from "./TimeOffsetInclusionForm";
import type {
  InclusionCatalogueItem,
  InclusionEditTarget,
} from "../../services/inclusionsTypes";

type EarlyCheckInInclusionFormProps = {
  hotelId: string;
  inclusion: InclusionCatalogueItem;
  onBack: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  editTarget?: InclusionEditTarget | null;
};

export function EarlyCheckInInclusionForm(props: EarlyCheckInInclusionFormProps) {
  return (
    <TimeOffsetInclusionForm {...props} config={EARLY_CHECKIN_CONFIG} />
  );
}
