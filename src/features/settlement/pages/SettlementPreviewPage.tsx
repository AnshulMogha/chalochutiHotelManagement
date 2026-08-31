import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { canGenerateSupplierSettlement } from "@/constants/roles";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatFinanceMoney,
  formatReportDateTime,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import { settlementService } from "../services/settlementService";
import type { SettlementPreview } from "../services/settlementTypes";
import {
  SettlementMoney,
  SettlementPageShell,
  SettlementPreviewBookingsTable,
  SettlementRefreshButton,
  SettlementReportSection,
  SettlementReportStatCard,
  formatSettlementPeriod,
} from "../components/settlementUi";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  FileSearch,
  IndianRupee,
  ListOrdered,
  Loader2,
  Percent,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

function isPreviewStaleError(error: unknown): boolean {
  const message = extractErrorMessage(error).toUpperCase();
  return (
    message.includes("SETTLEMENT_PREVIEW_STALE") ||
    message.includes("PREVIEW_STALE") ||
    message.includes("FINGERPRINT")
  );
}

export default function SettlementPreviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canGenerate = canGenerateSupplierSettlement(user?.roles);
  const { toast, showToast, hideToast } = useToast();

  const supplierId = searchParams.get("supplierId")?.trim() || "";
  const component = searchParams.get("component")?.trim() || "";
  const cycle = searchParams.get("cycle")?.trim() || "";
  const fromDate = searchParams.get("fromDate")?.trim() || "";
  const toDate = searchParams.get("toDate")?.trim() || "";
  const existingDraft = searchParams.get("existingDraft") === "1";
  const settlementReady = searchParams.get("settlementReady") !== "0";
  const blockedReason = searchParams.get("blockedReason")?.trim() || "";

  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const period = useMemo(
    () =>
      fromDate || toDate
        ? { from: fromDate || null, to: toDate || null }
        : null,
    [fromDate, toDate],
  );

  const loadPreview = useCallback(async () => {
    if (!supplierId || !component) {
      setPreview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await settlementService.getPreview({
        supplierId,
        component,
        cycle: cycle || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setPreview(result.data);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [supplierId, component, cycle, fromDate, toDate, showToast]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const canGenerateNow =
    canGenerate &&
    !!preview?.previewFingerprint &&
    preview.bankVerified &&
    settlementReady &&
    !existingDraft;

  const blockReason = !preview
    ? null
    : !preview.bankVerified
      ? "Bank account must be verified before generating a settlement."
      : existingDraft
        ? "An active pending settlement already exists for this supplier."
        : !settlementReady
          ? `Supplier is blocked${
              blockedReason
                ? ` (${formatStatusLabel(blockedReason)})`
                : ""
            }. Resolve before generating.`
          : null;

  const handleGenerate = async () => {
    if (!preview || !canGenerateNow) return;
    setGenerating(true);
    try {
      const result = await settlementService.generateSettlement({
        supplierId,
        component,
        cycle: cycle || null,
        fromDate: fromDate || null,
        toDate: toDate || null,
        previewFingerprint: preview.previewFingerprint,
      });
      const settlementNo =
        result.data.settlementNo || result.data.settlementId;
      showToast(
        `Settlement ${settlementNo} created as PENDING. A checker must approve it.`,
        "success",
      );
      navigate(ROUTES.SETTLEMENT.DETAIL(settlementNo));
    } catch (error) {
      if (isPreviewStaleError(error)) {
        showToast(
          "Preview fingerprint is stale. Refreshing snapshot — review and generate again.",
          "error",
        );
        await loadPreview();
      } else {
        showToast(extractErrorMessage(error), "error");
      }
    } finally {
      setGenerating(false);
    }
  };

  if (!supplierId || !component) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-600">
          Missing supplier or component. Open preview from the workbench.
        </p>
        <Link
          to={ROUTES.SETTLEMENT.WORKBENCH}
          className="mt-4 inline-flex text-sm font-medium text-[#2f3d95]"
        >
          Back to workbench
        </Link>
      </div>
    );
  }

  return (
    <>
      <SettlementPageShell
        title={preview?.supplierName || "Settlement preview"}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {formatStatusLabel(preview?.component || component)}
            </span>
            {cycle ? (
              <span className="text-slate-300">· {formatStatusLabel(cycle)}</span>
            ) : null}
            {period ? (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatSettlementPeriod(period)}
              </span>
            ) : null}
          </span>
        }
        icon={FileSearch}
        iconClassName="bg-[#2f3d95]"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.SETTLEMENT.WORKBENCH}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Workbench
            </Link>
            <SettlementRefreshButton
              loading={loading}
              onClick={() => void loadPreview()}
            />
          </div>
        }
      >
        {loading && !preview ? (
          <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading preview snapshot…
          </div>
        ) : !preview ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
            Preview could not be loaded.
          </div>
        ) : (
          <div className="space-y-3">
            {preview.warnings.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                    <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
                  </div>
                  <ul className="min-w-0 space-y-1.5 text-sm text-amber-950">
                    {preview.warnings.map((warning) => (
                      <li key={`${warning.code}:${warning.message}`}>
                        <span className="font-semibold">
                          {formatStatusLabel(warning.code)}
                        </span>
                        {warning.message ? (
                          <span className="text-amber-800/90">
                            {" — "}
                            {warning.message}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <SettlementReportStatCard
                label="Payable"
                value={
                  <span className="font-sans tabular-nums text-[#2f3d95]">
                    <SettlementMoney value={preview.payableAmount} />
                  </span>
                }
                icon={IndianRupee}
                tone="emerald"
              />
              <SettlementReportStatCard
                label="Gross"
                value={
                  <span className="font-sans tabular-nums">
                    <SettlementMoney value={preview.grossAmount} />
                  </span>
                }
                icon={TrendingUp}
                tone="navy"
              />
              <SettlementReportStatCard
                label="Commission"
                value={
                  <span className="font-sans tabular-nums">
                    <SettlementMoney value={preview.commission} />
                  </span>
                }
                icon={Percent}
                tone="violet"
              />
              <SettlementReportStatCard
                label="Line items"
                value={preview.financialItemCount.toLocaleString("en-IN")}
                icon={ListOrdered}
                tone="sky"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm">
              <span className="text-slate-500">
                TDS{" "}
                <strong className="font-sans font-semibold tabular-nums text-slate-900">
                  {formatFinanceMoney(preview.tds)}
                </strong>
              </span>
              <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
              <span className="text-slate-500">
                TCS{" "}
                <strong className="font-sans font-semibold tabular-nums text-slate-900">
                  {formatFinanceMoney(preview.tcs)}
                </strong>
              </span>
              <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
              <span className="text-slate-500">
                GST{" "}
                <strong className="font-sans font-semibold tabular-nums text-slate-900">
                  {formatFinanceMoney(preview.gst)}
                </strong>
              </span>
              <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
              <span className="text-slate-500">
                Adjustments{" "}
                <strong className="font-sans font-semibold tabular-nums text-slate-900">
                  {formatFinanceMoney(preview.adjustments)}
                </strong>
              </span>
              <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                {preview.bankVerified ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                )}
                Bank{" "}
                <strong
                  className={
                    preview.bankVerified
                      ? "font-semibold text-emerald-700"
                      : "font-semibold text-rose-700"
                  }
                >
                  {preview.bankVerified ? "Verified" : "Not verified"}
                </strong>
              </span>
              {preview.latestFinancialChangeAt ? (
                <>
                  <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Snapshot{" "}
                    {formatReportDateTime(preview.latestFinancialChangeAt)}
                  </span>
                </>
              ) : null}
            </div>

            <SettlementReportSection
              title="Booking line items"
              description={`${preview.bookings.length} booking(s) in this immutable snapshot`}
              flush
            >
              <SettlementPreviewBookingsTable
                bookings={preview.bookings}
                component={preview.component || component}
                hotelId={
                  String(preview.component || component).toUpperCase() ===
                  "HOTEL"
                    ? supplierId
                    : null
                }
                variant="report"
              />
            </SettlementReportSection>

            <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0 text-xs text-slate-500">
                  {blockReason ? (
                    <p className="inline-flex items-start gap-1.5 text-rose-700">
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{blockReason}</span>
                    </p>
                  ) : canGenerate ? (
                    <p>
                      Creates a PENDING settlement. A different user must
                      approve it (maker-checker).
                    </p>
                  ) : (
                    <p>View-only access for this settlement preview.</p>
                  )}
                  {existingDraft ? (
                    <Link
                      to={ROUTES.SETTLEMENT.PENDING}
                      className="mt-1 inline-block font-semibold text-[#2f3d95] underline"
                    >
                      Open Pending queue
                    </Link>
                  ) : null}
                  {preview.previewFingerprint ? (
                    <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
                      Fingerprint {preview.previewFingerprint.slice(0, 28)}…
                    </p>
                  ) : null}
                </div>

                {canGenerate ? (
                  <button
                    type="button"
                    disabled={generating || !canGenerateNow || loading}
                    onClick={() => void handleGenerate()}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#2f3d95] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#263578] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate PENDING settlement
                  </button>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </SettlementPageShell>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
