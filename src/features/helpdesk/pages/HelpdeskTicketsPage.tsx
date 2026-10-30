import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { ExportButton } from "@/components/ui/ExportButton";
import { DataTable, formatListCount } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  exportStatusLabel,
  ReportPageHeader,
  SummaryCard,
  formatReportDateTime,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import {
  ReportAppliedRange,
  ReportFilterActions,
  ReportFilterButton,
  ReportRefreshButton,
} from "@/features/reports/components/ReportFilterDrawer";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "@/features/reports/services/reportExportService";
import { helpdeskTicketService } from "../services/helpdeskTicketService";
import {
  HELPDESK_RAISED_BY_TYPES,
  HELPDESK_TICKET_CATEGORIES,
  HELPDESK_TICKET_PRIORITIES,
  HELPDESK_TICKET_STATUSES,
  WAITING_STATUSES,
  type HelpdeskTicketDashboard,
  type HelpdeskTicketListItem,
  type HelpdeskTicketSlaSummary,
} from "../services/helpdeskTicketTypes";
import {
  TicketBadge,
  formatTicketPriority,
  formatTicketStatus,
  ticketPriorityTone,
  ticketStatusTone,
} from "../components/ticketUi";
import {
  AlertTriangle,
  BadgeCheck,
  CircleX,
  Clock3,
  Flag,
  Inbox,
  Play,
  Plus,
  Ticket,
  X,
} from "lucide-react";

const PAGE_SIZE = 20;

type FilterDraft = {
  status: string;
  priority: string;
  category: string;
  raisedByType: string;
  ticketNo: string;
  referenceKey: string;
  fromDateText: string;
  toDateText: string;
};

const DEFAULT_FILTERS: FilterDraft = {
  status: "",
  priority: "",
  category: "",
  raisedByType: "",
  ticketNo: "",
  referenceKey: "",
  fromDateText: "",
  toDateText: "",
};

type DashboardBucket = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED" | null;

function HelpdeskAppliedRange({
  filters,
  bucket,
}: {
  filters: FilterDraft;
  bucket: DashboardBucket;
}) {
  const range = validateOptionalDateRange(
    filters.fromDateText,
    filters.toDateText,
  );
  const from = range.ok ? range.fromDate : null;
  const to = range.ok ? range.toDate : null;
  const detail =
    [
      filters.status
        ? formatTicketStatus(filters.status)
        : bucket
          ? formatTicketStatus(bucket)
          : null,
      filters.priority ? formatTicketPriority(filters.priority) : null,
      filters.category ? formatTicketStatus(filters.category) : null,
      filters.raisedByType ? formatTicketStatus(filters.raisedByType) : null,
      filters.ticketNo.trim() || null,
      filters.referenceKey.trim() || null,
    ]
      .filter(Boolean)
      .join(" · ") || (!from && !to ? "All tickets" : null);

  return <ReportAppliedRange from={from} to={to} detail={detail} />;
}

export default function HelpdeskTicketsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useToast();

  const [filters, setFilters] = useState<FilterDraft>(() => ({
    ...DEFAULT_FILTERS,
    status: searchParams.get("status") || "",
    ticketNo: searchParams.get("ticketNo") || "",
    referenceKey: searchParams.get("referenceKey") || "",
  }));
  const [draft, setDraft] = useState<FilterDraft>(filters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HelpdeskTicketListItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [dashboard, setDashboard] = useState<HelpdeskTicketDashboard | null>(
    null,
  );
  const [sla, setSla] = useState<HelpdeskTicketSlaSummary | null>(null);
  const [activeBucket, setActiveBucket] = useState<DashboardBucket>(
    (searchParams.get("bucket") as DashboardBucket) || null,
  );
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count += 1;
    if (filters.priority) count += 1;
    if (filters.category) count += 1;
    if (filters.raisedByType) count += 1;
    if (filters.ticketNo.trim()) count += 1;
    if (filters.referenceKey.trim()) count += 1;
    if (filters.fromDateText.trim() || filters.toDateText.trim()) count += 1;
    if (activeBucket) count += 1;
    return count;
  }, [filters, activeBucket]);

  const loadDashboard = useCallback(async () => {
    try {
      const [dash, slaSummary] = await Promise.all([
        helpdeskTicketService.getDashboard(),
        helpdeskTicketService.getSlaSummary(),
      ]);
      setDashboard(dash);
      setSla(slaSummary);
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    }
  }, [showToast]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const range = validateOptionalDateRange(
        filters.fromDateText,
        filters.toDateText,
      );
      if (!range.ok) {
        showToast(range.message, "error");
        setLoading(false);
        return;
      }

      const baseParams = {
        priority: filters.priority || undefined,
        category: filters.category || undefined,
        raisedByType: filters.raisedByType || undefined,
        ticketNo: filters.ticketNo.trim() || undefined,
        referenceKey: filters.referenceKey.trim() || undefined,
        fromDate: range.fromDate || undefined,
        toDate: range.toDate || undefined,
        sort: "createdAt,desc" as const,
      };

      let status = filters.status || undefined;
      if (activeBucket === "OPEN") status = "OPEN";
      if (activeBucket === "IN_PROGRESS") status = "IN_PROGRESS";
      if (activeBucket === "RESOLVED") status = "RESOLVED";
      if (activeBucket === "CLOSED") status = "CLOSED";

      if (activeBucket === "WAITING") {
        const batches = await Promise.all(
          WAITING_STATUSES.map((waitingStatus) =>
            helpdeskTicketService.listTickets({
              ...baseParams,
              status: waitingStatus,
              page: 0,
              size: 100,
            }),
          ),
        );
        const merged = batches
          .flatMap((batch) => batch.content)
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        const total = merged.length;
        const start = page * PAGE_SIZE;
        setRows(merged.slice(start, start + PAGE_SIZE));
        setTotalElements(total);
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
      } else {
        const response = await helpdeskTicketService.listTickets({
          ...baseParams,
          status,
          page,
          size: PAGE_SIZE,
        });
        setRows(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      }
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setRows([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [activeBucket, filters, page, showToast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const applyFilters = () => {
    const range = validateOptionalDateRange(
      draft.fromDateText,
      draft.toDateText,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }
    setFilters(draft);
    setPage(0);
    setActiveBucket(null);
    setFilterOpen(false);
    const next = new URLSearchParams();
    if (draft.status) next.set("status", draft.status);
    if (draft.ticketNo.trim()) next.set("ticketNo", draft.ticketNo.trim());
    if (draft.referenceKey.trim()) {
      next.set("referenceKey", draft.referenceKey.trim());
    }
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setActiveBucket(null);
    setPage(0);
    setSearchParams({}, { replace: true });
    setFilterOpen(false);
  };

  const selectBucket = (bucket: DashboardBucket) => {
    setActiveBucket((prev) => (prev === bucket ? null : bucket));
    setPage(0);
    setFilters((prev) => ({ ...prev, status: "" }));
    setDraft((prev) => ({ ...prev, status: "" }));
  };

  const exportTickets = async (format: ReportExportFormat) => {
    const range = validateOptionalDateRange(
      filters.fromDateText,
      filters.toDateText,
    );
    if (!range.ok) {
      showToast(range.message, "error");
      return;
    }

    const status =
      activeBucket === "WAITING"
        ? WAITING_STATUSES
        : activeBucket || filters.status || undefined;

    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await helpdeskTicketService.exportTickets({
        params: {
          status,
          priority: filters.priority || undefined,
          category: filters.category || undefined,
          raisedByType: filters.raisedByType || undefined,
          ticketNo: filters.ticketNo.trim() || undefined,
          referenceKey: filters.referenceKey.trim() || undefined,
          fromDate: range.fromDate || undefined,
          toDate: range.toDate || undefined,
          sort: "createdAt,desc",
        },
        format,
        defaultFileName: "helpdesk-tickets",
        onStatus: setExportStatus,
      });
      showToast("Helpdesk tickets export downloaded", "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const columns = useMemo<GridColDef<HelpdeskTicketListItem>[]>(
    () => [
      {
        field: "ticketNo",
        headerName: "Ticket",
        width: 190,
        sortable: false,
        renderCell: (params) => (
          <div className="min-w-0 leading-tight">
            <p className="font-mono text-xs font-semibold text-[#2f3d95]">
              {params.row.ticketNo}
            </p>
            <p className="text-[11px] text-slate-400">#{params.row.ticketId}</p>
          </div>
        ),
      },
      {
        field: "subject",
        headerName: "Subject",
        flex: 1,
        minWidth: 220,
        sortable: false,
        renderCell: (params) => (
          <span className="truncate font-medium text-slate-900">
            {params.row.subject}
          </span>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        sortable: false,
        renderCell: (params) => (
          <TicketBadge
            label={formatTicketStatus(params.row.status)}
            tone={ticketStatusTone(params.row.status)}
          />
        ),
      },
      {
        field: "priority",
        headerName: "Priority",
        width: 130,
        sortable: false,
        renderCell: (params) => (
          <TicketBadge
            label={formatTicketPriority(params.row.priority)}
            tone={ticketPriorityTone(params.row.priority)}
          />
        ),
      },
      {
        field: "category",
        headerName: "Category",
        width: 160,
        sortable: false,
        renderCell: (params) => (
          <span className="text-xs text-slate-700">
            {formatTicketStatus(params.row.category)}
          </span>
        ),
      },
      {
        field: "raisedByType",
        headerName: "Raised by",
        width: 150,
        sortable: false,
        renderCell: (params) => (
          <span className="text-xs text-slate-700">
            {formatTicketStatus(params.row.raisedByType)}
          </span>
        ),
      },
      {
        field: "createdAt",
        headerName: "Created",
        width: 160,
        sortable: false,
        renderCell: (params) => (
          <span className="whitespace-nowrap text-xs text-slate-600">
            {formatReportDateTime(params.row.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="min-h-full bg-linear-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <ReportPageHeader
          icon={Ticket}
          iconClassName="bg-[#2f3d95]"
          title="Helpdesk Tickets"
          description="Inbox, SLA, and ticket workflow"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <HelpdeskAppliedRange
                filters={filters}
                bucket={activeBucket}
              />
              <ReportFilterButton
                onClick={() => {
                  setDraft(filters);
                  setFilterOpen(true);
                }}
                activeCount={activeFilterCount}
              />
              <ExportButton
                iconOnly
                exporting={exporting}
                exportingLabel={exportStatusLabel(exportStatus) || "Exporting…"}
                onExportExcel={() => void exportTickets("EXCEL")}
                onExportCSV={() => void exportTickets("CSV")}
                onExportPDF={() => void exportTickets("PDF")}
              />
              <ReportRefreshButton
                onClick={() => {
                  void loadDashboard();
                  void loadTickets();
                }}
                loading={loading}
              />
              <Link
                to={ROUTES.HELPDESK.TICKET_CREATE}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[#283585]"
              >
                <Plus className="h-4 w-4" />
                New ticket
              </Link>
            </div>
          }
        />

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard
            label="Open"
            value={dashboard?.open ?? "—"}
            tone="sky"
            icon={Inbox}
            active={activeBucket === "OPEN"}
            onClick={() => selectBucket("OPEN")}
          />
          <SummaryCard
            label="In progress"
            value={dashboard?.inProgress ?? "—"}
            tone="blue"
            icon={Play}
            active={activeBucket === "IN_PROGRESS"}
            onClick={() => selectBucket("IN_PROGRESS")}
          />
          <SummaryCard
            label="Waiting"
            value={dashboard?.waiting ?? "—"}
            tone="amber"
            icon={Clock3}
            active={activeBucket === "WAITING"}
            onClick={() => selectBucket("WAITING")}
          />
          <SummaryCard
            label="Resolved"
            value={dashboard?.resolved ?? "—"}
            tone="emerald"
            icon={BadgeCheck}
            active={activeBucket === "RESOLVED"}
            onClick={() => selectBucket("RESOLVED")}
          />
          <SummaryCard
            label="Closed"
            value={dashboard?.closed ?? "—"}
            tone="violet"
            icon={CircleX}
            active={activeBucket === "CLOSED"}
            onClick={() => selectBucket("CLOSED")}
          />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryCard
            label="Avg resolution"
            value={sla ? `${sla.averageResolutionHours.toFixed(1)} hrs` : "—"}
            tone="teal"
            icon={Clock3}
            hint="Default SLA window 48 hrs"
          />
          <SummaryCard
            label="Beyond SLA"
            value={sla?.openBeyondSla ?? "—"}
            tone="rose"
            icon={AlertTriangle}
          />
          <SummaryCard
            label="High priority pending"
            value={sla?.highPriorityPending ?? "—"}
            tone="orange"
            icon={Flag}
          />
        </div>

        <DataTable
          title="Ticket inbox"
          subtitle={
            <>
              <span className="font-medium text-slate-600">
                {formatListCount(totalElements, "ticket")}
              </span>
              <span className="text-slate-400">
                {" "}
                · Page {page + 1} of {Math.max(totalPages, 1)}
              </span>
            </>
          }
          headerActions={
            <Link
              to={ROUTES.HELPDESK.LOOKUP}
              className="text-xs font-medium text-[#2f3d95] hover:underline"
            >
              Order lookup
            </Link>
          }
          rows={rows}
          columns={columns}
          getRowId={(row) => row.ticketId}
          loading={loading}
          paginationMode="server"
          rowCount={totalElements}
          paginationModel={{ page, pageSize: PAGE_SIZE }}
          onPaginationModelChange={(model) => {
            if (model.page !== page) setPage(Math.max(0, model.page));
          }}
          pageSizeOptions={[PAGE_SIZE]}
          disableRowSelectionOnClick
          disableColumnFilter
          showToolbar
          showExport={false}
          allowHorizontalScroll
          getRowHeight={() => "auto"}
          onRowClick={(params) =>
            navigate(ROUTES.HELPDESK.TICKET_DETAIL(params.row.ticketId))
          }
          localeText={{
            noRowsLabel: "No tickets found for the selected filters.",
          }}
          sx={{
            "& .MuiDataGrid-cell": {
              alignItems: "center",
              whiteSpace: "normal",
              py: "8px",
              cursor: "pointer",
            },
          }}
        />
      </div>

      {filterOpen ? (
        <>
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={() => setFilterOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Status</label>
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {HELPDESK_TICKET_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatTicketStatus(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Priority</label>
                <select
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {HELPDESK_TICKET_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {formatTicketPriority(priority)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Category</label>
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {HELPDESK_TICKET_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {formatTicketStatus(category)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Raised by type
                </label>
                <select
                  value={draft.raisedByType}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      raisedByType: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {HELPDESK_RAISED_BY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatTicketStatus(type)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Ticket no</label>
                <input
                  type="text"
                  value={draft.ticketNo}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, ticketNo: e.target.value }))
                  }
                  placeholder="TKT-20260820-00001"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Reference key
                </label>
                <input
                  type="text"
                  value={draft.referenceKey}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      referenceKey: e.target.value,
                    }))
                  }
                  placeholder="BRK123 / booking ref"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">
                  Created date range (dd/mm/yyyy)
                </p>
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
              </div>
            </div>
            <ReportFilterActions onReset={resetFilters} onApply={applyFilters} />
          </aside>
        </>
      ) : null}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
