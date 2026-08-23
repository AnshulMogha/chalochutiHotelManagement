import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import { Toast, useToast } from "@/components/ui/Toast";
import { extractErrorMessage } from "@/features/reports/components/ReportJsonPanel";
import { formatStatusLabel } from "@/features/reports/components/reportUiHelpers";
import { helpdeskTicketService } from "../services/helpdeskTicketService";
import { helpdeskBookingService } from "../services/helpdeskBookingService";
import {
  HELPDESK_RAISED_BY_TYPES,
  HELPDESK_TICKET_CATEGORIES,
  HELPDESK_TICKET_PRIORITIES,
  type HelpdeskRaisedByType,
  type HelpdeskReferenceType,
  type HelpdeskTicketCategory,
  type HelpdeskTicketPriority,
  type HelpdeskTicketReferenceInput,
} from "../services/helpdeskTicketTypes";
import { formatTicketPriority, ticketPriorityTone } from "../components/ticketUi";
import {
  ArrowLeft,
  CheckCircle2,
  Link2,
  Loader2,
  Search,
  Ticket,
  UserRound,
} from "lucide-react";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2f3d95] focus:bg-white focus:ring-2 focus:ring-[#2f3d95]/15";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

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

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Ticket;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2f3d95]/10 text-[#2f3d95]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function HelpdeskTicketCreatePage() {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const [raisedByType, setRaisedByType] =
    useState<HelpdeskRaisedByType>("CUSTOMER");
  const [raisedById] = useState("");
  const [raisedByName, setRaisedByName] = useState("");
  const [raisedByPhone, setRaisedByPhone] = useState("");
  const [raisedByEmail, setRaisedByEmail] = useState("");
  const [category, setCategory] = useState<HelpdeskTicketCategory>("BOOKING");
  const [priority, setPriority] = useState<HelpdeskTicketPriority>("MEDIUM");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [references, setReferences] = useState<HelpdeskTicketReferenceInput[]>(
    [],
  );
  // TODO(later): more-references form state
  // const [refType, setRefType] = useState<HelpdeskReferenceType>("BOOKING");
  // const [refKey, setRefKey] = useState("");
  // const [refName, setRefName] = useState("");
  const [bookingLookup, setBookingLookup] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!subject.trim() || !category || !priority || !raisedByType) return false;
    return !!(raisedByPhone.trim() || raisedByEmail.trim());
  }, [subject, category, priority, raisedByType, raisedByPhone, raisedByEmail]);

  const contactHint = useMemo(() => {
    return !!(raisedByPhone.trim() || raisedByEmail.trim());
  }, [raisedByPhone, raisedByEmail]);

  // TODO(later): manual more-references add
  // const addReference = () => { ... };

  const lookupBooking = async () => {
    const value = bookingLookup.trim();
    if (!value) {
      showToast("Enter a booking / package reference", "error");
      return;
    }
    setLookupLoading(true);
    try {
      const detail = await helpdeskBookingService.getBookingByReference(value);
      const key = detail.bookingRef || value;
      const type: HelpdeskReferenceType =
        String(detail.type || "").toUpperCase() === "PACKAGE"
          ? "PACKAGE_BOOKING"
          : "BOOKING";
      const name =
        detail.support?.productName ||
        detail.financial?.hotelName ||
        detail.financial?.packageName ||
        null;

      setReferences((prev) => {
        if (
          prev.some(
            (item) =>
              item.referenceType === type &&
              item.referenceKey.toLowerCase() === key.toLowerCase(),
          )
        ) {
          return prev;
        }
        return [
          ...prev,
          { referenceType: type, referenceKey: key, referenceName: name },
        ];
      });

      if (!raisedByName.trim() && detail.customer?.name) {
        setRaisedByName(detail.customer.name);
      }
      if (!raisedByEmail.trim() && detail.customer?.email) {
        setRaisedByEmail(detail.customer.email);
      }
      if (!raisedByPhone.trim() && detail.customer?.phone) {
        setRaisedByPhone(detail.customer.phone);
      }
      if (!subject.trim()) {
        setSubject(
          `Support for ${key}${name ? ` — ${name}` : ""}`.slice(0, 120),
        );
      }
      showToast(`Attached ${key}`, "success");
      setBookingLookup("");
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setLookupLoading(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) {
      showToast(
        "Subject, category, priority, raised-by type, and phone or email are required",
        "error",
      );
      return;
    }
    setSubmitting(true);
    try {
      const created = await helpdeskTicketService.createTicket({
        raisedByType,
        raisedById: raisedById.trim() || null,
        raisedByName: raisedByName.trim() || null,
        raisedByPhone: raisedByPhone.trim() || null,
        raisedByEmail: raisedByEmail.trim() || null,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim() || null,
        references: references.length ? references : undefined,
      });
      showToast(`Created ${created.ticketNo}`, "success");
      navigate(ROUTES.HELPDESK.TICKET_DETAIL(created.ticketId), {
        replace: true,
      });
    } catch (error) {
      showToast(extractErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f4f6f9]">
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          {/* Brand header — matches Help Desk lookup */}
          <div className="relative overflow-hidden bg-linear-to-r from-[#2f3d95] via-[#3548a3] to-[#3d4fa8] px-4 py-5 sm:px-6">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white shadow-inner">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white sm:text-xl">
                    Create ticket
                  </h1>
                  <p className="mt-1 max-w-xl text-xs text-white/80 sm:text-sm">
                    Capture the issue, caller details, and optional booking
                    reference in one place.
                  </p>
                </div>
              </div>
              <Link
                to={ROUTES.HELPDESK.TICKETS}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to inbox
              </Link>
            </div>
          </div>

          <div className="space-y-0 divide-y divide-slate-100">
            {/* Booking lookup */}
            <section className="px-4 py-5 sm:px-6">
              <SectionTitle
                icon={Search}
                title="Attach booking"
                subtitle="Optional — look up a booking or package ref to prefill contact details"
              />
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={bookingLookup}
                      onChange={(e) => setBookingLookup(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void lookupBooking();
                      }}
                      placeholder="e.g. BRK86B21E035807"
                      className={cn(fieldClass, "bg-white pl-10")}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={lookupLoading}
                    onClick={() => void lookupBooking()}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#2f3d95] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#283585] disabled:opacity-50"
                  >
                    {lookupLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Attach booking
                  </button>
                </div>

                {references.some(
                  (r) =>
                    r.referenceType === "BOOKING" ||
                    r.referenceType === "PACKAGE_BOOKING",
                ) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {references
                      .filter(
                        (r) =>
                          r.referenceType === "BOOKING" ||
                          r.referenceType === "PACKAGE_BOOKING",
                      )
                      .map((item) => (
                        <span
                          key={`${item.referenceType}:${item.referenceKey}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="font-mono">{item.referenceKey}</span>
                          {item.referenceName ? (
                            <span className="text-emerald-700/70">
                              · {item.referenceName}
                            </span>
                          ) : null}
                        </span>
                      ))}
                  </div>
                ) : null}
              </div>
            </section>

            {/* Ticket details */}
            <section className="px-4 py-5 sm:px-6">
              <SectionTitle
                icon={Ticket}
                title="Ticket details"
                subtitle="Subject, category, and priority"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Subject</FieldLabel>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={fieldClass}
                    placeholder="Short summary of the issue"
                  />
                </div>

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
                  <div className="flex flex-wrap gap-2">
                    {HELPDESK_TICKET_PRIORITIES.map((item) => {
                      const active = priority === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPriority(item)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition sm:text-sm",
                            active
                              ? cn(
                                  "ring-1 ring-inset shadow-sm",
                                  ticketPriorityTone(item),
                                  "border-transparent",
                                )
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                          )}
                        >
                          {formatTicketPriority(item)}
                          {active ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={cn(fieldClass, "resize-y min-h-[96px]")}
                    placeholder="Call notes, issue details, promises made…"
                  />
                </div>
              </div>
            </section>

            {/* Raised by */}
            <section className="px-4 py-5 sm:px-6">
              <SectionTitle
                icon={UserRound}
                title="Raised by"
                subtitle="At least one of phone or email is required"
              />
              <div className="grid gap-4 sm:grid-cols-2">
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
                {/* TODO(later): Raised by id
                <div className="sm:col-span-2">
                  <FieldLabel>Raised by id</FieldLabel>
                  <input
                    type="text"
                    value={raisedById}
                    onChange={(e) => setRaisedById(e.target.value)}
                    className={fieldClass}
                    placeholder="Customer / agent / hotel id"
                  />
                </div>
                */}
              </div>
              {!contactHint ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Add a phone or email so the ticket can be created.
                </p>
              ) : null}
            </section>

            {/* TODO(later): More references (payment, settlement, hotel, etc.)
            <section className="px-4 py-5 sm:px-6">
              <SectionTitle
                icon={Link2}
                title="More references"
                subtitle="Optional — payment, settlement, hotel, or other keys"
              />
              <div className="grid gap-2 sm:grid-cols-4">
                <select
                  value={refType}
                  onChange={(e) =>
                    setRefType(e.target.value as HelpdeskReferenceType)
                  }
                  className={cn(fieldClass, "sm:col-span-1")}
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
                  className={cn(fieldClass, "sm:col-span-1")}
                />
                <input
                  type="text"
                  value={refName}
                  onChange={(e) => setRefName(e.target.value)}
                  placeholder="Label (optional)"
                  className={cn(fieldClass, "sm:col-span-1")}
                />
                <button
                  type="button"
                  onClick={addReference}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#2f3d95]/40 hover:text-[#2f3d95]"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </section>
            */}
          </div>

          {/* Sticky-feel footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/90 px-4 py-4 sm:px-6">
            <p className="text-xs text-slate-500">
              {canSubmit
                ? "Ready to create — ticket number will be assigned on submit."
                : "Fill required fields to enable create."}
            </p>
            <div className="flex gap-2">
              <Link
                to={ROUTES.HELPDESK.TICKETS}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={() => void submit()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f3d95] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#283585] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ticket className="h-4 w-4" />
                )}
                Create ticket
              </button>
            </div>
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
