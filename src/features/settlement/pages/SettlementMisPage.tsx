import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatFinanceMoney,
  formatReportDate,
  formatStatusLabel,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import { settlementService } from "../services/settlementService";
import {
  SETTLEMENT_COMPONENTS,
  type SettlementMisRow,
} from "../services/settlementTypes";
import {
  SettlementFilterDrawer,
  SettlementFilterField,
  SettlementMoney,
  SettlementPageShell,
  SettlementRefreshButton,
  SettlementReportSection,
  SettlementReportStatCard,
  SettlementStatusBadge,
  formatSettlementPeriod,
} from "../components/settlementUi";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  IndianRupee,
  Loader2,
  Wallet,
} from "lucide-react";

const PAGE_SIZE = 20;

const MIS_PAYOUT_STATUSES = [
  "PAID",
  "PENDING",
  "APPROVED",
  "PAYMENT_QUEUED",
  "PAYMENT_PROCESSING",
  "FAILED",
  "REVERSED",
  "REJECTED",
] as const;

type MisFilterDraft = {
  fromDateText: string;
  toDateText: string;
  component: string;
  supplierName: string;
  settlementNo: string;
  payoutStatus: string;
};

const DEFAULT_MIS_FILTERS: MisFilterDraft = {
  fromDateText: "",
  toDateText: "",
  component: "",
  supplierName: "",
  settlementNo: "",
  payoutStatus: "",
};

export default function SettlementMisPage() {
  const { toast, showToast, hideToast } = useToast();

  const [applied, setApplied] = useState<MisFilterDraft>(DEFAULT_MIS_FILTERS);
  const [draft, setDraft] = useState<MisFilterDraft>(DEFAULT_MIS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SettlementMisRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [dateRangeLabel, setDateRangeLabel] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalPayable: null as { amount: number; currency: string } | null,
    totalSettlements: 0,
    paid: null as { amount: number; currency: string } | null,
    pending: null as { amount: number; currency: string } | null,
  });
  const activeFilterCount = useMemo(
    () =>
      (applied.fromDateText || applied.toDateText ? 1 : 0) +
      (applied.component ? 1 : 0) +
      (applied.supplierName.trim() ? 1 : 0) +
      (applied.settlementNo.trim() ? 1 : 0) +
      (applied.payoutStatus ? 1 : 0),
    [applied],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = validateOptionalDateRange(
        applied.fromDateText,
        applied.toDateText,
      );
      if (!range.ok) {
        showToast(range.message, "error");
        setLoading(false);
        return;
      }
      const response = await settlementService.getMis({
        fromDate: range.fromDate || undefined,
        toDate: range.toDate || undefined,
        component: applied.component || undefined,
        supplierName: applied.supplierName.trim() || undefined,
        settlementNo: applied.settlementNo.trim() || undefined,
        payoutStatus: applied.payoutStatus || undefined,
        page,
        size: PAGE_SIZE,
      });
      setRows(response.data.settlements);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      setSummary(response.data.summary);
      if (response.data.fromDate || response.data.toDate) {
        setDateRangeLabel(
          formatSettlementPeriod({
            from: response.data.fromDate ?? null,
            to: response.data.toDate ?? null,
          }),
        );
      } else if (range.fromDate || range.toDate) {
        setDateRangeLabel(
          `${range.fromDate ? formatReportDate(range.fromDate) : "…"} – ${
            range.toDate ? formatReportDate(range.toDate) : "…"
          }`,
        );
      } else {
        setDateRangeLabel(null);
      }
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [applied, page, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openFilterDrawer = () => {
    setDraft(applied);
    setFilterOpen(true);
  };

  const applyFilterDraft = () => {
    const range = validateOptionalDateRange(
      draft.fromDateText,
      draft.toDateText,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }
    setApplied({
      fromDateText: draft.fromDateText,
      toDateText: draft.toDateText,
      component: draft.component,
      supplierName: draft.supplierName,
      settlementNo: draft.settlementNo,
      payoutStatus: draft.payoutStatus,
    });
    if (page !== 0) setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_MIS_FILTERS);
    setApplied(DEFAULT_MIS_FILTERS);
    if (page !== 0) setPage(0);
    setFilterOpen(false);
  };

  return (
    <>
      <SettlementPageShell
        title="Settlement MIS"
        subtitle={
          dateRangeLabel
            ? `Finance dashboard · ${dateRangeLabel}`
            : "Finance dashboard — payable, paid, and settlement KPIs"
        }
        icon={BarChart3}
        iconClassName="bg-gradient-to-br from-indigo-500 to-violet-600"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openFilterDrawer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <SettlementRefreshButton loading={loading} onClick={() => void load()} />
          </div>
        }
      >
        <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SettlementReportStatCard
            label="Total payable"
            value={
              loading ? "…" : formatFinanceMoney(summary.totalPayable)
            }
            icon={IndianRupee}
            tone="navy"
          />
          <SettlementReportStatCard
            label="Settlements"
            value={
              loading ? "…" : summary.totalSettlements.toLocaleString("en-IN")
            }
            icon={BarChart3}
            tone="sky"
          />
          <SettlementReportStatCard
            label="Paid"
            value={loading ? "…" : formatFinanceMoney(summary.paid)}
            icon={Wallet}
            tone="emerald"
          />
          <SettlementReportStatCard
            label="Pending"
            value={loading ? "…" : formatFinanceMoney(summary.pending)}
            icon={Clock}
            tone="amber"
          />
        </div>

        <SettlementReportSection title="Settlement records" flush>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#263578] bg-[#2f3d95] text-white">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    Settlement
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    Supplier
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    Period
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    Gross
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    Payable
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    Payout
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    UTR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading MIS…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                      No settlement records for selected filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const payoutStatus = row.payoutStatus || row.status;
                    return (
                      <tr key={row.settlementNo} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <Link
                            to={ROUTES.SETTLEMENT.DETAIL(row.settlementNo)}
                            className="font-mono text-xs font-semibold text-indigo-700 hover:underline"
                          >
                            {row.settlementNo}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">
                                {row.supplierName}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {[
                                  row.supplierType,
                                  row.component,
                                ]
                                  .filter(Boolean)
                                  .map((value) => formatStatusLabel(value))
                                  .filter(
                                    (value, index, list) =>
                                      list.indexOf(value) === index,
                                  )
                                  .join(" · ")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {formatSettlementPeriod(row.period)}
                        </td>
                        <td className="px-4 py-3">
                          <SettlementMoney value={row.gross} />
                        </td>
                        <td className="px-4 py-3">
                          <SettlementMoney value={row.payable} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <SettlementStatusBadge status={payoutStatus} />
                            {row.status &&
                            row.payoutStatus &&
                            row.status !== row.payoutStatus ? (
                              <p className="text-[10px] text-slate-500">
                                Settlement: {formatStatusLabel(row.status)}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {row.utr || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              {totalElements.toLocaleString("en-IN")} settlements · Page{" "}
              {page + 1} of {Math.max(totalPages, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </SettlementReportSection>
      </SettlementPageShell>

      <SettlementFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilterDraft}
      >
        <ReportCustomDateFields
          fromText={draft.fromDateText}
          toText={draft.toDateText}
          onFromTextChange={(value) =>
            setDraft((prev) => ({ ...prev, fromDateText: value }))
          }
          onToTextChange={(value) =>
            setDraft((prev) => ({ ...prev, toDateText: value }))
          }
        />
        <SettlementFilterField label="Component">
          <select
            value={draft.component}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, component: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All components</option>
            {SETTLEMENT_COMPONENTS.map((item) => (
              <option key={item} value={item}>
                {formatStatusLabel(item)}
              </option>
            ))}
          </select>
        </SettlementFilterField>
        <SettlementFilterField label="Payout status">
          <select
            value={draft.payoutStatus}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, payoutStatus: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {MIS_PAYOUT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </SettlementFilterField>
        <SettlementFilterField label="Supplier name">
          <input
            type="text"
            value={draft.supplierName}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, supplierName: e.target.value }))
            }
            placeholder="Supplier name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </SettlementFilterField>
        <SettlementFilterField label="Settlement no">
          <input
            type="text"
            value={draft.settlementNo}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, settlementNo: e.target.value }))
            }
            placeholder="e.g. STL-202608-000002"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </SettlementFilterField>
      </SettlementFilterDrawer>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
