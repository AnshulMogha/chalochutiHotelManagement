import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, Input, Label, Select } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/constants";
import { adminService } from "../services/adminService";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const TITLE_OPTIONS = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Miss", label: "Miss" },
  { value: "Dr", label: "Dr" },
];

function isApiFailure(err: unknown): err is ApiFailureResponse {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as ApiFailureResponse).message === "string"
  );
}

export default function CreateAgentPage() {
  const navigate = useNavigate();
  const { onboardingId } = useParams<{ onboardingId: string }>();
  const isEditMode = Boolean(onboardingId);
  const { toast, showToast, hideToast } = useToast();

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);

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
  const latestPanUrlRef = useRef("");

  useEffect(() => {
    latestPanUrlRef.current = panCardDocumentUrl;
  }, [panCardDocumentUrl]);

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
        const item = await adminService.getTravelAgentOnboardingById(onboardingId);
        if (cancelled) return;
        if (item.status !== "REJECTED") {
          setLoadError(
            "Only rejected applications can be updated here. Open the Agents list and use Update on a rejected row.",
          );
          return;
        }
        setTitle(item.title || "Mr");
        setFullName(item.fullName);
        setEmail(item.email);
        setAgencyName(item.agencyName);
        setPanNumber(item.panNumber);
        setPanCardDocumentUrl(item.panCardDocumentUrl);
        setPanFileLabel(item.panCardDocumentUrl ? "Document on file" : null);
        setGstNumber(item.gstNumber);
        setBusinessAddress(item.businessAddress);
        setCity(item.city);
        setState(item.state);
        setPinCode(item.pinCode);
        setAccountHolderName(item.accountHolderName);
        setAccountNumber(item.accountNumber);
        setIfscCode(item.ifscCode);
        setBankName(item.bankName);
        setTermsAccepted(item.termsAccepted);
      } catch (err) {
        if (!cancelled) {
          setLoadError(isApiFailure(err) ? err.message : "Could not load this application.");
        }
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onboardingId]);

  const handlePanFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setPanFileLabel(file.name);
    setUploadingPan(true);
    try {
      const res = await propertyService.uploadMedia({ media: file });
      setPanCardDocumentUrl(res.fileUrl);
      showToast("PAN document uploaded.", "success");
    } catch (err) {
      const msg = isApiFailure(err) ? err.message : "Upload failed. Try again.";
      showToast(msg, "error");
      setPanFileLabel(latestPanUrlRef.current ? "Document on file" : null);
    } finally {
      setUploadingPan(false);
    }
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      showToast("Please accept the terms to continue.", "error");
      return;
    }
    if (!panCardDocumentUrl) {
      showToast("Upload a PAN card image or PDF first.", "error");
      return;
    }
    setSubmitting(true);
    const payload = {
      title,
      fullName: fullName.trim(),
      email: email.trim(),
      agencyName: agencyName.trim(),
      panNumber: panNumber.trim().toUpperCase(),
      panCardDocumentUrl,
      gstNumber: gstNumber.trim().toUpperCase(),
      businessAddress: businessAddress.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: pinCode.trim(),
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      bankName: bankName.trim(),
      termsAccepted,
    };
    try {
      if (isEditMode && onboardingId) {
        await adminService.updateTravelAgentOnboarding(onboardingId, payload);
        showToast("Application updated and resubmitted.", "success");
      } else {
        await adminService.createTravelAgentOnboarding(payload);
        showToast("Agent onboarding submitted successfully.", "success");
      }
      navigate(ROUTES.AGENTS.LIST);
    } catch (err) {
      const msg = isApiFailure(err) ? err.message : "Could not submit onboarding.";
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
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="As per PAN"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@agency.com"
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
                <Label htmlFor="agencyName">Agency name</Label>
                <Input
                  id="agencyName"
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="panNumber">PAN number</Label>
                <Input
                  id="panNumber"
                  required
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="mt-1 font-mono uppercase"
                />
              </div>
              <div>
                <Label htmlFor="gstNumber">GST number</Label>
                <Input
                  id="gstNumber"
                  required
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="09ABCDE1234F1Z5"
                  className="mt-1 font-mono uppercase"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>PAN card document</Label>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">
                  Upload a clear photo or PDF of the PAN card. The file is uploaded securely and linked to this
                  application.
                </p>
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed p-4 transition-colors",
                    panCardDocumentUrl
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-gray-200 bg-gray-50/50 hover:border-teal-300",
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
                  {uploadingPan && <Loader2 className="h-5 w-5 animate-spin text-teal-600" />}
                  {panFileLabel && !uploadingPan && (
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      {panFileLabel}
                    </span>
                  )}
                  {panCardDocumentUrl && !uploadingPan && (
                    <span className="text-xs text-emerald-700 font-medium">Ready to submit</span>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="businessAddress">Business address</Label>
                <Input
                  id="businessAddress"
                  required
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" required value={state} onChange={(e) => setState(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="pinCode">PIN code</Label>
                <Input
                  id="pinCode"
                  required
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="201309"
                  className="mt-1"
                />
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
                <Label htmlFor="accountHolderName">Account holder name</Label>
                <Input
                  id="accountHolderName"
                  required
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="accountNumber">Account number</Label>
                <Input
                  id="accountNumber"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\s/g, ""))}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="ifscCode">IFSC</Label>
                <Input
                  id="ifscCode"
                  required
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="HDFC0001234"
                  maxLength={11}
                  className="mt-1 font-mono uppercase"
                />
              </div>
              <div>
                <Label htmlFor="bankName">Bank name</Label>
                <Input id="bankName" required value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1" />
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
            <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
              <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Terms & declarations
              </span>
              <span className="block text-gray-600 mt-1">
                I confirm the information is accurate and the agent has agreed to platform terms.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.AGENTS.LIST)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || uploadingPan || loadingRecord}
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
    </div>
  );
}
