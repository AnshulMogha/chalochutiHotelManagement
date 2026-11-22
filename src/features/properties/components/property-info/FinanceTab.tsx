import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Landmark,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import {
  adminService,
  type Document,
  type FinanceData,
  isFinanceBankVerified,
} from "@/features/admin/services/adminService";
import { getDocumentId } from "@/features/admin/services/documentDownloadUrl";
import { cn } from "@/lib/utils";
import {
  GSTIN_PAN_MISMATCH_MESSAGE,
  gstinMatchesPan,
} from "@/lib/gstinPanConsistency";
import {
  BANK_HOLDER_LEGAL_NAME_MISMATCH_MESSAGE,
  BANK_HOLDER_LEGAL_NAME_MISSING_MESSAGE,
  hasVerifiedLegalName,
  legalNamesMatch,
} from "@/lib/legalNameMatch";
import { useAuth } from "@/hooks";
import { canEditHotelFinanceDetails } from "@/lib/permissions";
import { canViewVendorBankVerificationMis } from "@/constants/roles";
import { ROUTES } from "@/constants";
import { extractErrorMessage, extractFieldErrors } from "@/features/reports/components/ReportJsonPanel";
import { vendorBankChangeService } from "@/features/reports/services/vendorBankChangeService";
import type { VendorBankChangeRequest } from "@/features/reports/services/vendorBankChangeTypes";
import { VendorBeneficiaryStatusPill } from "@/features/reports/components/vendorBeneficiaryUi";
import {
  FinanceBankBadge,
  FinanceFieldHint,
  FinanceFieldLabel,
  FinanceFieldWrap,
  FinancePageLoader,
  FinanceSectionCard,
  FinanceSectionHeader,
  FinanceTextarea,
} from "./financeTabUi";

interface FinanceTabProps {
  hotelId: string;
}

const BUSINESS_FIELDS: (keyof FinanceData)[] = [
  "gstin",
  "pan",
  "businessName",
  "businessAddress",
];

const BANK_FIELDS: (keyof FinanceData)[] = [
  "bankAccountHolderName",
  "bankAccountNumber",
  "bankName",
  "bankIfsc",
  "bankBranch",
];

const MAX_CHEQUE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CHEQUE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const EMPTY_FINANCE: FinanceData = {
  gstin: "",
  pan: "",
  businessName: "",
  businessAddress: "",
  bankAccountHolderName: "",
  bankAccountNumber: "",
  bankName: "",
  bankIfsc: "",
  bankBranch: "",
};

function financeSnapshot(data: FinanceData): string {
  const { bankProofDocumentKey: _proof, ...rest } = data;
  return JSON.stringify(rest);
}

function parseSavedSnapshot(snapshot: string): FinanceData {
  if (!snapshot) return { ...EMPTY_FINANCE };
  try {
    return { ...EMPTY_FINANCE, ...(JSON.parse(snapshot) as FinanceData) };
  } catch {
    return { ...EMPTY_FINANCE };
  }
}

function pickFields(
  source: FinanceData,
  fields: (keyof FinanceData)[],
): Partial<FinanceData> {
  const out: Partial<FinanceData> = {};
  for (const field of fields) {
    out[field] = source[field];
  }
  return out;
}

function sectionDirty(
  formData: FinanceData,
  lastSavedSnapshot: string,
  fields: (keyof FinanceData)[],
): boolean {
  const hasInput = fields.some(
    (field) => String(formData[field] || "").trim().length > 0,
  );
  if (!lastSavedSnapshot) return hasInput;
  const saved = parseSavedSnapshot(lastSavedSnapshot);
  return fields.some(
    (field) =>
      String(formData[field] || "").trim() !== String(saved[field] || "").trim(),
  );
}

function isAllowedChequeFile(file: File) {
  const lower = file.name.toLowerCase();
  const hasExt =
    lower.endsWith(".pdf") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp");
  return ALLOWED_CHEQUE_MIME.has(file.type) || hasExt;
}

export function FinanceTab({ hotelId }: FinanceTabProps) {
  const { user } = useAuth();
  const canEditFinance = canEditHotelFinanceDetails(user);
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankVerificationStatus, setBankVerificationStatus] = useState<
    string | null
  >(null);
  const [bankVerifiedAt, setBankVerifiedAt] = useState<string | null>(null);
  const [bankVerifiedName, setBankVerifiedName] = useState<string | null>(null);
  const [bankCorrectionRequired, setBankCorrectionRequired] = useState(false);
  const [bankCorrectionRemarks, setBankCorrectionRemarks] = useState<
    string | null
  >(null);
  const [bankCorrectionReason, setBankCorrectionReason] = useState<
    string | null
  >(null);
  const [bankCorrectionAt, setBankCorrectionAt] = useState<string | null>(null);
  const [saveFieldErrors, setSaveFieldErrors] = useState<
    Partial<Record<keyof FinanceData, string>>
  >({});
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");
  const [bankChangeRequest, setBankChangeRequest] =
    useState<VendorBankChangeRequest | null>(null);
  const [existingCheque, setExistingCheque] = useState<Document | null>(null);
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [chequeError, setChequeError] = useState<string | null>(null);
  const [showSubmittedRequest, setShowSubmittedRequest] = useState(false);
  const chequeInputRef = useRef<HTMLInputElement>(null);
  const canViewBankVerificationMis = canViewVendorBankVerificationMis(
    user?.roles,
  );
  const isBankVerified = isFinanceBankVerified(bankVerificationStatus);
  const isFinanceViewer = !canEditFinance;
  const [formData, setFormData] = useState<FinanceData>({ ...EMPTY_FINANCE });
  const businessDirty = useMemo(
    () => sectionDirty(formData, lastSavedSnapshot, BUSINESS_FIELDS),
    [formData, lastSavedSnapshot],
  );
  const bankDirty = useMemo(
    () => sectionDirty(formData, lastSavedSnapshot, BANK_FIELDS),
    [formData, lastSavedSnapshot],
  );
  const saving = savingBusiness || savingBank;

  const fetchBankChange = useCallback(async () => {
    try {
      const latest = await vendorBankChangeService.getLatest("HOTEL", hotelId);
      if (
        latest &&
        canViewBankVerificationMis &&
        (latest.status === "PENDING_APPROVAL" || latest.status === "REJECTED")
      ) {
        try {
          // Finance viewers get full account numbers via getById (getLatest is masked).
          const full = await vendorBankChangeService.getById(latest.id);
          setBankChangeRequest(full);
          return;
        } catch {
          // Fall back to masked latest.
        }
      }
      setBankChangeRequest(latest);
    } catch {
      setBankChangeRequest(null);
    }
  }, [canViewBankVerificationMis, hotelId]);

  const fetchCancelledCheque = useCallback(async () => {
    try {
      const docs = await adminService.getDocuments(hotelId);
      const cheque =
        docs.find((doc) => doc.docType === "CANCELLED_CHEQUE") ?? null;
      setExistingCheque(cheque);
    } catch {
      setExistingCheque(null);
    }
  }, [hotelId]);

  const fetchFinance = useCallback(async () => {
    setLoading(true);
    setFormData({ ...EMPTY_FINANCE });
    setBankVerificationStatus(null);
    setBankVerifiedAt(null);
    setBankVerifiedName(null);
    setBankCorrectionRequired(false);
    setBankCorrectionRemarks(null);
    setBankCorrectionReason(null);
    setBankCorrectionAt(null);
    setLastSavedSnapshot("");
    setChequeFile(null);
    setChequeError(null);
    if (chequeInputRef.current) chequeInputRef.current.value = "";

    try {
      const response = await adminService.getHotelFinance(hotelId);
      if (response.finances && response.finances.length > 0) {
        const financeData = response.finances[0];
        const nextFormData: FinanceData = {
          ...EMPTY_FINANCE,
          gstin: financeData.gstin || "",
          pan: financeData.pan || "",
          businessName: financeData.businessName || "",
          businessAddress: financeData.businessAddress || "",
          bankAccountHolderName: financeData.bankAccountHolderName || "",
          bankAccountNumber: financeData.bankAccountNumber || "",
          bankName: financeData.bankName || "",
          bankIfsc: financeData.bankIfsc || "",
          bankBranch: financeData.bankBranch || "",
        };
        setFormData(nextFormData);
        setLastSavedSnapshot(financeSnapshot(nextFormData));
        setBankVerificationStatus(
          financeData.bankVerificationStatus ?? "NOT_VERIFIED",
        );
        setBankVerifiedAt(financeData.bankVerifiedAt ?? null);
        setBankVerifiedName(financeData.bankVerifiedName ?? null);
        setBankCorrectionRequired(Boolean(financeData.bankCorrectionRequired));
        setBankCorrectionRemarks(financeData.bankCorrectionRemarks ?? null);
        setBankCorrectionReason(financeData.bankCorrectionReason ?? null);
        setBankCorrectionAt(financeData.bankCorrectionAt ?? null);
      }
      await Promise.all([fetchBankChange(), fetchCancelledCheque()]);
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setLoading(false);
    }
  }, [hotelId, fetchBankChange, fetchCancelledCheque]);

  useEffect(() => {
    if (hotelId) {
      void fetchFinance();
    }
  }, [hotelId, fetchFinance]);

  const handleChange = (field: keyof FinanceData, value: string) => {
    setSaveFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGstinChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (formatted.length <= 15) {
      handleChange("gstin", formatted);
    }
  };

  const handlePanChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (formatted.length <= 10) {
      handleChange("pan", formatted);
    }
  };

  const handleIfscChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (formatted.length <= 11) {
      let validFormat = "";
      const firstFour = formatted.substring(0, 4).replace(/[^A-Z]/g, "");
      validFormat = firstFour;
      if (formatted.length > 4) {
        if (formatted[4] === "0") {
          validFormat += "0";
        } else if (!/[A-Z]/.test(formatted[4])) {
          validFormat += "0";
        }
      }
      if (formatted.length > 5) {
        const rest = formatted.substring(5).replace(/[^0-9]/g, "");
        validFormat += rest;
      }
      if (validFormat.length > 11) {
        validFormat = validFormat.substring(0, 11);
      }
      handleChange("bankIfsc", validFormat);
    }
  };

  const validatePan = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validateIfsc = (ifsc: string): boolean => {
    const ifscRegex = /^[A-Z]{4}0[0-9]{6}$/;
    return ifscRegex.test(ifsc);
  };

  const validateBusiness = (): boolean => {
    if (!formData.gstin || formData.gstin.length !== 15) {
      showToast("Please enter a valid 15-character GSTIN", "error");
      return false;
    }
    if (!formData.pan || formData.pan.length !== 10) {
      showToast("Please enter a valid 10-character PAN", "error");
      return false;
    }
    if (!validatePan(formData.pan)) {
      showToast(
        "PAN format is invalid. Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)",
        "error",
      );
      return false;
    }
    if (!gstinMatchesPan(formData.gstin, formData.pan)) {
      showToast(GSTIN_PAN_MISMATCH_MESSAGE, "error");
      return false;
    }
    if (!formData.businessName.trim()) {
      showToast("Please enter business name", "error");
      return false;
    }
    if (!formData.businessAddress.trim()) {
      showToast("Please enter business address", "error");
      return false;
    }
    return true;
  };

  const validateBank = (): boolean => {
    if (!formData.bankAccountHolderName.trim()) {
      showToast("Please enter bank account holder name", "error");
      return false;
    }
    if (!hasVerifiedLegalName(formData.businessName)) {
      showToast(BANK_HOLDER_LEGAL_NAME_MISSING_MESSAGE, "error");
      return false;
    }
    if (!legalNamesMatch(formData.businessName, formData.bankAccountHolderName)) {
      showToast(BANK_HOLDER_LEGAL_NAME_MISMATCH_MESSAGE, "error");
      return false;
    }
    if (!formData.bankAccountNumber.trim()) {
      showToast("Please enter bank account number", "error");
      return false;
    }
    if (!formData.bankName.trim()) {
      showToast("Please enter bank name", "error");
      return false;
    }
    if (!formData.bankIfsc || formData.bankIfsc.length !== 11) {
      showToast("Please enter a valid 11-character IFSC code", "error");
      return false;
    }
    if (!validateIfsc(formData.bankIfsc)) {
      showToast(
        "IFSC format is invalid. Format: 4 letters + 0 + 6 digits (e.g., HDFC0001234)",
        "error",
      );
      return false;
    }
    if (!formData.bankBranch.trim()) {
      showToast("Please enter bank branch", "error");
      return false;
    }
    if (!chequeFile) {
      setChequeError(
        existingCheque
          ? "Upload a new cancelled cheque for the changed bank account."
          : "Upload a cancelled cheque to submit bank detail changes.",
      );
      showToast("Cancelled cheque is required for bank changes", "error");
      return false;
    }
    return true;
  };

  const handleChequeSelected = (file: File | null) => {
    setChequeError(null);
    if (!file) {
      setChequeFile(null);
      return;
    }
    if (!isAllowedChequeFile(file)) {
      setChequeFile(null);
      setChequeError("Use PDF, JPG, or PNG (max 5 MB).");
      return;
    }
    if (file.size > MAX_CHEQUE_SIZE_BYTES) {
      setChequeFile(null);
      setChequeError("File must be 5 MB or less.");
      return;
    }
    setChequeFile(file);
  };

  const ensureBankProofUploaded = async (): Promise<string | undefined> => {
    if (!chequeFile) return undefined;

    const existingId = existingCheque ? getDocumentId(existingCheque) : null;
    const uploaded = existingId
      ? await adminService.updateDocument(
          hotelId,
          existingId,
          chequeFile,
          "CANCELLED_CHEQUE",
        )
      : await adminService.uploadDocument(
          hotelId,
          chequeFile,
          "CANCELLED_CHEQUE",
        );

    return uploaded.storageKey?.trim() || undefined;
  };

  const handleSaveBusiness = async () => {
    if (!validateBusiness()) return;

    setSavingBusiness(true);
    setSaveFieldErrors({});
    try {
      // Business-only payload — do not send empty bank fields (same API as bank save).
      const payload = pickFields(formData, BUSINESS_FIELDS) as FinanceData;
      await adminService.updateHotelFinance(hotelId, payload);
      showToast("Business information saved", "success");
      await fetchFinance();
    } catch (error) {
      console.error("Error saving business information:", error);
      const fieldErrors = extractFieldErrors(error);
      setSaveFieldErrors(fieldErrors as Partial<Record<keyof FinanceData, string>>);
      showToast(extractErrorMessage(error), "error");
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleSaveBank = async () => {
    if (!validateBank()) return;

    setSavingBank(true);
    setSaveFieldErrors({});
    setChequeError(null);
    try {
      const saved = parseSavedSnapshot(lastSavedSnapshot);
      const proofKey = await ensureBankProofUploaded();
      const payload: FinanceData = {
        ...saved,
        ...pickFields(formData, BANK_FIELDS),
        ...(proofKey ? { bankProofDocumentKey: proofKey } : {}),
      } as FinanceData;
      await adminService.updateHotelFinance(hotelId, payload);
      setChequeFile(null);
      if (chequeInputRef.current) chequeInputRef.current.value = "";
      showToast(
        "Bank change submitted for finance approval. Live account stays unchanged until approved.",
        "success",
      );
      await fetchFinance();
    } catch (error) {
      console.error("Error saving bank information:", error);
      const fieldErrors = extractFieldErrors(error);
      setSaveFieldErrors(fieldErrors as Partial<Record<keyof FinanceData, string>>);
      if (fieldErrors.bankProofDocumentKey) {
        setChequeError(fieldErrors.bankProofDocumentKey);
      }
      showToast(extractErrorMessage(error), "error");
    } finally {
      setSavingBank(false);
    }
  };

  const gstinInvalid =
    formData.gstin.length > 0 && formData.gstin.length !== 15;
  const panLengthInvalid = formData.pan.length > 0 && formData.pan.length !== 10;
  const panFormatInvalid =
    formData.pan.length === 10 && !validatePan(formData.pan);
  const panGstinMismatch =
    formData.gstin.length === 15 &&
    formData.pan.length === 10 &&
    validatePan(formData.pan) &&
    !gstinMatchesPan(formData.gstin, formData.pan);
  const bankHolderLegalMismatch =
    !!formData.bankAccountHolderName.trim() &&
    hasVerifiedLegalName(formData.businessName) &&
    !legalNamesMatch(formData.businessName, formData.bankAccountHolderName);
  const ifscLengthInvalid =
    formData.bankIfsc.length > 0 && formData.bankIfsc.length !== 11;
  const ifscFormatInvalid =
    formData.bankIfsc.length === 11 && !validateIfsc(formData.bankIfsc);

  if (loading) {
    return <FinancePageLoader message="Loading finance information..." />;
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="mx-auto max-w-7xl space-y-2">
        <div className="sticky top-0 z-20 -mx-4 mb-0.5 border-b border-slate-200/70 bg-gray-50 px-4 py-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900">
                Finance
              </h1>
              <p className="text-xs text-gray-500">
                {isFinanceViewer
                  ? "Business and bank details for this property"
                  : "Save business details and bank account changes separately"}
              </p>
            </div>
            {isFinanceViewer && canViewBankVerificationMis ? (
              <Link
                to={ROUTES.REPORTS.VENDOR_BANK_VERIFICATION}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2f3d95] underline underline-offset-2"
              >
                Vendor bank verification
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:items-start">
        <FinanceSectionCard theme="emerald" className="!p-3 sm:!p-4">
          <FinanceSectionHeader
            icon={Building2}
            title="Business Information"
            subtitle={isFinanceViewer ? undefined : "GST, PAN and address — saves immediately"}
            theme="emerald"
          />

          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <FinanceFieldWrap theme="emerald">
                <FinanceFieldLabel htmlFor="gstin" required={!isFinanceViewer} theme="emerald">
                  GSTIN
                </FinanceFieldLabel>
                <Input
                  id="gstin"
                  type="text"
                  placeholder="29ABCDE1234F1Z5"
                  value={formData.gstin}
                  readOnly={isFinanceViewer}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  maxLength={15}
                  className={cn(
                    "font-mono uppercase",
                    isFinanceViewer ? "bg-slate-50 text-slate-700" : "bg-white",
                    (gstinInvalid ||
                      panGstinMismatch ||
                      saveFieldErrors.gstin) &&
                      "border-red-500",
                  )}
                />
                {saveFieldErrors.gstin ? (
                  <FinanceFieldHint error>{saveFieldErrors.gstin}</FinanceFieldHint>
                ) : gstinInvalid ? (
                  <FinanceFieldHint error>
                    GSTIN must be exactly 15 characters
                  </FinanceFieldHint>
                ) : panGstinMismatch ? (
                  <FinanceFieldHint error>
                    {GSTIN_PAN_MISMATCH_MESSAGE}
                  </FinanceFieldHint>
                ) : isFinanceViewer ? null : (
                  <FinanceFieldHint>
                    15-character alphanumeric GST identification number
                  </FinanceFieldHint>
                )}
              </FinanceFieldWrap>

              <FinanceFieldWrap theme="emerald">
                <FinanceFieldLabel htmlFor="pan" required={!isFinanceViewer} theme="emerald">
                  PAN
                </FinanceFieldLabel>
                <Input
                  id="pan"
                  type="text"
                  placeholder="ABCDE1234F"
                  value={formData.pan}
                  readOnly={isFinanceViewer}
                  onChange={(e) => handlePanChange(e.target.value)}
                  maxLength={10}
                  className={cn(
                    "font-mono uppercase",
                    isFinanceViewer ? "bg-slate-50 text-slate-700" : "bg-white",
                    (panLengthInvalid ||
                      panFormatInvalid ||
                      panGstinMismatch ||
                      saveFieldErrors.pan) &&
                      "border-red-500",
                  )}
                />
                {saveFieldErrors.pan ? (
                  <FinanceFieldHint error>{saveFieldErrors.pan}</FinanceFieldHint>
                ) : panLengthInvalid ? (
                  <FinanceFieldHint error>
                    PAN must be exactly 10 characters
                  </FinanceFieldHint>
                ) : panFormatInvalid ? (
                  <FinanceFieldHint error>
                    Invalid PAN format (5 letters + 4 digits + 1 letter)
                  </FinanceFieldHint>
                ) : panGstinMismatch ? (
                  <FinanceFieldHint error>
                    {GSTIN_PAN_MISMATCH_MESSAGE}
                  </FinanceFieldHint>
                ) : isFinanceViewer ? null : (
                  <FinanceFieldHint>
                    Must match characters 3–12 of GSTIN (business PAN)
                  </FinanceFieldHint>
                )}
              </FinanceFieldWrap>
            </div>

            <FinanceFieldWrap theme="emerald">
              <FinanceFieldLabel htmlFor="businessName" required={!isFinanceViewer} theme="emerald">
                Business Name
              </FinanceFieldLabel>
              <Input
                id="businessName"
                type="text"
                placeholder="Enter business name"
                value={formData.businessName}
                readOnly={isFinanceViewer}
                onChange={(e) => handleChange("businessName", e.target.value)}
                className={cn(
                  isFinanceViewer ? "bg-slate-50 text-slate-700" : "bg-white",
                  saveFieldErrors.businessName && "border-red-500",
                )}
              />
              {saveFieldErrors.businessName ? (
                <FinanceFieldHint error>{saveFieldErrors.businessName}</FinanceFieldHint>
              ) : null}
            </FinanceFieldWrap>

            <FinanceFieldWrap theme="emerald">
              <FinanceFieldLabel htmlFor="businessAddress" required={!isFinanceViewer} theme="emerald">
                Business Address
              </FinanceFieldLabel>
              <FinanceTextarea
                id="businessAddress"
                rows={isFinanceViewer ? 2 : 3}
                placeholder="Enter complete business address"
                value={formData.businessAddress}
                readOnly={isFinanceViewer}
                onChange={(e) => handleChange("businessAddress", e.target.value)}
                className={cn(
                  isFinanceViewer && "bg-slate-50 text-slate-700",
                  saveFieldErrors.businessAddress && "border-red-500",
                )}
              />
              {saveFieldErrors.businessAddress ? (
                <FinanceFieldHint error>
                  {saveFieldErrors.businessAddress}
                </FinanceFieldHint>
              ) : null}
            </FinanceFieldWrap>

            {canEditFinance ? (
              <div className="flex justify-end pt-0.5">
                <Button
                  type="button"
                  onClick={() => void handleSaveBusiness()}
                  disabled={
                    savingBusiness ||
                    savingBank ||
                    !businessDirty ||
                    panGstinMismatch
                  }
                  className="bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingBusiness ? "Saving..." : "Save business information"}
                </Button>
              </div>
            ) : null}
          </div>
        </FinanceSectionCard>

        <FinanceSectionCard theme="teal" className="!p-3 sm:!p-4">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <FinanceSectionHeader
              icon={Landmark}
              title="Bank Account Information"
              subtitle={
                isFinanceViewer
                  ? undefined
                  : "Cancelled cheque required for bank changes"
              }
              theme="teal"
            />
            {bankVerificationStatus ? (
              <FinanceBankBadge status={bankVerificationStatus} />
            ) : null}
          </div>

          {bankCorrectionRequired ? (
            <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-sm text-amber-950">
              <p className="font-semibold text-[13px]">Bank details update required</p>
              <p className="mt-0.5 text-[12px]">
                {isFinanceViewer
                  ? "Owner must update bank details before beneficiary registration can continue."
                  : "Update your bank details so beneficiary registration can continue. Verification may stay Verified until the new details are approved."}
              </p>
              {bankCorrectionReason ? (
                <div className="mt-2 rounded-md bg-white/70 px-3 py-2 ring-1 ring-amber-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                    Reason
                  </p>
                  <p className="mt-1 text-[13px] font-medium">
                    {bankCorrectionReason}
                  </p>
                </div>
              ) : null}
              {bankCorrectionRemarks ? (
                <div className="mt-2 rounded-md bg-white/70 px-3 py-2 ring-1 ring-amber-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                    Finance remarks
                  </p>
                  <p className="mt-1 text-[13px] font-medium">
                    {bankCorrectionRemarks}
                  </p>
                </div>
              ) : null}
              {!isFinanceViewer ? (
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12px]">
                  <li>Update account holder / account number / IFSC as needed.</li>
                  <li>Upload a cancelled cheque that matches the new account.</li>
                  <li>
                    Click <strong>Submit bank change for approval</strong>.
                  </li>
                </ol>
              ) : null}
              {bankCorrectionAt ? (
                <p className="mt-2 text-[11px] text-amber-800">
                  Requested on{" "}
                  {new Date(bankCorrectionAt).toLocaleString("en-IN")}
                </p>
              ) : null}
            </div>
          ) : null}

          {bankChangeRequest ? (
            <div
              className={cn(
                "mb-2 rounded-md border px-2.5 py-2 text-sm",
                bankChangeRequest.status === "PENDING_APPROVAL" &&
                  "border-amber-200 bg-amber-50 text-amber-900",
                bankChangeRequest.status === "REJECTED" &&
                  "border-rose-200 bg-rose-50 text-rose-900",
                bankChangeRequest.status === "APPROVED" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-900",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold">
                    Bank change #{bankChangeRequest.id}
                  </span>
                  <VendorBeneficiaryStatusPill value={bankChangeRequest.status} />
                </div>
                {!isFinanceViewer &&
                (bankChangeRequest.status === "PENDING_APPROVAL" ||
                  bankChangeRequest.status === "REJECTED") ? (
                  <button
                    type="button"
                    onClick={() => setShowSubmittedRequest(true)}
                    className="text-[12px] font-semibold underline underline-offset-2"
                  >
                    View submitted details
                  </button>
                ) : null}
              </div>

              {bankChangeRequest.status === "PENDING_APPROVAL" ? (
                <p className="mt-1 text-[12px] opacity-90">
                  {isFinanceViewer
                    ? `Pending approval${bankChangeRequest.requestedAt ? ` · submitted ${new Date(bankChangeRequest.requestedAt).toLocaleString("en-IN")}` : ""}. Live fields below are currently approved.`
                    : `Waiting for finance approval${bankChangeRequest.requestedAt ? ` · submitted ${new Date(bankChangeRequest.requestedAt).toLocaleString("en-IN")}` : ""}. Form below shows the currently approved account.`}
                </p>
              ) : null}

              {bankChangeRequest.status === "REJECTED" ? (
                <div className="space-y-2 text-[13px]">
                  <div className="rounded-md bg-white/70 px-3 py-2 ring-1 ring-rose-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                      Rejection reason
                    </p>
                    <p className="mt-1 font-medium text-rose-950">
                      {bankChangeRequest.rejectionRemarks ||
                        "No remarks were provided."}
                    </p>
                    <p className="mt-2 text-[12px] text-rose-800">
                      Rejected
                      {bankChangeRequest.rejectedByName
                        ? ` by ${bankChangeRequest.rejectedByName}`
                        : ""}
                      {bankChangeRequest.rejectedAt
                        ? ` on ${new Date(bankChangeRequest.rejectedAt).toLocaleString("en-IN")}`
                        : ""}
                      .
                    </p>
                  </div>
                  <div className="rounded-md bg-white/70 px-3 py-2 ring-1 ring-rose-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                      What to do next
                    </p>
                    <ol className="mt-1 list-decimal space-y-1 pl-4 text-[12px] text-rose-950">
                      <li>Review the rejection reason above.</li>
                      <li>
                        Update account holder / account number / IFSC as needed.
                      </li>
                      <li>Upload a new cancelled cheque that matches the new account.</li>
                      <li>
                        Click <strong>Submit bank change for approval</strong> again.
                      </li>
                    </ol>
                    <p className="mt-2 text-[12px] text-rose-800">
                      Your currently approved bank account was not changed by this
                      rejection.
                    </p>
                  </div>
                </div>
              ) : null}

              {bankChangeRequest.status === "APPROVED" ? (
                <p>
                  Latest bank change was approved and applied to your active account
                  {bankChangeRequest.approvedAt
                    ? ` on ${new Date(bankChangeRequest.approvedAt).toLocaleString("en-IN")}`
                    : ""}
                  .
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            {isFinanceViewer ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                Currently approved
              </p>
            ) : null}

            <FinanceFieldWrap theme="teal">
              <FinanceFieldLabel htmlFor="verifiedLegalName" theme="teal">
                Verified legal name
              </FinanceFieldLabel>
              <Input
                id="verifiedLegalName"
                type="text"
                value={formData.businessName}
                readOnly
                className="bg-slate-50 text-slate-700"
              />
              <FinanceFieldHint>
                From business name / GST-PAN details (read-only)
              </FinanceFieldHint>
            </FinanceFieldWrap>

            <FinanceFieldWrap theme="teal">
              <FinanceFieldLabel
                htmlFor="bankAccountHolderName"
                required={!isFinanceViewer}
                theme="teal"
              >
                Account Holder Name
              </FinanceFieldLabel>
              <Input
                id="bankAccountHolderName"
                type="text"
                placeholder={
                  isFinanceViewer ? "—" : "Enter name as per bank records"
                }
                value={formData.bankAccountHolderName}
                readOnly={isFinanceViewer}
                onChange={(e) =>
                  handleChange("bankAccountHolderName", e.target.value)
                }
                className={cn(
                  isFinanceViewer ? "bg-slate-50 text-slate-700" : "bg-white",
                  !isFinanceViewer &&
                    (saveFieldErrors.bankAccountHolderName ||
                      bankHolderLegalMismatch) &&
                    "border-red-500",
                )}
              />
              {isFinanceViewer ? null : saveFieldErrors.bankAccountHolderName ? (
                <FinanceFieldHint error>
                  {saveFieldErrors.bankAccountHolderName}
                </FinanceFieldHint>
              ) : !hasVerifiedLegalName(formData.businessName) ? (
                <FinanceFieldHint error>
                  {BANK_HOLDER_LEGAL_NAME_MISSING_MESSAGE}
                </FinanceFieldHint>
              ) : formData.bankAccountHolderName.trim() &&
                legalNamesMatch(
                  formData.businessName,
                  formData.bankAccountHolderName,
                ) ? (
                <FinanceFieldHint>
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Matches verified legal name
                  </span>
                </FinanceFieldHint>
              ) : bankHolderLegalMismatch ? (
                <FinanceFieldHint error>
                  {BANK_HOLDER_LEGAL_NAME_MISMATCH_MESSAGE}
                </FinanceFieldHint>
              ) : (
                <FinanceFieldHint>
                  Must match business legal name (spacing/case differences are OK)
                </FinanceFieldHint>
              )}
            </FinanceFieldWrap>

            <FinanceFieldWrap theme="teal">
              <FinanceFieldLabel
                htmlFor="bankAccountNumber"
                required={!isFinanceViewer}
                theme="teal"
              >
                Bank Account Number
              </FinanceFieldLabel>
              <Input
                id="bankAccountNumber"
                type="text"
                placeholder={isFinanceViewer ? "—" : "Enter bank account number"}
                value={formData.bankAccountNumber}
                readOnly={isFinanceViewer}
                onChange={(e) =>
                  handleChange("bankAccountNumber", e.target.value)
                }
                className={cn(
                  "font-mono",
                  isFinanceViewer ? "bg-slate-50 text-slate-700" : "bg-white",
                )}
              />
            </FinanceFieldWrap>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <FinanceFieldWrap theme="teal">
                <FinanceFieldLabel
                  htmlFor="bankName"
                  required={!isFinanceViewer}
                  theme="teal"
                >
                  Bank Name
                </FinanceFieldLabel>
                <Input
                  id="bankName"
                  type="text"
                  placeholder={isFinanceViewer ? "—" : "HDFC Bank"}
                  value={formData.bankName}
                  readOnly={isFinanceViewer}
                  onChange={(e) => handleChange("bankName", e.target.value)}
                  className={
                    isFinanceViewer ? "bg-slate-50 text-slate-700" : "bg-white"
                  }
                />
              </FinanceFieldWrap>

              <FinanceFieldWrap theme="teal">
                <FinanceFieldLabel
                  htmlFor="bankIfsc"
                  required={!isFinanceViewer}
                  theme="teal"
                >
                  IFSC Code
                </FinanceFieldLabel>
                <Input
                  id="bankIfsc"
                  type="text"
                  placeholder={isFinanceViewer ? "—" : "HDFC0001234"}
                  value={formData.bankIfsc}
                  readOnly={isFinanceViewer}
                  onChange={(e) => handleIfscChange(e.target.value)}
                  maxLength={11}
                  className={cn(
                    "font-mono uppercase",
                    isFinanceViewer ? "bg-slate-50 text-slate-700" : "bg-white",
                    !isFinanceViewer &&
                      (ifscLengthInvalid || ifscFormatInvalid) &&
                      "border-red-500",
                  )}
                />
                {isFinanceViewer ? null : ifscLengthInvalid ? (
                  <FinanceFieldHint error>
                    IFSC code must be exactly 11 characters
                  </FinanceFieldHint>
                ) : ifscFormatInvalid ? (
                  <FinanceFieldHint error>
                    Invalid IFSC format (4 letters + 0 + 6 digits)
                  </FinanceFieldHint>
                ) : (
                  <FinanceFieldHint>Format: HDFC0001234</FinanceFieldHint>
                )}
              </FinanceFieldWrap>
            </div>

            <FinanceFieldWrap theme="teal">
              <FinanceFieldLabel
                htmlFor="bankBranch"
                required={!isFinanceViewer}
                theme="teal"
              >
                Bank Branch
              </FinanceFieldLabel>
              <Input
                id="bankBranch"
                type="text"
                placeholder={isFinanceViewer ? "—" : "Enter bank branch name"}
                value={formData.bankBranch}
                readOnly={isFinanceViewer}
                onChange={(e) => handleChange("bankBranch", e.target.value)}
                className={
                  isFinanceViewer ? "bg-slate-50 text-slate-700" : "bg-white"
                }
              />
            </FinanceFieldWrap>

            {isFinanceViewer &&
            bankChangeRequest &&
            (bankChangeRequest.status === "PENDING_APPROVAL" ||
              bankChangeRequest.status === "REJECTED") ? (
              <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    Submitted #{bankChangeRequest.id}
                  </p>
                  {bankChangeRequest.bankProofDocumentUrl ? (
                    <a
                      href={bankChangeRequest.bankProofDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2f3d95] hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Proof
                    </a>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
                  {(
                    [
                      [
                        "Holder",
                        bankChangeRequest.proposedAccountHolderName,
                      ],
                      ["Account", bankChangeRequest.proposedAccountNumber],
                      ["IFSC", bankChangeRequest.proposedIfsc],
                      ["Bank", bankChangeRequest.proposedBankName],
                      ["Branch", bankChangeRequest.proposedBankBranch],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5"
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        {label}
                      </p>
                      <p className="mt-0.5 break-all text-[12px] font-semibold text-slate-900">
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {canEditFinance ? (
              <FinanceFieldWrap theme="teal">
                <FinanceFieldLabel
                  htmlFor="cancelledCheque"
                  required={bankDirty}
                  theme="teal"
                >
                  Cancelled cheque
                </FinanceFieldLabel>
                <p className="mb-2 text-xs text-teal-700">
                  Required when you change bank details. PDF, JPG, or PNG · max 5 MB.
                </p>
                {existingCheque && !chequeFile ? (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700">
                    <FileText className="h-4 w-4 shrink-0 text-teal-700" />
                    <span className="min-w-0 flex-1 truncate">
                      On file: {existingCheque.fileName || "Cancelled cheque"}
                    </span>
                  </div>
                ) : null}
                {chequeFile ? (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
                    <Upload className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{chequeFile.name}</span>
                    <button
                      type="button"
                      className="rounded p-1 text-teal-700 hover:bg-teal-100"
                      aria-label="Remove selected cheque"
                      onClick={() => {
                        handleChequeSelected(null);
                        if (chequeInputRef.current) chequeInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                <input
                  ref={chequeInputRef}
                  id="cancelledCheque"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-800"
                  onChange={(e) =>
                    handleChequeSelected(e.target.files?.[0] ?? null)
                  }
                />
                {chequeError || saveFieldErrors.bankProofDocumentKey ? (
                  <FinanceFieldHint error>
                    {chequeError || saveFieldErrors.bankProofDocumentKey}
                  </FinanceFieldHint>
                ) : bankDirty ? (
                  <FinanceFieldHint>
                    Upload a cancelled cheque matching the new account before saving.
                  </FinanceFieldHint>
                ) : null}
              </FinanceFieldWrap>
            ) : null}

            {bankVerificationStatus ? (
              <div className="rounded-md border border-teal-100 bg-teal-50/50 px-2.5 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-teal-900">
                    {isBankVerified
                      ? "Verified for settlements"
                      : "Not verified yet"}
                  </p>
                  {isBankVerified && (bankVerifiedName || bankVerifiedAt) ? (
                    <p className="text-[11px] text-teal-600">
                      {bankVerifiedName ? bankVerifiedName : null}
                      {bankVerifiedName && bankVerifiedAt ? " · " : null}
                      {bankVerifiedAt
                        ? new Date(bankVerifiedAt).toLocaleString("en-IN")
                        : null}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {canEditFinance ? (
              <div className="flex justify-end pt-0.5">
                <Button
                  type="button"
                  onClick={() => void handleSaveBank()}
                  disabled={
                    savingBank ||
                    savingBusiness ||
                    !bankDirty ||
                    bankHolderLegalMismatch
                  }
                  className="bg-teal-700 text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingBank
                    ? "Submitting..."
                    : "Submit bank change for approval"}
                </Button>
              </div>
            ) : null}
          </div>
        </FinanceSectionCard>
        </div>
      </div>

      {showSubmittedRequest && bankChangeRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                  Submitted request #{bankChangeRequest.id}
                </p>
                <div className="mt-1">
                  <VendorBeneficiaryStatusPill value={bankChangeRequest.status} />
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
                onClick={() => setShowSubmittedRequest(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-3 text-[12px] text-slate-600">
              Form fields show the approved live account. This popup shows what you
              submitted for approval.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["Holder", bankChangeRequest.proposedAccountHolderName, bankChangeRequest.oldAccountHolderName],
                  ["Account", bankChangeRequest.proposedAccountNumber, bankChangeRequest.oldAccountNumber],
                  ["IFSC", bankChangeRequest.proposedIfsc, bankChangeRequest.oldIfsc],
                  ["Bank", bankChangeRequest.proposedBankName, bankChangeRequest.oldBankName],
                  ["Branch", bankChangeRequest.proposedBankBranch, bankChangeRequest.oldBankBranch],
                ] as const
              ).map(([label, proposed, previous]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-0.5 break-all text-[13px] font-semibold text-slate-900">
                    {proposed || "—"}
                  </p>
                  {previous ? (
                    <p className="mt-0.5 break-all text-[11px] text-slate-500">
                      Was: {previous}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {bankChangeRequest.bankProofDocumentUrl ? (
              <a
                href={bankChangeRequest.bankProofDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[#2f3d95] hover:underline"
              >
                <FileText className="h-4 w-4" />
                View cancelled cheque / bank proof
              </a>
            ) : null}

            {bankChangeRequest.status === "REJECTED" ? (
              <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900 ring-1 ring-rose-100">
                <p className="font-semibold">Rejection reason</p>
                <p className="mt-1">
                  {bankChangeRequest.rejectionRemarks || "No remarks provided."}
                </p>
                <p className="mt-1 text-[12px]">
                  {bankChangeRequest.rejectedAt
                    ? new Date(bankChangeRequest.rejectedAt).toLocaleString("en-IN")
                    : ""}
                  {bankChangeRequest.rejectedByName
                    ? ` · ${bankChangeRequest.rejectedByName}`
                    : ""}
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              className="mt-4 w-full bg-slate-800 text-white hover:bg-slate-900"
              onClick={() => setShowSubmittedRequest(false)}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
