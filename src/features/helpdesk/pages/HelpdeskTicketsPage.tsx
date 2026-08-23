import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ROUTES } from "@/constants";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  ReportPageHeader,
  SummaryCard,
  formatReportDateTime,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
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
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Headphones,
  Loader2,
  Plus,
  RefreshCw,
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
              <button
                type="button"
                onClick={() => {
                  setDraft(filters);
                  setFilterOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-[#2f3d95] px-1.5 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => {
                  void loadDashboard();
                  void loadTickets();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
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
            tone="default"
            active={activeBucket === "OPEN"}
            onClick={() => selectBucket("OPEN")}
          />
          <SummaryCard
            label="In progress"
            value={dashboard?.inProgress ?? "—"}
            tone="default"
            active={activeBucket === "IN_PROGRESS"}
            onClick={() => selectBucket("IN_PROGRESS")}
          />
          <SummaryCard
            label="Waiting"
            value={dashboard?.waiting ?? "—"}
            tone="warning"
            active={activeBucket === "WAITING"}
            onClick={() => selectBucket("WAITING")}
          />
          <SummaryCard
            label="Resolved"
            value={dashboard?.resolved ?? "—"}
            tone="success"
            active={activeBucket === "RESOLVED"}
            onClick={() => selectBucket("RESOLVED")}
          />
          <SummaryCard
            label="Closed"
            value={dashboard?.closed ?? "—"}
            tone="default"
            active={activeBucket === "CLOSED"}
            onClick={() => selectBucket("CLOSED")}
          />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              Avg resolution
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              {sla ? `${sla.averageResolutionHours.toFixed(1)} hrs` : "—"}
            </p>
            <p className="text-[11px] text-slate-500">Default SLA window 48 hrs</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Beyond SLA
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums text-rose-800">
              {sla?.openBeyondSla ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-700">
              <Headphones className="h-3.5 w-3.5" />
              High priority pending
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums text-amber-900">
              {sla?.highPriorityPending ?? "—"}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Ticket inbox</h2>
              <p className="text-xs text-slate-500">
                {totalElements.toLocaleString("en-IN")} ticket
                {totalElements === 1 ? "" : "s"}
              </p>
            </div>
            <Link
              to={ROUTES.HELPDESK.LOOKUP}
              className="text-xs font-medium text-[#2f3d95] hover:underline"
            >
              Order lookup
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Ticket</th>
                  <th className="px-4 py-2.5 font-semibold">Subject</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Priority</th>
                  <th className="px-4 py-2.5 font-semibold">Category</th>
                  <th className="px-4 py-2.5 font-semibold">Raised by</th>
                  <th className="px-4 py-2.5 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading tickets…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                      No tickets found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.ticketId}
                      className="cursor-pointer hover:bg-slate-50/80"
                      onClick={() =>
                        navigate(ROUTES.HELPDESK.TICKET_DETAIL(row.ticketId))
                      }
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold text-[#2f3d95]">
                          {row.ticketNo}
                        </p>
                        <p className="text-[11px] text-slate-400">#{row.ticketId}</p>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="truncate font-medium text-slate-900">
                          {row.subject}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <TicketBadge
                          label={formatTicketStatus(row.status)}
                          tone={ticketStatusTone(row.status)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <TicketBadge
                          label={formatTicketPriority(row.priority)}
                          tone={ticketPriorityTone(row.priority)}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {formatTicketStatus(row.category)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {formatTicketStatus(row.raisedByType)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {formatReportDateTime(row.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {page + 1} of {Math.max(totalPages, 1)}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
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
            <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 rounded-lg bg-[#2f3d95] px-3 py-2 text-sm font-medium text-white"
              >
                Apply
              </button>
            </div>
          </aside>
        </>
      ) : null}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
