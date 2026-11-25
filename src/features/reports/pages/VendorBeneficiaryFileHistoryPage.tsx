import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { GridColDef } from "@mui/x-data-grid";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  ArrowLeft,
  Download,
  Eye,
  History,
  Loader2,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { DataTable, formatListCount } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { canGenerateVendorBeneficiaryFile } from "@/constants/roles";
import {
  ReportAppliedFilters,
  ReportFilterButton,
  ReportFilterDrawer,
  ReportRefreshButton,
} from "@/features/reports/components/ReportFilterDrawer";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import { ReportPageHeader } from "@/features/reports/components/reportUiHelpers";
import {
  VendorBeneficiaryStatusPill,
  formatVendorBeneficiaryDateTime,
  formatVendorBeneficiaryUserLabel,
  isFileGeneratedBatchStatus,
} from "@/features/reports/components/vendorBeneficiaryUi";
import { vendorBeneficiaryMisService } from "@/features/reports/services/vendorBeneficiaryMisService";
import type {
  VendorBeneficiaryBatchListParams,
  VendorBeneficiaryBatchSummary,
} from "@/features/reports/services/vendorBeneficiaryMisTypes";

const PAGE_SIZE = 20;

type BatchStatusFilter = NonNullable<
  VendorBeneficiaryBatchListParams["batchStatus"]
>;

type FilterDraft = {
  batchNumber: string;
  fileName: string;
  batchStatus: BatchStatusFilter;
};

const DEFAULT_FILTERS: FilterDraft = {
  batchNumber: "",
  fileName: "",
  batchStatus: "",
};

const STATUS_FILTER_OPTIONS: { value: BatchStatusFilter; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "FILE_GENERATED", label: "File Generated" },
  { value: "SUBMITTED_TO_BANK", label: "Submitted to Bank" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PARTIALLY_COMPLETED", label: "Partially Completed" },
  { value: "COMPLETED_WITH_ERRORS", label: "Completed with Errors" },
];

function statusFilterLabel(status: BatchStatusFilter): string | null {
  if (!status) return null;
  return (
    STATUS_FILTER_OPTIONS.find((opt) => opt.value === status)?.label ?? status
  );
}

export default function VendorBeneficiaryFileHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canGenerate = canGenerateVendorBeneficiaryFile(user?.roles);
  const { toast, showToast, hideToast } = useToast();
  const isSmUp = useMediaQuery("(min-width:640px)");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<VendorBeneficiaryBatchSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [submitDialogBatch, setSubmitDialogBatch] =
    useState<VendorBeneficiaryBatchSummary | null>(null);
  const [submitRemarks, setSubmitRemarks] = useState("");
  const [submittingBatch, setSubmittingBatch] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      (applied.batchNumber.trim() ? 1 : 0) +
      (applied.fileName.trim() ? 1 : 0) +
      (applied.batchStatus ? 1 : 0),
    [applied],
  );

  const appliedFilterItems = useMemo(
    () => [
      {
        label: "Status",
        value: statusFilterLabel(applied.batchStatus) ?? "All",
      },
      applied.batchNumber.trim()
        ? { label: "Batch number", value: applied.batchNumber.trim() }
        : null,
      applied.fileName.trim()
        ? { label: "File name", value: applied.fileName.trim() }
        : null,
    ],
    [applied],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await vendorBeneficiaryMisService.listBatches({
        page,
        size: PAGE_SIZE,
        batchNumber: applied.batchNumber.trim() || undefined,
        fileName: applied.fileName.trim() || undefined,
        batchStatus: applied.batchStatus || undefined,
      });
      setRows(response.batches);
      setTotalPages(response.page.totalPages);
      setTotalElements(response.page.totalElements);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [page, applied, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openFilterDrawer = () => {
    setDraft(applied);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setApplied({
      batchNumber: draft.batchNumber.trim(),
      fileName: draft.fileName.trim(),
      batchStatus: draft.batchStatus,
    });
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(0);
    setFilterOpen(false);
  };

  const downloadBatch = async (batch: VendorBeneficiaryBatchSummary) => {
    setDownloadingId(batch.batchId);
    try {
      await vendorBeneficiaryMisService.downloadBatch(
        batch.batchId,
        batch.fileName,
      );
      showToast(`Downloaded ${batch.fileName}`, "success");
      await load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const openSubmitDialog = (batch: VendorBeneficiaryBatchSummary) => {
    setSubmitDialogBatch(batch);
    setSubmitRemarks("");
  };

  const handleSubmitToBank = async () => {
    if (!submitDialogBatch) return;
    setSubmittingBatch(true);
    try {
      const result = await vendorBeneficiaryMisService.submitBatchToBank(
        submitDialogBatch.batchId,
        {
          submissionRemarks: submitRemarks,
        },
      );
      const skipNote =
        result.skippedBeneficiaries > 0
          ? ` (${result.skippedBeneficiaries} skipped)`
          : "";
      showToast(
        `${result.batchNumber} marked submitted to bank${skipNote}`,
        "success",
      );
      setSubmitDialogBatch(null);
      await load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setSubmittingBatch(false);
    }
  };

  const columns = useMemo<GridColDef<VendorBeneficiaryBatchSummary>[]>(
    () => [
      {
        field: "batchNumber",
        headerName: "Batch Number",
        minWidth: 150,
        flex: 0.9,
        sortable: false,
        renderCell: ({ row }) => (
          <span
            className="whitespace-nowrap font-mono text-[12px] font-semibold text-slate-900"
            title={row.batchNumber || undefined}
          >
            {row.batchNumber || "-"}
          </span>
        ),
      },
      {
        field: "fileName",
        headerName: "File Name",
        minWidth: 180,
        flex: 1.1,
        sortable: false,
        renderCell: ({ row }) => (
          <span
            className="block truncate text-[12px]"
            title={row.fileName || undefined}
          >
            {row.fileName?.trim() ? row.fileName : "-"}
          </span>
        ),
      },
      {
        field: "totalRecords",
        headerName: "Records",
        width: 90,
        sortable: false,
        align: "right",
        headerAlign: "right",
        renderCell: ({ row }) => (
          <span className="tabular-nums text-[12px]">{row.totalRecords}</span>
        ),
      },
      {
        field: "generatedBy",
        headerName: "Generated By",
        minWidth: 140,
        flex: 0.9,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="truncate text-[12px]">
            {formatVendorBeneficiaryUserLabel(
              row.generatedBy,
              row.generatedByUserId,
            )}
          </span>
        ),
      },
      {
        field: "generatedAt",
        headerName: "Generated At",
        minWidth: 150,
        flex: 0.9,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="whitespace-nowrap text-[12px]">
            {formatVendorBeneficiaryDateTime(row.generatedAt)}
          </span>
        ),
      },
      {
        field: "submittedBy",
        headerName: "Submitted By",
        minWidth: 140,
        flex: 0.9,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="truncate text-[12px]">
            {formatVendorBeneficiaryUserLabel(
              row.submittedBy,
              row.submittedByUserId,
            )}
          </span>
        ),
      },
      {
        field: "submittedAt",
        headerName: "Submitted At",
        minWidth: 150,
        flex: 0.9,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="whitespace-nowrap text-[12px]">
            {formatVendorBeneficiaryDateTime(row.submittedAt)}
          </span>
        ),
      },
      {
        field: "batchStatus",
        headerName: "Status",
        minWidth: 140,
        width: 150,
        sortable: false,
        renderCell: ({ row }) => (
          <VendorBeneficiaryStatusPill value={row.batchStatus} />
        ),
      },
      {
        field: "actions",
        headerName: "Action",
        minWidth: 220,
        width: 240,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => {
          const canMarkSubmitted =
            canGenerate && isFileGeneratedBatchStatus(row.batchStatus);
          return (
            <div className="flex flex-nowrap items-center gap-1.5">
              <button
                type="button"
                title="View batch"
                onClick={() =>
                  navigate(
                    ROUTES.REPORTS.VENDOR_BENEFICIARY_BATCH_DETAIL(row.batchId),
                  )
                }
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </button>
              <button
                type="button"
                title="Download original file"
                disabled={downloadingId === row.batchId}
                onClick={() => void downloadBatch(row)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-[#2f3d95] hover:bg-indigo-100 disabled:opacity-60"
              >
                {downloadingId === row.batchId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </button>
              {canMarkSubmitted ? (
                <button
                  type="button"
                  title="Mark as Submitted to Bank"
                  onClick={() => openSubmitDialog(row)}
                  className="inline-flex h-7 shrink-0 items-center rounded-lg border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-800 hover:bg-sky-100"
                >
                  Mark as Submitted
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canGenerate, downloadingId, navigate],
  );

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
        <ReportPageHeader
          icon={History}
          iconClassName="bg-[#2f3d95]"
          title="Beneficiary File History"
          description="Generated beneficiary TXT batches, downloads, and submission workflow"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ReportFilterButton
                onClick={openFilterDrawer}
                activeCount={activeFilterCount}
                open={filterOpen}
              />
              <Link
                to={ROUTES.REPORTS.VENDOR_BENEFICIARY_SBI_IMPORT}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[12px] font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Bank Import
              </Link>
              <Link
                to={ROUTES.REPORTS.VENDOR_BENEFICIARIES}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to MIS
              </Link>
              <ReportRefreshButton
                onClick={() => void load()}
                loading={loading}
              />
            </div>
          }
        />

        <ReportAppliedFilters items={appliedFilterItems} className="mb-3" />

        <DataTable
          title="Beneficiary batches"
          subtitle={
            <>
              <span className="font-medium text-slate-600">
                {formatListCount(totalElements, "batch")}
              </span>
              <span className="text-slate-400">
                {" "}
                · Page {page + 1} of {Math.max(totalPages, 1)}
              </span>
            </>
          }
          rows={rows}
          columns={columns}
          getRowId={(row) => row.batchId}
          loading={loading}
          paginationMode="server"
          rowCount={totalElements}
          paginationModel={{ page, pageSize: PAGE_SIZE }}
          onPaginationModelChange={(model) => {
            if (model.page !== page) setPage(model.page);
          }}
          pageSizeOptions={[PAGE_SIZE]}
          disableRowSelectionOnClick
          disableColumnFilter
          showToolbar
          showExport={false}
          allowHorizontalScroll
          dense={false}
          rowHeight={isSmUp ? 56 : 52}
          localeText={{
            noRowsLabel:
              activeFilterCount > 0
                ? "No batches match the selected filters."
                : "No beneficiary files generated yet.",
          }}
          sx={{
            "& .MuiDataGrid-cell": {
              alignItems: "center",
              display: "flex",
              overflow: "visible",
            },
            "& .MuiDataGrid-columnHeader": {
              overflow: "visible",
            },
            "& .MuiDataGrid-virtualScroller": {
              overflowX: "auto !important",
            },
          }}
        />
      </div>

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        title="Filter"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            Batch number
          </span>
          <input
            value={draft.batchNumber}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, batchNumber: e.target.value }))
            }
            placeholder="e.g. VB-20261118"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            File name
          </span>
          <input
            value={draft.fileName}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, fileName: e.target.value }))
            }
            placeholder="e.g. BENEFICIARY"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            Status
          </span>
          <select
            value={draft.batchStatus}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                batchStatus: e.target.value as BatchStatusFilter,
              }))
            }
            className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </ReportFilterDrawer>

      {submitDialogBatch ? (
        <>
          <button
            type="button"
            aria-label="Close submit confirmation"
            className="fixed inset-0 z-[70] bg-slate-900/50"
            onClick={() => !submittingBatch && setSubmitDialogBatch(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-[80] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">
              Mark as Submitted to Bank?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Confirm only after you have successfully uploaded{" "}
              <span className="font-mono font-semibold text-slate-900">
                {submitDialogBatch.batchNumber}
              </span>{" "}
              to the bank. This records submission in StayCore; it does not mean
              the bank has approved the beneficiaries.
            </p>
            <label className="mt-3 block text-[12px] font-semibold text-slate-700">
              Submission Remarks
              <span className="ml-1 font-normal text-slate-400">(optional)</span>
              <textarea
                value={submitRemarks}
                maxLength={1000}
                rows={3}
                onChange={(e) => setSubmitRemarks(e.target.value)}
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="e.g. Uploaded via bank portal"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={submittingBatch}
                onClick={() => setSubmitDialogBatch(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingBatch}
                onClick={() => void handleSubmitToBank()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
              >
                {submittingBatch ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Confirm submission
              </button>
            </div>
          </div>
        </>
      ) : null}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
