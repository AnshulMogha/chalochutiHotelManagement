import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, Input, Label, Select } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants";
import { adminService } from "../services/adminService";
import type { StateMasterItem } from "../services/adminService";
import { propertyService } from "@/features/properties/services/propertyService";
import type { ApiFailureResponse } from "@/services/api/types/api";
import {
  ArrowLeft,
  User,
  Building2,
  Landmark,
  Upload,
  FileCheck,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TITLE_OPTIONS = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Miss", label: "Miss" },
  { value: "Dr", label: "Dr" },
];
const NAME_REGEX = /^[A-Za-z ]+$/;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 120;
const MAX_AGENCY_NAME_LENGTH = 50;
const MAX_BUSINESS_ADDRESS_LENGTH = 250;
const MAX_CITY_LENGTH = 60;
const MAX_BANK_NAME_LENGTH = 50;
const MAX_ACCOUNT_HOLDER_NAME_LENGTH = 50;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ALLOWED_PAN_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_PAN_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

function isApiFailure(err: unknown): err is ApiFailureResponse {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as ApiFailureResponse).message === "string"
  );
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isApiFailure(err)) {
    const details = (err as ApiFailureResponse & { data?: Record<string, unknown> }).data;
    if (details && typeof details === "object") {
      const firstFieldError = Object.values(details).find(
        (value) => typeof value === "string" && value.trim() !== "",
      );
      if (typeof firstFieldError === "string") {
        return firstFieldError;
      }
    }
    if (typeof err.message === "string" && err.message.trim() !== "") {
      return err.message;
    }
  }
  return fallback;
}

interface AgentFormSnapshot {
  title: string;
  fullName: string;
  email: string;
  agencyName: string;
  panNumber: string;
  panCardDocumentUrl: string;
  gstNumber: string;
  businessAddress: string;
  city: string;
  state: string;
  pinCode: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  termsAccepted: boolean;
}

export default function CreateAgentPage() {
  const navigate = useNavigate();
  const { onboardingId } = useParams<{ onboardingId: string }>();
  const isEditMode = Boolean(onboardingId);
  const { toast, showToast, hideToast } = useToast();

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [agencyNameError, setAgencyNameError] = useState<string | null>(null);
  const [accountHolderNameError, setAccountHolderNameError] = useState<string | null>(null);
  const [bankNameError, setBankNameError] = useState<string | null>(null);
  const [panError, setPanError] = useState<string | null>(null);
  const [gstError, setGstError] = useState<string | null>(null);
  const [panDocumentError, setPanDocumentError] = useState<string | null>(null);
  const [pinCodeError, setPinCodeError] = useState<string | null>(null);
  const [accountNumberError, setAccountNumberError] = useState<string | null>(null);
  const [ifscError, setIfscError] = useState<string | null>(null);

  const [title, setTitle] = useState("Mr");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [panCardDocumentUrl, setPanCardDocumentUrl] = useState("");
  const [panFileLabel, setPanFileLabel] = useState<string | null>(null);
  const [gstNumber, setGstNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [uploadingPan, setUploadingPan] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitSuccessModal, setShowSubmitSuccessModal] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState("");
  const [states, setStates] = useState<StateMasterItem[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const latestPanUrlRef = useRef("");
  const initialSnapshotRef = useRef<AgentFormSnapshot>({
    title: "Mr",
    fullName: "",
    email: "",
    agencyName: "",
    panNumber: "",
    panCardDocumentUrl: "",
    gstNumber: "",
    businessAddress: "",
    city: "",
    state: "",
    pinCode: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    termsAccepted: false,
  });

  const getCurrentSnapshot = useCallback(
    (): AgentFormSnapshot => ({
      title,
      fullName,
      email,
      agencyName,
      panNumber,
      panCardDocumentUrl,
      gstNumber,
      businessAddress,
      city,
      state,
      pinCode,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      termsAccepted,
    }),
    [
      title,
      fullName,
      email,
      agencyName,
      panNumber,
      panCardDocumentUrl,
      gstNumber,
      businessAddress,
      city,
      state,
      pinCode,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      termsAccepted,
    ],
  );

  const isFormDirty =
    JSON.stringify(getCurrentSnapshot()) !==
    JSON.stringify(initialSnapshotRef.current);

  useEffect(() => {
    latestPanUrlRef.current = panCardDocumentUrl;
  }, [panCardDocumentUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingStates(true);
      try {
        const stateList = await adminService.getStates();
        if (cancelled) return;
        setStates((stateList || []).filter((item) => item.active));
      } catch (err) {
        if (!cancelled) {
          setStates([]);
          const msg = isApiFailure(err) ? err.message : "Could not load states.";
          showToast(msg, "error");
        }
      } finally {
        if (!cancelled) setLoadingStates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on page mount; depending on showToast can retrigger on toast state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      initialSnapshotRef.current = {
        title: "Mr",
        fullName: "",
        email: "",
        agencyName: "",
        panNumber: "",
        panCardDocumentUrl: "",
        gstNumber: "",
        businessAddress: "",
        city: "",
        state: "",
        pinCode: "",
        accountHolderName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        termsAccepted: false,
      };
    }
  }, [isEditMode]);

  useEffect(() => {
    if (!onboardingId) {
      setLoadingRecord(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingRecord(true);
      setLoadError(null);
      try {
        const item =
          await adminService.getTravelAgentOnboardingById(onboardingId);
        if (cancelled) return;
        if (item.status !== "REJECTED") {
          setLoadError(
            "Only rejected applications can be updated here. Open the Agents list and use Update on a rejected row.",
          );
          return;
        }
        setTitle(item.title || "Mr");
        setFullName(item.fullName);
        setFullNameError(null);
        setEmail(item.email);
        setAgencyName(item.agencyName);
        setAgencyNameError(null);
        setPanNumber(item.panNumber);
        setPanError(null);
        setPanCardDocumentUrl(item.panCardDocumentUrl);
        setPanFileLabel(item.panCardDocumentUrl ? "Document on file" : null);
        setPanDocumentError(null);
        setGstNumber(item.gstNumber);
        setGstError(null);
        setBusinessAddress(item.businessAddress);
        setCity(item.city);
        setState(item.state);
        setPinCode(item.pinCode);
        setPinCodeError(null);
        setAccountHolderName(item.accountHolderName);
        setAccountHolderNameError(null);
        setAccountNumber(item.accountNumber);
        setAccountNumberError(null);
        setIfscCode(item.ifscCode);
        setIfscError(null);
        setBankName(item.bankName);
        setBankNameError(null);
        setTermsAccepted(item.termsAccepted);
        initialSnapshotRef.current = {
          title: item.title || "Mr",
          fullName: item.fullName,
          email: item.email,
          agencyName: item.agencyName,
          panNumber: item.panNumber,
          panCardDocumentUrl: item.panCardDocumentUrl,
          gstNumber: item.gstNumber,
          businessAddress: item.businessAddress,
          city: item.city,
          state: item.state,
          pinCode: item.pinCode,
          accountHolderName: item.accountHolderName,
          accountNumber: item.accountNumber,
          ifscCode: item.ifscCode,
          bankName: item.bankName,
          termsAccepted: item.termsAccepted,
        };
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            getApiErrorMessage(err, "Could not load this application."),
          );
        }
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onboardingId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isFormDirty || submitting) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormDirty, submitting]);

  const handlePanFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!ALLOWED_PAN_DOCUMENT_TYPES.has(file.type)) {
        showToast("Only PDF, JPG, PNG, or WEBP files are allowed.", "error");
        return;
      }
      if (file.size > MAX_PAN_DOCUMENT_SIZE_BYTES) {
        showToast("File size must be 5MB or less.", "error");
        return;
      }
      setPanFileLabel(file.name);
      setUploadingPan(true);
      try {
        const res = await propertyService.uploadMedia({ media: file });
        setPanCardDocumentUrl(res.fileUrl);
        setPanDocumentError(null);
        showToast("PAN document uploaded.", "success");
      } catch (err) {
        const msg = isApiFailure(err)
          ? err.message
          : "Upload failed. Try again.";
        showToast(msg, "error");
        setPanFileLabel(latestPanUrlRef.current ? "Document on file" : null);
      } finally {
        setUploadingPan(false);
      }
    },
    [showToast],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFullName = fullName.trim();
    if (
      trimmedFullName.length < MIN_NAME_LENGTH ||
      trimmedFullName.length > MAX_NAME_LENGTH
    ) {
      const message = `Full name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`;
      setFullNameError(message);
      showToast(
        message,
        "error",
      );
      return;
    }
    if (!NAME_REGEX.test(trimmedFullName)) {
      const message = "Full name can contain only letters and spaces.";
      setFullNameError(message);
      showToast(message, "error");
      return;
    }
    setFullNameError(null);
    if (email.trim().length > MAX_EMAIL_LENGTH) {
      showToast(`Email cannot exceed ${MAX_EMAIL_LENGTH} characters.`, "error");
      return;
    }
    if (agencyName.trim().length > MAX_AGENCY_NAME_LENGTH) {
      showToast(
        `Agency name cannot exceed ${MAX_AGENCY_NAME_LENGTH} characters.`,
        "error",
      );
      return;
    }
    const trimmedAgencyName = agencyName.trim();
    if (!NAME_REGEX.test(trimmedAgencyName)) {
      const message = "Agency name can contain only letters and spaces.";
      setAgencyNameError(message);
      showToast(message, "error");
      return;
    }
    setAgencyNameError(null);
    if (businessAddress.trim().length > MAX_BUSINESS_ADDRESS_LENGTH) {
      showToast(
        `Business address cannot exceed ${MAX_BUSINESS_ADDRESS_LENGTH} characters.`,
        "error",
      );
      return;
    }
    if (city.trim().length > MAX_CITY_LENGTH) {
      showToast(`City cannot exceed ${MAX_CITY_LENGTH} characters.`, "error");
      return;
    }
    if (accountHolderName.trim().length > MAX_ACCOUNT_HOLDER_NAME_LENGTH) {
      showToast(
        `Account holder name cannot exceed ${MAX_ACCOUNT_HOLDER_NAME_LENGTH} characters.`,
        "error",
      );
      return;
    }
    const trimmedAccountHolderName = accountHolderName.trim();
    if (!NAME_REGEX.test(trimmedAccountHolderName)) {
      const message =
        "Account holder name can contain only letters and spaces.";
      setAccountHolderNameError(message);
      showToast(message, "error");
      return;
    }
    setAccountHolderNameError(null);
    if (bankName.trim().length > MAX_BANK_NAME_LENGTH) {
      showToast(`Bank name cannot exceed ${MAX_BANK_NAME_LENGTH} characters.`, "error");
      return;
    }
    const trimmedBankName = bankName.trim();
    if (!NAME_REGEX.test(trimmedBankName)) {
      const message = "Bank name can contain only letters and spaces.";
      setBankNameError(message);
      showToast(message, "error");
      return;
    }
    setBankNameError(null);
    if (!termsAccepted) {
      showToast("Please accept the terms to continue.", "error");
      return;
    }
    const normalizedPan = panNumber.trim().toUpperCase();
    if (!PAN_REGEX.test(normalizedPan)) {
      const message = "PAN format is invalid. Use format like ABCDE1234F.";
      setPanError(message);
      showToast(message, "error");
      return;
    }
    setPanError(null);
    const normalizedGst = gstNumber.trim().toUpperCase();
    if (!GST_REGEX.test(normalizedGst)) {
      const message =
        "GST format is invalid. Use 15-character GSTIN like 09ABCDE1234F1Z5.";
      setGstError(message);
      showToast(message, "error");
      return;
    }
    setGstError(null);
    const normalizedPinCode = pinCode.trim();
    if (!/^\d{6}$/.test(normalizedPinCode)) {
      const message = "PIN code must be exactly 6 digits.";
      setPinCodeError(message);
      showToast(message, "error");
      return;
    }
    setPinCodeError(null);
    const normalizedAccountNumber = accountNumber.trim();
    if (!/^\d{9,18}$/.test(normalizedAccountNumber)) {
      const message = "Account number must be 9 to 18 digits.";
      setAccountNumberError(message);
      showToast(message, "error");
      return;
    }
    setAccountNumberError(null);
    const normalizedIfsc = ifscCode.trim().toUpperCase();
    if (!IFSC_REGEX.test(normalizedIfsc)) {
      const message = "IFSC format is invalid. Use format like HDFC0001234.";
      setIfscError(message);
      showToast(message, "error");
      return;
    }
    setIfscError(null);
    if (!panCardDocumentUrl) {
      const message = "Upload a PAN card image or PDF first.";
      setPanDocumentError(message);
      showToast(message, "error");
      return;
    }
    setPanDocumentError(null);
    setSubmitting(true);
    const payload = {
      title,
      fullName: trimmedFullName,
      email: email.trim(),
      agencyName: trimmedAgencyName,
      panNumber: normalizedPan,
      panCardDocumentUrl,
      gstNumber: normalizedGst,
      businessAddress: businessAddress.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: normalizedPinCode,
      accountHolderName: trimmedAccountHolderName,
      accountNumber: normalizedAccountNumber,
      ifscCode: normalizedIfsc,
      bankName: trimmedBankName,
      termsAccepted,
    };
    try {
      if (isEditMode && onboardingId) {
        await adminService.updateTravelAgentOnboarding(onboardingId, payload);
        setSubmitSuccessMessage("Application updated and resubmitted.");
      } else {
        await adminService.createTravelAgentOnboarding(payload);
        setSubmitSuccessMessage("Agent onboarding submitted successfully.");
      }
      setShowSubmitSuccessModal(true);
    } catch (err) {
      const msg = getApiErrorMessage(err, "Could not submit onboarding.");
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-emerald-50/40 pb-12">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <Link
          to={ROUTES.AGENTS.LIST}
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to agents
        </Link>

        {loadingRecord && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-600 text-sm">
            Loading application…
          </div>
        )}

        {!loadingRecord && loadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 mb-6">
            <p className="font-medium">{loadError}</p>
            <Link
              to={ROUTES.AGENTS.LIST}
              className="mt-4 inline-block text-emerald-700 font-medium hover:underline"
            >
              Return to agents list
            </Link>
          </div>
        )}

        {!loadingRecord && !loadError && (
          <>
            <div className="flex items-start gap-3 mb-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? "Update agent onboarding" : "Add travel agent"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {isEditMode
                    ? "Correct the details below and save to resubmit after rejection."
                    : "Complete KYC and bank details. Upload a clear PAN document."}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-base font-semibold text-blue-900 mb-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <User className="h-4 w-4" />
                  </span>
                  Personal
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <Select
                      label="Title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      options={TITLE_OPTIONS}
                      placeholder="Title"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Label htmlFor="fullName">
                      Full name<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      required
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fullNameError) setFullNameError(null);
                      }}
                      placeholder="As per PAN"
                      maxLength={MAX_NAME_LENGTH}
                      className={cn(
                        "mt-1",
                        fullNameError && "border-rose-400 focus-visible:ring-rose-500",
                      )}
                    />
                    {fullNameError && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {fullNameError}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="email">
                      Email<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="agent@agency.com"
                      maxLength={MAX_EMAIL_LENGTH}
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-base font-semibold text-teal-900 mb-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <Building2 className="h-4 w-4" />
                  </span>
                  Agency & PAN
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="agencyName">
                      Agency name<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="agencyName"
                      required
                      value={agencyName}
                      onChange={(e) => {
                        setAgencyName(e.target.value);
                        if (agencyNameError) setAgencyNameError(null);
                      }}
                      maxLength={MAX_AGENCY_NAME_LENGTH}
                      className={cn(
                        "mt-1",
                        agencyNameError &&
                          "border-rose-400 focus-visible:ring-rose-500",
                      )}
                    />
                    {agencyNameError && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {agencyNameError}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="panNumber">
                      PAN number<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="panNumber"
                      required
                      value={panNumber}
                      onChange={(e) => {
                        setPanNumber(e.target.value.toUpperCase());
                        if (panError) setPanError(null);
                      }}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className={cn(
                        "mt-1 font-mono uppercase",
                        panError && "border-rose-400 focus-visible:ring-rose-500",
                      )}
                    />
                    {panError && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {panError}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="gstNumber">
                      GST number<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="gstNumber"
                      required
                      value={gstNumber}
                      onChange={(e) => {
                        setGstNumber(e.target.value.toUpperCase());
                        if (gstError) setGstError(null);
                      }}
                      placeholder="09ABCDE1234F1Z5"
                      className={cn(
                        "mt-1 font-mono uppercase",
                        gstError && "border-rose-400 focus-visible:ring-rose-500",
                      )}
                    />
                    {gstError && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {gstError}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label>
                      PAN card document<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5 mb-2">
                      Upload a clear photo or PDF of the PAN card. The file is
                      uploaded securely and linked to this application.
                    </p>
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed p-4 transition-colors",
                        panCardDocumentUrl
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-gray-200 bg-gray-50/50 hover:border-teal-300",
                        panDocumentError && "border-rose-300 bg-rose-50/40",
                      )}
                    >
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-teal-800 shadow-sm ring-1 ring-teal-200 hover:bg-teal-50">
                        <Upload className="h-4 w-4" />
                        {uploadingPan ? "Uploading…" : "Choose file"}
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          disabled={uploadingPan}
                          onChange={(ev) => {
                            const f = ev.target.files?.[0];
                            void handlePanFile(f ?? null);
                            ev.target.value = "";
                          }}
                        />
                      </label>
                      {uploadingPan && (
                        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                      )}
                      {panFileLabel && !uploadingPan && (
                        <span className="text-sm text-gray-600 flex items-center gap-1.5">
                          <FileCheck className="h-4 w-4 text-emerald-600" />
                          {panFileLabel}
                        </span>
                      )}
                      {panCardDocumentUrl && !uploadingPan && (
                        <span className="text-xs text-emerald-700 font-medium">
                          Ready to submit
                        </span>
                      )}
                    </div>
                    {panDocumentError && (
                      <p className="mt-2 text-xs font-medium text-rose-600">
                        {panDocumentError}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="businessAddress">
                      Business address<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="businessAddress"
                      required
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      maxLength={MAX_BUSINESS_ADDRESS_LENGTH}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">
                      City<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      maxLength={MAX_CITY_LENGTH}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Select
                      label="State"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      options={
                        loadingStates
                          ? [{ value: "", label: "Loading states..." }]
                          : states.length > 0
                            ? states.map((item) => ({
                                value: item.name,
                                label: item.name,
                              }))
                            : [{ value: "", label: "No states available" }]
                      }
                      placeholder="Select state"
                      disabled={loadingStates || states.length === 0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pinCode">
                      PIN code<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="pinCode"
                      required
                      value={pinCode}
                      onChange={(e) =>
                        {
                          setPinCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          );
                          if (pinCodeError) setPinCodeError(null);
                        }
                      }
                      placeholder="201309"
                      className={cn(
                        "mt-1",
                        pinCodeError && "border-rose-400 focus-visible:ring-rose-500",
                      )}
                    />
                    {pinCodeError && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {pinCodeError}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-base font-semibold text-indigo-900 mb-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Landmark className="h-4 w-4" />
                  </span>
                  Bank account
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="accountHolderName">
                      Account holder name
                      <span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="accountHolderName"
                      required
                      value={accountHolderName}
                      onChange={(e) => {
                        setAccountHolderName(e.target.value);
                        if (accountHolderNameError) setAccountHolderNameError(null);
                      }}
                      maxLength={MAX_ACCOUNT_HOLDER_NAME_LENGTH}
                      className={cn(
                        "mt-1",
                        accountHolderNameError &&
                          "border-rose-400 focus-visible:ring-rose-500",
                      )}
                    />
                    {accountHolderNameError && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {accountHolderNameError}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="accountNumber">
                      Account number<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="accountNumber"
                      required
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 18));
                        if (accountNumberError) setAccountNumberError(null);
                      }}
                      maxLength={18}
                      className={cn(
                        "mt-1 font-mono",
                        accountNumberError && "border-rose-400 focus-visible:ring-rose-500",
                      )}
                    />
                    {accountNumberError && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {accountNumberError}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="ifscCode">
                      IFSC<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="ifscCode"
                      required
                      value={ifscCode}
                      onChange={(e) => {
                        setIfscCode(e.target.value.toUpperCase());
                        if (ifscError) setIfscError(null);
                      }}
                      placeholder="HDFC0001234"
                      maxLength={11}
                      className={cn(
                        "mt-1 font-mono uppercase",
                        ifscError && "border-rose-400 focus-visible:ring-rose-500",
                      )}
                    />
                    {ifscError && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {ifscError}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="bankName">
                      Bank name<span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="bankName"
                      required
                      value={bankName}
                      onChange={(e) => {
                        setBankName(e.target.value);
                        if (bankNameError) setBankNameError(null);
                      }}
                      maxLength={MAX_BANK_NAME_LENGTH}
                      className={cn(
                        "mt-1",
                        bankNameError &&
                          "border-rose-400 focus-visible:ring-rose-500",
                      )}
                    />
                    {bankNameError && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {bankNameError}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5 flex gap-3 items-start">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Terms & declarations
                  </span>
                  <span className="block text-gray-600 mt-1">
                    I confirm the information is accurate and the agent has
                    agreed to platform terms.
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 justify-end pt-2">
                {submitting && (
                  <p className="w-full text-right text-sm font-medium text-emerald-700">
                    {isEditMode
                      ? "Submitting updated application..."
                      : "Submitting onboarding application..."}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(ROUTES.AGENTS.LIST)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    submitting || uploadingPan || loadingRecord || !termsAccepted
                  }
                  isLoading={submitting}
                  className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 min-w-[160px]"
                >
                  {isEditMode ? "Save & resubmit" : "Submit onboarding"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
      {showSubmitSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-emerald-100 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Form submitted
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {submitSuccessMessage}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setShowSubmitSuccessModal(false);
                  navigate(ROUTES.AGENTS.LIST);
                }}
                className="min-w-24"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
