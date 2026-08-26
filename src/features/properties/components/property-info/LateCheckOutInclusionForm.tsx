import {
  LATE_CHECKOUT_CONFIG,
  TimeOffsetInclusionForm,
} from "./TimeOffsetInclusionForm";
import type {
  InclusionCatalogueItem,
  InclusionEditTarget,
} from "../../services/inclusionsTypes";

type LateCheckOutInclusionFormProps = {
  hotelId: string;
  inclusion: InclusionCatalogueItem;
  onBack: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  editTarget?: InclusionEditTarget | null;
};

export function LateCheckOutInclusionForm(props: LateCheckOutInclusionFormProps) {
  return (
    <TimeOffsetInclusionForm {...props} config={LATE_CHECKOUT_CONFIG} />
  );
}
