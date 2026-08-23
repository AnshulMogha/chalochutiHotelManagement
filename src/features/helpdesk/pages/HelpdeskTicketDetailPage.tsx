import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { canAssignHelpdeskTickets } from "@/constants/roles";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import {
  ReportPageHeader,
  formatReportDateTime,
  formatStatusLabel,
} from "@/features/reports/components/reportUiHelpers";
import { adminService } from "@/features/admin/services/adminService";
import { helpdeskTicketService } from "../services/helpdeskTicketService";
import {
  HELPDESK_REFERENCE_TYPES,
  canCloseTicket,
  canReopenTicket,
  getAllowedStatusTransitions,
  type HelpdeskReferenceType,
  type HelpdeskTicketDetail,
  type HelpdeskTicketStatus,
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
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Link2,
  Loader2,
  Mail,
  MessageSquarePlus,
  Package,
  Phone,
  RefreshCw,
  RotateCcw,
  Ticket,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AssigneeOption = {
  userId: number;
  label: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/20";

const KPI_TONES = {
  status: {
    card: "border-sky-100 bg-gradient-to-br from-sky-50 to-white",
    icon: "bg-sky-500 text-white",
    label: "text-sky-700",
  },
  priority: {
    card: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
    icon: "bg-amber-500 text-white",
    label: "text-amber-700",
  },
  category: {
    card: "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white",
    icon: "bg-indigo-600 text-white",
    label: "text-indigo-700",
  },
  assignee: {
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
    icon: "bg-emerald-600 text-white",
    label: "text-emerald-700",
  },
} as const;

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: { card: string; icon: string; label: string };
  sub?: string;
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 shadow-sm", tone.card)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm",
            tone.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className={cn("text-[11px] font-semibold uppercase tracking-wide", tone.label)}>
          {label}
        </p>
      </div>
      <p className="mt-1.5 truncate text-base font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoLine({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="shrink-0 text-sm text-slate-500">{label}</span>
      <span
        className={cn(
          "min-w-0 text-right text-sm font-medium text-slate-900 break-words",
          mono && "font-mono text-[13px]",
        )}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function bookingSummaryFields(summary: Record<string, unknown> | null | undefined) {
  if (!summary) return null;
  const customer =
    summary.customer && typeof summary.customer === "object"
      ? (summary.customer as Record<string, unknown>)
      : null;
  const financial =
    summary.financial && typeof summary.financial === "object"
      ? (summary.financial as Record<string, unknown>)
      : null;
  const support =
    summary.support && typeof summary.support === "object"
      ? (summary.support as Record<string, unknown>)
      : null;

  return {
    bookingRef: String(summary.bookingRef || ""),
    type: String(summary.type || ""),
    guestName: customer ? String(customer.name || "") : "",
    guestEmail: customer ? String(customer.email || "") : "",
    guestPhone: customer ? String(customer.phone || "") : "",
    productName: support
      ? String(support.productName || "")
      : financial
        ? String(financial.hotelName || financial.packageName || "")
        : "",
    bookingStatus: support
      ? String(support.bookingStatus || "")
      : financial
        ? String(financial.bookingStatus || "")
        : "",
    paymentStatus: support
      ? String(support.paymentStatus || "")
      : financial
        ? String(financial.paymentStatus || "")
        : "",
  };
}

export default function HelpdeskTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const canAssign = canAssignHelpdeskTickets(user?.roles);
  const { toast, showToast, hideToast } = useToast();

  const [detail, setDetail] = useState<HelpdeskTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [statusDraft, setStatusDraft] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [resolution, setResolution] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [refType, setRefType] = useState<HelpdeskReferenceType>("BOOKING");
  const [refKey, setRefKey] = useState("");
  const [refName, setRefName] = useState("");

  const allowedStatuses = useMemo(
    () => getAllowedStatusTransitions(detail?.status),
    [detail?.status],
  );

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const data = await helpdeskTicketService.getTicket(ticketId);
      setDetail(data);
      setStatusDraft(getAllowedStatusTransitions(data.status)[0] || "");
      if (data.assignedTo != null) setAssignTo(String(data.assignedTo));
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [showToast, ticketId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    if (!canAssign) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await adminService.getUsers({
          role: "HELPDESK_AGENT",
          size: 200,
          status: "ACTIVE",
        });
        if (cancelled) return;
        setAssignees(
          (response.content || []).map((item) => ({
            userId: item.userId,
            label:
              [item.firstName, item.lastName].filter(Boolean).join(" ") ||
              item.email ||
              `User #${item.userId}`,
          })),
        );
      } catch {
        // Assign dropdown stays empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canAssign]);

  const runAction = async (action: () => Promise<HelpdeskTicketDetail>) => {
    setBusy(true);
    try {
      const updated = await action();
      setDetail(updated);
      setStatusDraft(getAllowedStatusTransitions(updated.status)[0] || "");
      setStatusNote("");
      setNoteDraft("");
      setResolution("");
      setReopenReason("");
      setRefKey("");
      setRefName("");
      showToast("Ticket updated", "success");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const booking = bookingSummaryFields(detail?.bookingSummary);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading ticket…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Ticket className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Ticket not found</h1>
          <Link
            to={ROUTES.HELPDESK.TICKETS}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#2f3d95] px-4 py-2 text-sm font-medium text-white hover:bg-[#263578]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to inbox
          </Link>
        </div>
      </div>
    );
  }

  const activities = [...detail.activities].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)),
  );
  const assigneeLabel =
    detail.assignedTo != null
      ? assignees.find((a) => a.userId === detail.assignedTo)?.label ||
        `User #${detail.assignedTo}`
      : "Unassigned";

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-5">
        <ReportPageHeader
          icon={Ticket}
          iconClassName="bg-[#2f3d95]"
          title={detail.ticketNo}
          descriptionClassName="line-clamp-2 text-xs text-slate-500 break-words"
          description={detail.subject}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadTicket()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <Link
                to={ROUTES.HELPDESK.TICKETS}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Inbox
              </Link>
            </div>
          }
        />

        {/* Hero meta strip — same pattern as Financial MIS */}
        <section className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <TicketBadge
                label={formatTicketStatus(detail.status)}
                tone={ticketStatusTone(detail.status)}
              />
              <TicketBadge
                label={formatTicketPriority(detail.priority)}
                tone={ticketPriorityTone(detail.priority)}
              />
              <TicketBadge
                label={formatTicketStatus(detail.category)}
                tone="bg-slate-100 text-slate-700 ring-slate-200"
              />
              <span className="text-xs text-slate-500">
                Created {formatReportDateTime(detail.createdAt)}
              </span>
            </div>
          </div>

          <div className="grid gap-2 px-3 py-3 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
            <KpiCard
              label="Status"
              value={formatTicketStatus(detail.status)}
              icon={ClipboardList}
              tone={KPI_TONES.status}
              sub={`Updated ${formatReportDateTime(detail.updatedAt)}`}
            />
            <KpiCard
              label="Priority"
              value={formatTicketPriority(detail.priority)}
              icon={AlertTriangle}
              tone={KPI_TONES.priority}
            />
            <KpiCard
              label="Category"
              value={formatTicketStatus(detail.category)}
              icon={Ticket}
              tone={KPI_TONES.category}
              sub={formatStatusLabel(detail.raisedByType)}
            />
            <KpiCard
              label="Assigned"
              value={assigneeLabel}
              icon={User}
              tone={KPI_TONES.assignee}
            />
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-8">
            <Panel title="Overview">
              <InfoLine label="Subject" value={detail.subject} />
              <InfoLine
                label="Raised by type"
                value={formatStatusLabel(detail.raisedByType)}
              />
              <InfoLine label="Assigned to" value={assigneeLabel} />
              <InfoLine
                label="Resolved"
                value={formatReportDateTime(detail.resolvedAt)}
              />
              <InfoLine label="Closed" value={formatReportDateTime(detail.closedAt)} />
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 break-words">
                  {detail.description?.trim() || "No description provided."}
                </p>
              </div>
            </Panel>

            <Panel title="Requester">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {detail.raisedByName || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Phone
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {detail.raisedByPhone || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 sm:col-span-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </p>
                    {detail.raisedByEmail ? (
                      <a
                        href={`mailto:${detail.raisedByEmail}`}
                        className="truncate text-sm font-semibold text-[#2f3d95] hover:underline"
                      >
                        {detail.raisedByEmail}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">—</p>
                    )}
                  </div>
                </div>
              </div>
              {detail.raisedById ? (
                <div className="mt-2">
                  <InfoLine label="Raised by ID" value={detail.raisedById} mono />
                </div>
              ) : null}
            </Panel>

            {booking ? (
              <Panel
                title="Booking summary"
                action={
                  booking.bookingRef ? (
                    <Link
                      to={ROUTES.HELPDESK.DETAIL(booking.bookingRef)}
                      className="text-xs font-semibold text-[#2f3d95] hover:underline"
                    >
                      Open order
                    </Link>
                  ) : null
                }
              >
                <div className="mb-3 flex gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                      Product
                    </p>
                    <p className="text-sm font-semibold text-slate-900 break-words">
                      {booking.productName || "—"}
                    </p>
                  </div>
                </div>
                <InfoLine label="Reference" value={booking.bookingRef || "—"} mono />
                <InfoLine label="Type" value={formatStatusLabel(booking.type) || "—"} />
                <InfoLine label="Guest" value={booking.guestName || "—"} />
                <InfoLine
                  label="Booking status"
                  value={formatStatusLabel(booking.bookingStatus)}
                />
                <InfoLine
                  label="Payment status"
                  value={formatStatusLabel(booking.paymentStatus)}
                />
              </Panel>
            ) : null}

            <Panel title="Timeline" subtitle="Activity history">
              {activities.length === 0 ? (
                <p className="text-sm text-slate-500">No activity yet.</p>
              ) : (
                <ol className="space-y-0">
                  {activities.map((activity, idx) => {
                    const isLast = idx === activities.length - 1;
                    return (
                      <li key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {!isLast ? (
                          <span className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-slate-200" />
                        ) : null}
                        <div className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                          <Clock3 className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <TicketBadge
                              label={formatStatusLabel(activity.action)}
                              tone="bg-indigo-50 text-indigo-700 ring-indigo-200"
                            />
                            {activity.oldStatus || activity.newStatus ? (
                              <span className="text-xs text-slate-600">
                                {formatTicketStatus(activity.oldStatus)} →{" "}
                                {formatTicketStatus(activity.newStatus)}
                              </span>
                            ) : null}
                            <span className="ml-auto text-[11px] text-slate-400">
                              {formatReportDateTime(activity.createdAt)}
                            </span>
                          </div>
                          {activity.note ? (
                            <p className="mt-1.5 text-sm text-slate-700 break-words">
                              {activity.note}
                            </p>
                          ) : null}
                          {activity.createdBy != null ? (
                            <p className="mt-1 text-[11px] text-slate-400">
                              By user #{activity.createdBy}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>
          </div>

          <div className="space-y-3 lg:col-span-4 lg:sticky lg:top-4 lg:self-start">
            {canAssign ? (
              <Panel title="Assign" subtitle="Super Admin / Finance Manager">
                <div className="space-y-2.5">
                  {assignees.length > 0 ? (
                    <select
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Select agent</option>
                      {assignees.map((item) => (
                        <option key={item.userId} value={item.userId}>
                          {item.label} (#{item.userId})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value)}
                      placeholder="User id"
                      className={fieldClass}
                    />
                  )}
                  <button
                    type="button"
                    disabled={busy || !assignTo}
                    onClick={() =>
                      void runAction(() =>
                        helpdeskTicketService.assignTicket(
                          detail.ticketId,
                          Number(assignTo),
                        ),
                      )
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-2 text-sm font-semibold text-white hover:bg-[#263578] disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign
                  </button>
                </div>
              </Panel>
            ) : null}

            <Panel
              title="Change status"
              subtitle="Use Close / Reopen for CLOSED and REOPENED"
            >
              {allowedStatuses.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No status transitions available from {formatTicketStatus(detail.status)}.
                </p>
              ) : (
                <div className="space-y-2.5">
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value)}
                    className={fieldClass}
                  >
                    {allowedStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatTicketStatus(status)}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    rows={2}
                    placeholder="Optional note"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    disabled={busy || !statusDraft}
                    onClick={() =>
                      void runAction(() =>
                        helpdeskTicketService.changeStatus(
                          detail.ticketId,
                          statusDraft as HelpdeskTicketStatus,
                          statusNote,
                        ),
                      )
                    }
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-2 text-sm font-semibold text-white hover:bg-[#263578] disabled:opacity-50"
                  >
                    Update status
                  </button>
                </div>
              )}
            </Panel>

            <Panel title="Internal note">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                placeholder="Internal note for the timeline"
                className={fieldClass}
              />
              <button
                type="button"
                disabled={busy || !noteDraft.trim()}
                onClick={() =>
                  void runAction(() =>
                    helpdeskTicketService.addNote(detail.ticketId, noteDraft.trim()),
                  )
                }
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Add note
              </button>
            </Panel>

            {canCloseTicket(detail.status) ? (
              <Panel title="Close ticket">
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={2}
                  placeholder="Resolution summary"
                  className={fieldClass}
                />
                <button
                  type="button"
                  disabled={busy || !resolution.trim()}
                  onClick={() =>
                    void runAction(() =>
                      helpdeskTicketService.closeTicket(
                        detail.ticketId,
                        resolution.trim(),
                      ),
                    )
                  }
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Close
                </button>
              </Panel>
            ) : null}

            {canReopenTicket(detail.status) ? (
              <Panel
                title="Reopen ticket"
                subtitle="After reopen, move to In Progress via Change status"
              >
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for reopen"
                  className={fieldClass}
                />
                <button
                  type="button"
                  disabled={busy || !reopenReason.trim()}
                  onClick={() =>
                    void runAction(() =>
                      helpdeskTicketService.reopenTicket(
                        detail.ticketId,
                        reopenReason.trim(),
                      ),
                    )
                  }
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reopen
                </button>
              </Panel>
            ) : null}

            <Panel title="References">
              <ul className="mb-3 space-y-2">
                {detail.references.length === 0 ? (
                  <li className="text-sm text-slate-500">No references.</li>
                ) : (
                  detail.references.map((ref) => (
                    <li
                      key={ref.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm"
                    >
                      <p className="font-medium text-slate-800">
                        {formatStatusLabel(ref.referenceType)} ·{" "}
                        <span className="font-mono text-xs">{ref.referenceKey}</span>
                      </p>
                      {ref.referenceName ? (
                        <p className="mt-0.5 text-xs text-slate-500 break-words">
                          {ref.referenceName}
                        </p>
                      ) : null}
                      {(ref.referenceType === "BOOKING" ||
                        ref.referenceType === "PACKAGE_BOOKING") && (
                        <Link
                          to={ROUTES.HELPDESK.DETAIL(ref.referenceKey)}
                          className="mt-1.5 inline-block text-xs font-semibold text-[#2f3d95] hover:underline"
                        >
                          Open order lookup
                        </Link>
                      )}
                    </li>
                  ))
                )}
              </ul>
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <select
                  value={refType}
                  onChange={(e) => setRefType(e.target.value as HelpdeskReferenceType)}
                  className={fieldClass}
                >
                  {HELPDESK_REFERENCE_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {formatStatusLabel(item)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={refKey}
                  onChange={(e) => setRefKey(e.target.value)}
                  placeholder="Reference key"
                  className={fieldClass}
                />
                <input
                  type="text"
                  value={refName}
                  onChange={(e) => setRefName(e.target.value)}
                  placeholder="Label (optional)"
                  className={fieldClass}
                />
                <button
                  type="button"
                  disabled={busy || !refKey.trim()}
                  onClick={() =>
                    void runAction(() =>
                      helpdeskTicketService.addReference(detail.ticketId, {
                        referenceType: refType,
                        referenceKey: refKey.trim(),
                        referenceName: refName.trim() || null,
                      }),
                    )
                  }
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Link2 className="h-4 w-4" />
                  Add reference
                </button>
              </div>
            </Panel>
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
