import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import { formatStatusLabel } from "@/features/reports/components/reportUiHelpers";
import { helpdeskTicketService } from "../services/helpdeskTicketService";
import {
  HELPDESK_RAISED_BY_TYPES,
  HELPDESK_TICKET_CATEGORIES,
  HELPDESK_TICKET_PRIORITIES,
  type HelpdeskRaisedByType,
  type HelpdeskReferenceType,
  type HelpdeskTicketCategory,
  type HelpdeskTicketPriority,
} from "../services/helpdeskTicketTypes";
import type { HelpdeskBookingDetail } from "../services/helpdeskBookingService";
import { formatTicketPriority } from "./ticketUi";
import { CheckCircle2, Loader2, Ticket, X } from "lucide-react";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2f3d95] focus:bg-white focus:ring-2 focus:ring-[#2f3d95]/15";

const labelClass =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";

function FieldLabel({
  children,
  required,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <label className={labelClass}>
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </label>
  );
}

function buildInitialSubject(booking: HelpdeskBookingDetail): string {
  const key = booking.bookingRef;
  const name =
    booking.support?.productName ||
    booking.financial?.hotelName ||
    booking.financial?.packageName ||
    null;
  return `Support for ${key}${name ? ` — ${name}` : ""}`.slice(0, 120);
}

export function HelpdeskCreateTicketPanel({
  booking,
  onClose,
  onToast,
}: {
  booking: HelpdeskBookingDetail;
  onClose: () => void;
  onToast: (message: string, type?: "success" | "error") => void;
}) {
  const navigate = useNavigate();
  const productName =
    booking.support?.productName ||
    booking.financial?.hotelName ||
    booking.financial?.packageName ||
    null;
  const referenceType: HelpdeskReferenceType =
    String(booking.type || "").toUpperCase() === "PACKAGE"
      ? "PACKAGE_BOOKING"
      : "BOOKING";

  const [raisedByType, setRaisedByType] =
    useState<HelpdeskRaisedByType>("CUSTOMER");
  const [raisedByName, setRaisedByName] = useState(
    booking.customer?.name?.trim() || "",
  );
  const [raisedByPhone, setRaisedByPhone] = useState(
    booking.customer?.phone?.trim() || "",
  );
  const [raisedByEmail, setRaisedByEmail] = useState(
    booking.customer?.email?.trim() || "",
  );
  const [category, setCategory] = useState<HelpdeskTicketCategory>("BOOKING");
  const [priority, setPriority] = useState<HelpdeskTicketPriority>("MEDIUM");
  const [subject, setSubject] = useState(buildInitialSubject(booking));
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!subject.trim() || !category || !priority || !raisedByType) return false;
    return !!(raisedByPhone.trim() || raisedByEmail.trim());
  }, [subject, category, priority, raisedByType, raisedByPhone, raisedByEmail]);

  const submit = async () => {
    if (!canSubmit) {
      onToast(
        "Subject, category, priority, raised-by type, and phone or email are required",
        "error",
      );
      return;
    }
    setSubmitting(true);
    try {
      const created = await helpdeskTicketService.createTicket({
        raisedByType,
        raisedById: null,
        raisedByName: raisedByName.trim() || null,
        raisedByPhone: raisedByPhone.trim() || null,
        raisedByEmail: raisedByEmail.trim() || null,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim() || null,
        references: [
          {
            referenceType,
            referenceKey: booking.bookingRef,
            referenceName: productName,
          },
        ],
      });
      onToast(`Created ${created.ticketNo}`, "success");
      navigate(ROUTES.HELPDESK.TICKET_DETAIL(created.ticketId));
    } catch (error) {
      onToast(extractErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-[#2f3d95] px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Create ticket
          </p>
          <p className="mt-0.5 truncate font-mono text-sm font-bold">
            {booking.bookingRef}
          </p>
          {productName ? (
            <p className="mt-0.5 truncate text-xs text-white/80">{productName}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
          aria-label="Close create ticket"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Booking attached
          </span>
          <p className="mt-1 font-mono">{booking.bookingRef}</p>
          <p className="text-emerald-700/80">
            Keep reviewing order details on the left while you fill this form.
          </p>
        </div>

        <div>
          <FieldLabel required>Subject</FieldLabel>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={fieldClass}
            placeholder="Short summary of the issue"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <FieldLabel required>Category</FieldLabel>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as HelpdeskTicketCategory)
              }
              className={fieldClass}
            >
              {HELPDESK_TICKET_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {formatStatusLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel required>Priority</FieldLabel>
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as HelpdeskTicketPriority)
              }
              className={fieldClass}
            >
              {HELPDESK_TICKET_PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {formatTicketPriority(item)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`${fieldClass} min-h-[88px] resize-y`}
            placeholder="Call notes, issue details…"
          />
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="mb-3 text-xs font-semibold text-slate-700">Raised by</p>
          <div className="grid gap-3">
            <div>
              <FieldLabel required>Type</FieldLabel>
              <select
                value={raisedByType}
                onChange={(e) =>
                  setRaisedByType(e.target.value as HelpdeskRaisedByType)
                }
                className={fieldClass}
              >
                {HELPDESK_RAISED_BY_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {formatStatusLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                type="text"
                value={raisedByName}
                onChange={(e) => setRaisedByName(e.target.value)}
                className={fieldClass}
                placeholder="Caller name"
              />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <input
                type="text"
                value={raisedByPhone}
                onChange={(e) => setRaisedByPhone(e.target.value)}
                className={fieldClass}
                placeholder="9876543210"
              />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                type="email"
                value={raisedByEmail}
                onChange={(e) => setRaisedByEmail(e.target.value)}
                className={fieldClass}
                placeholder="name@example.com"
              />
            </div>
          </div>
          {!(raisedByPhone.trim() || raisedByEmail.trim()) ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
              Add a phone or email so the ticket can be created.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/90 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={() => void submit()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f3d95] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#283585] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Ticket className="h-4 w-4" />
          )}
          Create ticket
        </button>
      </div>
    </aside>
  );
}
