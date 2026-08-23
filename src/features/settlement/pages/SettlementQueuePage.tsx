import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { canApproveSupplierSettlement } from "@/constants/roles";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  formatReportDateTime,
  formatStatusLabel,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import { settlementService } from "../services/settlementService";
import {
  SETTLEMENT_COMPONENTS,
  type SettlementSummary,
} from "../services/settlementTypes";
import {
  SettlementFilterDrawer,
  SettlementFilterField,
  SettlementMoney,
  SettlementPageShell,
  SettlementRefreshButton,
  SettlementStatusBadge,
  formatSettlementPeriod,
} from "../components/settlementUi";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Filter,
  Loader2,
  RotateCcw,
  Send,
  X,
} from "lucide-react";

const PAGE_SIZE = 20;

type QueueMode = "pending" | "approved" | "rejected";

type QueueFilterDraft = {
  settlementNo: string;
  supplierName: string;
  component: string;
  fromDateText: string;
  toDateText: string;
};

const DEFAULT_QUEUE_FILTERS: QueueFilterDraft = {
  settlementNo: "",
  supplierName: "",
  component: "",
  fromDateText: "",
  toDateText: "",
};

function getMode(pathname: string): QueueMode {
  if (pathname.includes("/approved")) return "approved";
  if (pathname.includes("/rejected")) return "rejected";
  return "pending";
}

export default function SettlementQueuePage() {
  const location = useLocation();
  const mode = getMode(location.pathname);
  const { user } = useAuth();
  const canApprove = canApproveSupplierSettlement(user?.roles);
  const { toast, showToast, hideToast } = useToast();

  const [applied, setApplied] = useState<QueueFilterDraft>(DEFAULT_QUEUE_FILTERS);
  const [draft, setDraft] = useState<QueueFilterDraft>(DEFAULT_QUEUE_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SettlementSummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const meta = useMemo(() => {
    if (mode === "approved") {
      return {
        title: "Approved Settlements",
        subtitle: "Ready for payout release",
        icon: CheckCircle2,
      };
    }
    if (mode === "rejected") {
      return {
        title: "Rejected Settlements",
        subtitle: "Historical rejections — regenerate via workbench",
        icon: RotateCcw,
      };
    }
    return {
      title: "Pending Settlements",
      subtitle: "Awaiting checker approval (maker-checker)",
      icon: ClipboardList,
    };
  }, [mode]);

  const activeFilterCount = useMemo(
    () =>
      (applied.settlementNo.trim() ? 1 : 0) +
      (applied.supplierName.trim() ? 1 : 0) +
      (applied.component ? 1 : 0) +
      (applied.fromDateText || applied.toDateText ? 1 : 0),
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
      const params = {
        supplierName: applied.supplierName.trim() || undefined,
        component: applied.component || undefined,
        settlementNo: applied.settlementNo.trim() || undefined,
        fromDate: range.fromDate || undefined,
        toDate: range.toDate || undefined,
        page,
        size: PAGE_SIZE,
      };
      const fetcher =
        mode === "approved"
          ? settlementService.getApproved
          : mode === "rejected"
            ? settlementService.getRejected
            : settlementService.getPending;
      const response = await fetcher(params);
      setRows(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    applied,
    mode,
    page,
    showToast,
  ]);

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
      settlementNo: draft.settlementNo,
      supplierName: draft.supplierName,
      component: draft.component,
      fromDateText: draft.fromDateText,
      toDateText: draft.toDateText,
    });
    if (page !== 0) setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_QUEUE_FILTERS);
    setApplied(DEFAULT_QUEUE_FILTERS);
    if (page !== 0) setPage(0);
    setFilterOpen(false);
  };

  useEffect(() => {
    setPage(0);
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (
    settlementId: string,
    action: () => Promise<{ raw: unknown }>,
    successMsg: string,
  ) => {
    setBusyId(settlementId);
    try {
      await action();
      showToast(successMsg, "success");
      void load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectOpen || !rejectReason.trim()) {
      showToast("Rejection reason is required", "error");
      return;
    }
    await runAction(
      rejectOpen,
      () => settlementService.reject(rejectOpen, rejectReason.trim()),
      "Settlement rejected",
    );
    setRejectOpen(null);
    setRejectReason("");
  };

  return (
    <>
      <SettlementPageShell
        title={meta.title}
        subtitle={meta.subtitle}
        icon={meta.icon}
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
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Settlement</th>
                  <th className="px-4 py-2.5 font-semibold">Supplier</th>
                  <th className="px-4 py-2.5 font-semibold">Period</th>
                  <th className="px-4 py-2.5 font-semibold">Payable</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  {mode !== "pending" ? (
                    <th className="px-4 py-2.5 font-semibold">Meta</th>
                  ) : null}
                  <th className="px-4 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td
                      colSpan={mode === "pending" ? 6 : 7}
                      className="px-4 py-16 text-center text-slate-500"
                    >
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={mode === "pending" ? 6 : 7}
                      className="px-4 py-16 text-center text-slate-500"
                    >
                      No settlements in this queue.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const id = row.settlementId || row.settlementNo || "";
                    const isBusy = busyId === id;
                    return (
                      <tr key={id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <Link
                            to={ROUTES.SETTLEMENT.DETAIL(id)}
                            className="font-mono text-xs font-semibold text-[#2f3d95] hover:underline"
                          >
                            {id}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {row.supplierName || "—"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatStatusLabel(row.component)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                          {formatSettlementPeriod(row.period)}
                        </td>
                        <td className="px-4 py-3">
                          <SettlementMoney value={row.payableAmount} />
                        </td>
                        <td className="px-4 py-3">
                          <SettlementStatusBadge
                            status={row.payoutStatus || row.status}
                          />
                        </td>
                        {mode !== "pending" ? (
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {mode === "approved" && row.approvedBy ? (
                              <>
                                {row.approvedBy}
                                <br />
                                {formatReportDateTime(row.approvedAt)}
                              </>
                            ) : mode === "rejected" ? (
                              <>
                                {row.rejectedBy || "—"}
                                <br />
                                {row.rejectionReason || "—"}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Link
                              to={ROUTES.SETTLEMENT.DETAIL(id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                            {mode === "pending" && canApprove ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void runAction(
                                      id,
                                      () => settlementService.approve(id),
                                      "Settlement approved",
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setRejectOpen(id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            {mode === "approved" && canApprove ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  void runAction(
                                    id,
                                    () => settlementService.releasePayment(id),
                                    "Payment queued",
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-[#2f3d95] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                <Send className="h-3.5 w-3.5" />
                                Release payment
                              </button>
                            ) : null}
                          </div>
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
              Page {page + 1} of {Math.max(totalPages, 1)} ·{" "}
              {totalElements.toLocaleString("en-IN")} total
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
        </div>
      </SettlementPageShell>

      <SettlementFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilterDraft}
      >
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
      </SettlementFilterDrawer>

      {rejectOpen ? (
        <>
          <button
            type="button"
            aria-label="Close reject dialog"
            className="fixed inset-0 z-40 bg-slate-900/50"
            onClick={() => setRejectOpen(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Reject settlement
              </h3>
              <button type="button" onClick={() => setRejectOpen(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <p className="mb-3 text-xs text-rose-700">
              You are about to reject {rejectOpen}. Supplier will become
              eligible again in workbench.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Rejection reason (required)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReject()}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Reject
              </button>
            </div>
          </div>
        </>
      ) : null}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
