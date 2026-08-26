import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { canApproveSupplierSettlement } from "@/constants/roles";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  SettlementDetailMeta,
  SettlementDetailSummary,
  SettlementMetaRow,
  SettlementPageShell,
  SettlementPreviewBookingsTable,
  SettlementRefreshButton,
  SettlementReportSection,
  SettlementStatusBadge,
  formatSettlementPeriod,
} from "../components/settlementUi";
import {
  formatFinanceMoney,
  formatReportDateTime,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import { settlementService } from "../services/settlementService";
import type { PaymentHistoryItem, SettlementDetail } from "../services/settlementTypes";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Hash,
  Layers,
  Loader2,
  RotateCcw,
  Send,
  User,
  X,
} from "lucide-react";

function formatPaymentEventTime(item: PaymentHistoryItem): string {
  return (
    formatReportDateTime(item.completedAt) ||
    formatReportDateTime(item.requestedAt) ||
    formatReportDateTime(item.failedAt) ||
    "—"
  );
}

export default function SettlementDetailPage() {
  const { settlementNo } = useParams<{ settlementNo: string }>();
  const { user } = useAuth();
  const canApprove = canApproveSupplierSettlement(user?.roles);
  const { toast, showToast, hideToast } = useToast();

  const [detail, setDetail] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    if (!settlementNo) return;
    setLoading(true);
    try {
      const result = await settlementService.getDetail(settlementNo);
      setDetail(result.data);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [settlementNo, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (
    action: () => Promise<unknown>,
    successMsg: string,
  ) => {
    setBusy(true);
    try {
      await action();
      showToast(successMsg, "success");
      await load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const status = String(detail?.status || "").toUpperCase();
  const id = detail?.settlementNo || detail?.settlementId || settlementNo || "";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#f7f8fa] text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading settlement…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-lg bg-[#f7f8fa] px-4 py-16 text-center">
        <p className="text-slate-600">Settlement not found.</p>
        <Link
          to={ROUTES.SETTLEMENT.WORKBENCH}
          className="mt-4 inline-flex text-sm font-medium text-[#2f3d95]"
        >
          Back to workbench
        </Link>
      </div>
    );
  }

  const timeline = [...(detail.statusHistory || [])].sort((a, b) =>
    String(b.changedAt).localeCompare(String(a.changedAt)),
  );
  const payments = detail.paymentHistory || [];

  return (
    <SettlementPageShell
      title={id}
      subtitle={<SettlementDetailMeta detail={detail} />}
      icon={FileText}
      iconClassName="bg-gradient-to-br from-indigo-500 to-violet-600"
      actions={
        <div className="flex items-center gap-2">
          <SettlementStatusBadge status={detail.payoutStatus || detail.status} />
          <Link
            to={ROUTES.SETTLEMENT.PENDING}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <SettlementRefreshButton loading={loading} onClick={() => void load()} />
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SettlementDetailSummary detail={detail} />

          {detail.lineItems && detail.lineItems.length > 0 ? (
            <SettlementReportSection
              title="Line items"
              description={`${detail.lineItems.length} booking(s) in this settlement`}
              flush
            >
              <SettlementPreviewBookingsTable
                bookings={detail.lineItems}
                component={detail.component}
                hotelId={
                  String(detail.component || "").toUpperCase() === "HOTEL"
                    ? detail.supplierId
                    : null
                }
                variant="report"
              />
            </SettlementReportSection>
          ) : null}

          {timeline.length > 0 ? (
            <SettlementReportSection title="Status timeline">
              <ol className="space-y-4">
                {timeline.map((item, idx) => (
                  <li
                    key={`${item.status}-${item.changedAt}-${idx}`}
                    className="relative ml-1 border-l-2 border-[#2f3d95]/15 pl-4"
                  >
                    <span className="absolute -left-1.25 top-1.5 h-2 w-2 rounded-full bg-[#2f3d95]" />
                    <div className="flex flex-wrap items-center gap-2">
                      <SettlementStatusBadge status={item.status} />
                      <span className="ml-auto text-[11px] text-slate-400">
                        {formatReportDateTime(item.changedAt)}
                      </span>
                    </div>
                    {item.changedBy ? (
                      <p className="mt-1 text-xs text-slate-500">{item.changedBy}</p>
                    ) : null}
                    {item.note ? (
                      <p className="mt-1 text-sm text-slate-700">{item.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </SettlementReportSection>
          ) : null}

          {payments.length > 0 ? (
            <SettlementReportSection
              title="Payment history"
              description={`${payments.length} payout attempt(s)`}
            >
              <div className="space-y-3">
                {payments.map((item, idx) => (
                  <div
                    key={`${item.payoutId || item.payoutReference || idx}`}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <SettlementStatusBadge status={item.status} />
                      {item.amount ? (
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatFinanceMoney(item.amount)}
                        </span>
                      ) : null}
                      <span className="ml-auto text-[11px] text-slate-400">
                        {formatPaymentEventTime(item)}
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                      {item.payoutId ? (
                        <div>
                          <dt className="text-slate-400">Payout ID</dt>
                          <dd className="font-mono">{item.payoutId}</dd>
                        </div>
                      ) : null}
                      {item.payoutReference ? (
                        <div>
                          <dt className="text-slate-400">Reference</dt>
                          <dd className="font-mono">{item.payoutReference}</dd>
                        </div>
                      ) : null}
                      {item.utr ? (
                        <div>
                          <dt className="text-slate-400">UTR</dt>
                          <dd className="font-mono">{item.utr}</dd>
                        </div>
                      ) : null}
                      {item.requestedAt ? (
                        <div>
                          <dt className="text-slate-400">Requested</dt>
                          <dd>{formatReportDateTime(item.requestedAt)}</dd>
                        </div>
                      ) : null}
                      {item.completedAt ? (
                        <div>
                          <dt className="text-slate-400">Completed</dt>
                          <dd>{formatReportDateTime(item.completedAt)}</dd>
                        </div>
                      ) : null}
                      {item.failureReason ? (
                        <div className="sm:col-span-2">
                          <dt className="text-slate-400">Failure</dt>
                          <dd className="text-rose-700">{item.failureReason}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                ))}
              </div>
            </SettlementReportSection>
          ) : null}
        </div>

        <div className="space-y-4">
          <SettlementReportSection title="Settlement info">
            <SettlementMetaRow
              icon={Building2}
              label="Supplier"
              value={detail.supplierName || "—"}
            />
            <SettlementMetaRow
              icon={Layers}
              label="Component"
              value={formatStatusLabel(detail.component)}
            />
            <SettlementMetaRow
              icon={Calendar}
              label="Period"
              value={formatSettlementPeriod(detail.period)}
            />
            <SettlementMetaRow
              icon={User}
              label="Created by"
              value={detail.createdByName || detail.createdBy || "—"}
            />
            <SettlementMetaRow
              icon={Calendar}
              label="Created"
              value={formatReportDateTime(detail.createdAt)}
            />
            {detail.approvedBy || detail.approvedAt ? (
              <SettlementMetaRow
                icon={CheckCircle2}
                label="Approved"
                value={
                  detail.approvedBy && detail.approvedAt
                    ? `${detail.approvedBy} · ${formatReportDateTime(detail.approvedAt)}`
                    : detail.approvedBy ||
                      formatReportDateTime(detail.approvedAt) ||
                      "—"
                }
              />
            ) : null}
            {detail.rejectionReason ? (
              <SettlementMetaRow
                icon={X}
                label="Rejection"
                value={
                  <span className="text-rose-700">{detail.rejectionReason}</span>
                }
              />
            ) : null}
            {detail.payoutId ? (
              <SettlementMetaRow
                icon={CreditCard}
                label="Payout ID"
                value={detail.payoutId}
                mono
              />
            ) : null}
            {detail.payoutRequestedAt ? (
              <SettlementMetaRow
                icon={Clock}
                label="Payout requested"
                value={formatReportDateTime(detail.payoutRequestedAt)}
              />
            ) : null}
            {detail.payoutCompletedAt ? (
              <SettlementMetaRow
                icon={CheckCircle2}
                label="Payout completed"
                value={formatReportDateTime(detail.payoutCompletedAt)}
              />
            ) : null}
            {detail.utr ? (
              <SettlementMetaRow
                icon={Hash}
                label="UTR"
                value={detail.utr}
                mono
              />
            ) : null}
          </SettlementReportSection>

          {canApprove ? (
            <SettlementReportSection title="Actions">
              <div className="space-y-2">
                {status === "PENDING" ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction(
                          () => settlementService.approve(id),
                          "Settlement approved",
                        )
                      }
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRejectOpen(true)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {status === "APPROVED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        () => settlementService.releasePayment(id),
                        "Payment queued",
                      )
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Release payment
                  </button>
                ) : null}
                {status === "FAILED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAction(
                        () => settlementService.retryPayment(id),
                        "Payment retry queued",
                      )
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retry payment
                  </button>
                ) : null}
                {status === "REJECTED" ? (
                  <Link
                    to={ROUTES.SETTLEMENT.WORKBENCH}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#2f3d95]"
                  >
                    Generate new via workbench
                  </Link>
                ) : null}
              </div>
            </SettlementReportSection>
          ) : null}
        </div>
      </div>

      {rejectOpen ? (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40 bg-slate-900/50"
            onClick={() => setRejectOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Reject settlement</h3>
              <button type="button" onClick={() => setRejectOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason (required)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || busy}
                onClick={() =>
                  void runAction(
                    () => settlementService.reject(id, rejectReason.trim()),
                    "Settlement rejected",
                  ).then(() => setRejectOpen(false))
                }
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
    </SettlementPageShell>
  );
}
