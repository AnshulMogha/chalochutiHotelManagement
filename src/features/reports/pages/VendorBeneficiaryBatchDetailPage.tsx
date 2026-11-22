import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { GridColDef } from "@mui/x-data-grid";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Users,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { DataTable, formatListCount } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  ReportAppliedRange,
  ReportFilterButton,
  ReportFilterDrawer,
  ReportRefreshButton,
} from "@/features/reports/components/ReportFilterDrawer";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  ReportPageHeader,
  SummaryCard,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import {
  VendorBeneficiaryDetailField,
  VendorBeneficiaryStatusPill,
  formatVendorBeneficiaryDateTime,
  formatVendorBeneficiaryUserLabel,
} from "@/features/reports/components/vendorBeneficiaryUi";
import { vendorBeneficiaryMisService } from "@/features/reports/services/vendorBeneficiaryMisService";
import type {
  VendorBeneficiaryBatchDetail,
  VendorBeneficiaryBatchItem,
} from "@/features/reports/services/vendorBeneficiaryMisTypes";

const PAGE_SIZE = 20;

export default function VendorBeneficiaryBatchDetailPage() {
  const { batchId: batchIdParam } = useParams<{ batchId: string }>();
  const batchId = Number(batchIdParam);
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const isSmUp = useMediaQuery("(min-width:640px)");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<VendorBeneficiaryBatchDetail | null>(
    null,
  );
  const [items, setItems] = useState<VendorBeneficiaryBatchItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [downloading, setDownloading] = useState(false);

  const activeFilterCount = appliedSearch.trim() ? 1 : 0;

  const load = useCallback(async () => {
    if (!Number.isFinite(batchId) || batchId <= 0) {
      showToast("Invalid batch id", "error");
      navigate(ROUTES.REPORTS.VENDOR_BENEFICIARY_FILE_HISTORY);
      return;
    }
    setLoading(true);
    try {
      const data = await vendorBeneficiaryMisService.getBatchDetail(batchId, {
        page,
        size: PAGE_SIZE,
        search: appliedSearch.trim() || undefined,
      });
      setDetail(data);
      setItems(data.items);
      setTotalPages(data.page.totalPages);
      setTotalElements(data.page.totalElements);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      navigate(ROUTES.REPORTS.VENDOR_BENEFICIARY_FILE_HISTORY);
    } finally {
      setLoading(false);
    }
  }, [batchId, page, appliedSearch, navigate, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadFile = async () => {
    if (!detail) return;
    setDownloading(true);
    try {
      await vendorBeneficiaryMisService.downloadBatch(
        detail.batchId,
        detail.fileName,
      );
      showToast(`Downloaded ${detail.fileName}`, "success");
      // Re-load header only; download may mark GENERATED → DOWNLOADED.
      await load();
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setDownloading(false);
    }
  };

  const applyFilters = () => {
    setAppliedSearch(draftSearch.trim());
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftSearch("");
    setAppliedSearch("");
    setPage(0);
    setFilterOpen(false);
  };

  const columns = useMemo<GridColDef<VendorBeneficiaryBatchItem>[]>(
    () => [
      {
        field: "serial",
        headerName: "S.No",
        width: 70,
        sortable: false,
        renderCell: ({ api, id }) => {
          const index = api.getRowIndexRelativeToVisibleRows(id);
          const serial = page * PAGE_SIZE + (index >= 0 ? index : 0) + 1;
          return <span className="tabular-nums text-[12px]">{serial}</span>;
        },
      },
      {
        field: "beneficiaryCode",
        headerName: "Beneficiary Code",
        minWidth: 140,
        flex: 0.9,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="font-mono text-[12px] font-semibold text-[#2f3d95]">
            {row.beneficiaryCode || "-"}
          </span>
        ),
      },
      {
        field: "vendorName",
        headerName: "Vendor Name",
        minWidth: 160,
        flex: 1,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="truncate text-[12px]" title={row.vendorName || undefined}>
            {row.vendorName?.trim() ? row.vendorName : "-"}
          </span>
        ),
      },
      {
        field: "vendorType",
        headerName: "Vendor Type",
        minWidth: 110,
        width: 120,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="text-[12px]">{formatStatusLabel(row.vendorType)}</span>
        ),
      },
      {
        field: "accountHolderName",
        headerName: "Account Holder Name",
        minWidth: 150,
        flex: 1,
        sortable: false,
        renderCell: ({ row }) => (
          <span
            className="truncate text-[12px]"
            title={row.accountHolderName || undefined}
          >
            {row.accountHolderName?.trim() ? row.accountHolderName : "-"}
          </span>
        ),
      },
      {
        field: "maskedAccountNumber",
        headerName: "Account Number",
        minWidth: 130,
        width: 140,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="font-mono text-[12px]">
            {row.maskedAccountNumber?.trim() ? row.maskedAccountNumber : "-"}
          </span>
        ),
      },
      {
        field: "bankName",
        headerName: "Bank Name",
        minWidth: 130,
        flex: 0.9,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="truncate text-[12px]" title={row.bankName || undefined}>
            {row.bankName?.trim() ? row.bankName : "-"}
          </span>
        ),
      },
      {
        field: "ifscCode",
        headerName: "IFSC Code",
        minWidth: 120,
        width: 130,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="font-mono text-[12px]">
            {row.ifscCode?.trim() ? row.ifscCode : "-"}
          </span>
        ),
      },
      {
        field: "currentInternalBankVerificationStatus",
        headerName: "Internal Bank Verification",
        minWidth: 150,
        width: 170,
        sortable: false,
        renderCell: ({ row }) => (
          <VendorBeneficiaryStatusPill
            value={row.currentInternalBankVerificationStatus}
          />
        ),
      },
      {
        field: "currentBeneficiaryStatus",
        headerName: "Beneficiary Submission Status",
        minWidth: 170,
        width: 190,
        sortable: false,
        renderCell: ({ row }) => (
          <VendorBeneficiaryStatusPill value={row.currentBeneficiaryStatus} />
        ),
      },
    ],
    [page],
  );

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
        <ReportPageHeader
          icon={FileText}
          iconClassName="bg-[#2f3d95]"
          title="Beneficiary Batch Details"
          description={
            detail ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold text-slate-800">
                  {detail.batchNumber}
                </span>
                <VendorBeneficiaryStatusPill value={detail.batchStatus} />
              </span>
            ) : (
              "Generation-time snapshot of beneficiaries included in this bank file"
            )
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ReportAppliedRange
                from={null}
                to={null}
                detail={appliedSearch.trim() || "All beneficiaries in batch"}
              />
              <ReportFilterButton
                onClick={() => {
                  setDraftSearch(appliedSearch);
                  setFilterOpen(true);
                }}
                activeCount={activeFilterCount}
              />
              <Link
                to={ROUTES.REPORTS.VENDOR_BENEFICIARY_FILE_HISTORY}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Beneficiary File History
              </Link>
              <button
                type="button"
                disabled={!detail || downloading}
                onClick={() => void downloadFile()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2f3d95] px-2.5 text-[12px] font-semibold text-white hover:bg-[#26317a] disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download Original TXT
              </button>
              <ReportRefreshButton onClick={() => void load()} loading={loading} />
            </div>
          }
        />

        {loading && !detail ? (
          <div className="flex min-h-56 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-[#2f3d95]" />
          </div>
        ) : detail ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:max-w-md">
              <SummaryCard
                label="Total Beneficiaries"
                value={detail.totalRecords.toLocaleString("en-IN")}
                icon={Users}
                tone="indigo"
              />
              <SummaryCard
                label="Batch Status"
                value={
                  detail.batchStatus === "GENERATED" ||
                  detail.batchStatus === "DOWNLOADED"
                    ? "File Generated"
                    : formatStatusLabel(detail.batchStatus)
                }
                icon={FileText}
                tone="sky"
              />
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-700">
                Batch information
              </h2>
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <VendorBeneficiaryDetailField
                  label="StayCore batch number"
                  value={detail.batchNumber}
                  mono
                />
                <VendorBeneficiaryDetailField
                  label="Original file name"
                  value={detail.fileName}
                />
                <VendorBeneficiaryDetailField
                  label="Total records"
                  value={String(detail.totalRecords)}
                />
                <VendorBeneficiaryDetailField
                  label="Generated by"
                  value={formatVendorBeneficiaryUserLabel(
                    detail.generatedBy,
                    detail.generatedByUserId,
                  )}
                />
                <VendorBeneficiaryDetailField
                  label="Generated at"
                  value={formatVendorBeneficiaryDateTime(detail.generatedAt)}
                />
                <VendorBeneficiaryDetailField
                  label="Submitted by"
                  value={formatVendorBeneficiaryUserLabel(
                    detail.submittedBy,
                    detail.submittedByUserId,
                  )}
                />
                <VendorBeneficiaryDetailField
                  label="Submitted at"
                  value={formatVendorBeneficiaryDateTime(detail.submittedAt)}
                />
                <div className="sm:col-span-2 lg:col-span-3">
                  <VendorBeneficiaryDetailField
                    label="Submission remarks"
                    value={detail.submissionRemarks}
                  />
                </div>
              </dl>
            </section>

            <DataTable
              title="Beneficiaries in this batch"
              subtitle={
                <>
                  <span className="font-medium text-slate-600">
                    {formatListCount(totalElements, "beneficiary")}
                  </span>
                  <span className="text-slate-400">
                    {" "}
                    · Page {page + 1} of {Math.max(totalPages, 1)}
                  </span>
                  <span className="text-slate-400">
                    {" "}
                    · Generation-time snapshot
                  </span>
                </>
              }
              rows={items}
              columns={columns}
              getRowId={(row) => row.beneficiaryId}
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
              rowHeight={isSmUp ? 52 : 48}
              localeText={{
                noRowsLabel: appliedSearch.trim()
                  ? "No beneficiaries match this search."
                  : "No beneficiaries in this batch.",
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
        ) : null}
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
            Search
          </span>
          <input
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Vendor name or beneficiary code"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </label>
      </ReportFilterDrawer>

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
