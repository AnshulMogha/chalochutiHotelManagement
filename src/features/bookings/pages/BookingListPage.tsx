import { useState, useEffect, useMemo, useRef, type KeyboardEvent, type RefObject } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";
import { ROUTES } from "@/constants";
import { isAuditorRole, isSuperAdmin } from "@/constants/roles";
import { useAuth } from "@/hooks";
import {
  getReturnBackLabel,
  readReturnToFromLocation,
  appendReturnToQuery,
} from "@/lib/navigationReturn";
import {
  bookingService,
  type BookingListItem,
  type BookingListResponse,
  type BookingListOrderBy,
  type BookingListSortDir,
  type BookingListDateFilter,
  type BookingListExportParams,
} from "../services/bookingService";
import { Toast, useToast } from "@/components/ui/Toast";
import { HotelLookupMultiSelectField } from "@/features/reports/components/HotelLookupFilterField";
import { DataTable } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "@/features/reports/services/reportExportService";
import {
  exportStatusLabel,
  formatReportDate,
} from "@/features/reports/components/reportUiHelpers";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  Download,
  Hash,
  Layers,
  Loader2,
  RefreshCw,
  Filter,
  X,
  FileText,
  User,
  BedDouble,
  UtensilsCrossed,
  Radio,
  IndianRupee,
  LogIn,
  LogOut,
} from "lucide-react";
import { VoucherViewModal } from "../components/VoucherViewModal";
import { BookingTableToolbar } from "../components/BookingTableToolbar";
import {
  BookingCellChip,
  BookingColumnHeader,
  bookingTableGridSx,
  getStatusConfig,
} from "../components/bookingTableUi";

const TEXT_FILTER_DEBOUNCE_MS = 400;

const BOOKING_ORDER_OPTIONS: { value: BookingListOrderBy; label: string }[] = [
  { value: "bookingDate", label: "Booking date" },
  { value: "checkIn", label: "Check-in date" },
];

const BOOKING_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any status" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "CHECKED_IN", label: "Checked in" },
  { value: "CHECKED_OUT", label: "Checked out" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
];

type BookingDateAxis =
  | "NONE"
  | "BOOKING"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "STAYING"
  | "CHECK_OUT_RANGE";

type BookingDatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "CUSTOM";

const DATE_AXIS_OPTIONS: { value: BookingDateAxis; label: string }[] = [
  { value: "NONE", label: "Any date" },
  { value: "BOOKING", label: "Booked on" },
  { value: "CHECK_IN", label: "Check-in" },
  { value: "CHECK_OUT", label: "Check-out" },
  { value: "STAYING", label: "Staying on" },
  { value: "CHECK_OUT_RANGE", label: "Check-out range" },
];

const DATE_PRESET_OPTIONS: { value: BookingDatePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "CUSTOM", label: "Custom" },
];

/** Filter params Booking Summary drill-downs can put on the URL. */
const DRILL_PARAM_KEYS = [
  "view",
  "dateFilter",
  "fromDate",
  "toDate",
  "checkInDate",
  "bookingDate",
  "checkOutDate",
  "today",
  "checkOutFrom",
  "checkOutTo",
  "bookingStatus",
];

function mapAxisToDateFilter(
  axis: BookingDateAxis,
): BookingListDateFilter | undefined {
  switch (axis) {
    case "BOOKING":
      return "BOOKING_DATE";
    case "CHECK_IN":
      return "CHECK_IN";
    case "CHECK_OUT":
    case "CHECK_OUT_RANGE":
      return "CHECK_OUT";
    case "STAYING":
      return "STAYING";
    default:
      return undefined;
  }
}

const DRILL_VIEW_LABELS: Record<string, string> = {
  TODAYS_BOOKINGS: "Today's bookings",
  TODAYS_CHECKINS: "Today's check-ins",
  STAYING_TODAY: "Staying today",
  TODAYS_CHECKOUTS: "Today's check-outs",
  NET_BOOKINGS: "Net bookings",
  NET_EARNINGS: "Net earnings",
};

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function resolvePresetRange(
  preset: BookingDatePreset,
  customFrom: string,
  customTo: string,
): { from: string; to: string } | null {
  if (preset === "CUSTOM") {
    if (!customFrom && !customTo) return null;
    return {
      from: customFrom || customTo,
      to: customTo || customFrom,
    };
  }

  const today = startOfDay(new Date());
  const end = new Date(today);
  const start = new Date(today);

  switch (preset) {
    case "TODAY":
      break;
    case "YESTERDAY":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case "LAST_7_DAYS":
      start.setDate(start.getDate() - 6);
      break;
    case "LAST_30_DAYS":
      start.setDate(start.getDate() - 29);
      break;
    case "THIS_MONTH":
      start.setDate(1);
      break;
    case "LAST_MONTH": {
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0); // last day of previous month
      break;
    }
    default:
      break;
  }

  return { from: toIsoDate(start), to: toIsoDate(end) };
}

function preventManualDateEntry(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Tab" && event.key !== "Shift") {
    event.preventDefault();
  }
}

function openNativeDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus();
  if ("showPicker" in input && typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.click();
}

function CalendarDateField({
  label,
  value,
  min,
  onChange,
  inputRef,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (iso: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <div
        className="relative cursor-pointer"
        onClick={() => openNativeDatePicker(inputRef.current)}
      >
        <CalendarDays className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          readOnly
          value={value ? formatReportDate(value) : ""}
          placeholder="dd/mm/yyyy"
          className="w-full cursor-pointer rounded-md border border-slate-200 px-2 py-1.5 pr-8 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30"
        />
        <input
          ref={inputRef}
          type="date"
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={preventManualDateEntry}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function inferAxisFromDrill(params: URLSearchParams): BookingDateAxis {
  const dateFilter = params.get("dateFilter")?.trim().toUpperCase();
  if (dateFilter === "BOOKING_DATE") return "BOOKING";
  if (dateFilter === "CHECK_IN") return "CHECK_IN";
  if (dateFilter === "CHECK_OUT") {
    const from = params.get("fromDate")?.trim();
    const to = params.get("toDate")?.trim();
    if (from && to && from !== to) return "CHECK_OUT_RANGE";
    return "CHECK_OUT";
  }
  if (dateFilter === "STAYING") return "STAYING";
  if (params.get("checkOutFrom") || params.get("checkOutTo")) {
    return "CHECK_OUT_RANGE";
  }
  if (params.get("bookingDate")) return "BOOKING";
  if (params.get("checkInDate")) return "CHECK_IN";
  if (params.get("checkOutDate")) return "CHECK_OUT";
  if (params.get("today")) return "STAYING";
  return "NONE";
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  if (Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getMealPlanStyle(plan: string | undefined): string {
  const p = (plan || "").toUpperCase();
  if (p.includes("MAP")) return "bg-orange-50 text-orange-700 ring-orange-100";
  if (p.includes("AP") || p.includes("AI"))
    return "bg-violet-50 text-violet-700 ring-violet-100";
  if (p.includes("CP")) return "bg-cyan-50 text-cyan-700 ring-cyan-100";
  if (p.includes("EP") || p.includes("RO"))
    return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-gray-50 text-gray-600 ring-gray-200";
}

function formatBookingModeLabel(mode: string | undefined | null): string {
  if (!mode?.trim()) return "—";
  return mode
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getBookingModeStyle(mode: string | undefined | null): string {
  const normalized = (mode || "").trim().toUpperCase();
  if (normalized === "B2B" || normalized.includes("AGENT")) {
    return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  }
  if (normalized === "B2C" || normalized.includes("CUSTOMER")) {
    return "bg-teal-50 text-teal-700 ring-teal-200";
  }
  if (normalized.includes("PACKAGE")) {
    return "bg-violet-50 text-violet-700 ring-violet-200";
  }
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

export default function BookingListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const seesAllBookings =
    isSuperAdmin(user?.roles) || isAuditorRole(user?.roles);
  const selectedHotelIds = useMemo(() => {
    const propertyIds = searchParams
      .get("propertyIds")
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (propertyIds?.length) return [...new Set(propertyIds)];
    const hotelId = searchParams.get("hotelId")?.trim();
    return hotelId ? [hotelId] : [];
  }, [searchParams]);
  const selectedHotelId =
    selectedHotelIds.length === 1 ? selectedHotelIds[0] : null;
  const bookingIdFromUrl = searchParams.get("bookingId")?.trim() || "";
  const returnTo = readReturnToFromLocation(searchParams, location.state);
  const backLabel = getReturnBackLabel(returnTo);
  const autoNavigatedRef = useRef(false);
  const isSettlementDeepLink = Boolean(returnTo && bookingIdFromUrl);
  const [deepLinkExhausted, setDeepLinkExhausted] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const [listData, setListData] = useState<BookingListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [debouncedGuestName, setDebouncedGuestName] = useState("");
  const [bookingId, setBookingId] = useState(bookingIdFromUrl);
  const [debouncedBookingId, setDebouncedBookingId] =
    useState(bookingIdFromUrl);
  const [orderBy, setOrderBy] = useState<BookingListOrderBy>("bookingDate");
  const [sortDir, setSortDir] = useState<BookingListSortDir>("desc");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [voucherBookingId, setVoucherBookingId] = useState<number | null>(null);
  const [voucherBookingRef, setVoucherBookingRef] = useState<string>("");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(
    null,
  );
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Date/status filters double as drill-down targets from Booking Summary,
  // so they seed from the URL and stay editable afterwards.
  const readParam = (key: string) => searchParams.get(key)?.trim() || "";
  const [dateAxis, setDateAxis] = useState<BookingDateAxis>(() =>
    inferAxisFromDrill(searchParams),
  );
  const [datePreset, setDatePreset] = useState<BookingDatePreset>(() => {
    const axis = inferAxisFromDrill(searchParams);
    if (axis === "NONE") return "TODAY";
    return "CUSTOM";
  });
  const [customFrom, setCustomFrom] = useState(() => {
    return (
      readParam("fromDate") ||
      readParam("bookingDate") ||
      readParam("checkInDate") ||
      readParam("checkOutDate") ||
      readParam("today") ||
      readParam("checkOutFrom") ||
      ""
    );
  });
  const [customTo, setCustomTo] = useState(() => {
    return (
      readParam("toDate") ||
      readParam("checkOutTo") ||
      readParam("fromDate") ||
      readParam("bookingDate") ||
      readParam("checkInDate") ||
      readParam("checkOutDate") ||
      readParam("today") ||
      ""
    );
  });
  const [bookingStatus, setBookingStatus] = useState(() =>
    readParam("bookingStatus"),
  );
  const [drillView, setDrillView] = useState(() => readParam("view"));
  const [bookingFilterOpen, setBookingFilterOpen] = useState(false);
  const [draftHotelIds, setDraftHotelIds] = useState<string[]>([]);
  const fromDateInputRef = useRef<HTMLInputElement>(null);
  const toDateInputRef = useRef<HTMLInputElement>(null);

  const rows = listData?.data ?? [];
  const rowCount = listData?.totalElements ?? 0;

  const drillViewLabel = drillView
    ? (DRILL_VIEW_LABELS[drillView] ?? drillView)
    : "";

  const resolvedDates = useMemo(() => {
    if (dateAxis === "NONE" || !customFrom || !customTo) return null;
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    return { from, to };
  }, [dateAxis, customFrom, customTo]);

  const applyPresetRange = (preset: BookingDatePreset) => {
    const range = resolvePresetRange(preset, customFrom, customTo);
    if (!range) return;
    setCustomFrom(range.from);
    setCustomTo(range.to);
    setDatePreset(preset);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleFromDateChange = (value: string) => {
    setCustomFrom(value);
    setDatePreset("CUSTOM");
    if (customTo && value > customTo) {
      setCustomTo(value);
    }
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleToDateChange = (value: string) => {
    setCustomTo(value);
    setDatePreset("CUSTOM");
    if (customFrom && value < customFrom) {
      setCustomFrom(value);
    }
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const dateFilterParams = useMemo(() => {
    if (!resolvedDates || dateAxis === "NONE") {
      return {
        dateFilter: undefined as BookingListDateFilter | undefined,
        fromDate: undefined as string | undefined,
        toDate: undefined as string | undefined,
      };
    }

    const { from, to } = resolvedDates;
    return {
      dateFilter: mapAxisToDateFilter(dateAxis),
      fromDate: from,
      toDate: to,
    };
  }, [dateAxis, resolvedDates]);

  // Seed Booking ID search from deep links (e.g. settlement preview).
  useEffect(() => {
    if (!bookingIdFromUrl) return;
    setBookingId(bookingIdFromUrl);
    setDebouncedBookingId(bookingIdFromUrl);
    setDateAxis("NONE");
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [bookingIdFromUrl]);

  // Debounce text filters for server request
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedGuestName(guestName);
      setDebouncedBookingId(bookingId);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, TEXT_FILTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [guestName, bookingId]);

  useEffect(() => {
    if (!downloadOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(target)
      ) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [downloadOpen]);

  const listExportParams = useMemo((): BookingListExportParams | null => {
    if (!seesAllBookings && !selectedHotelId) return null;
    return {
      propertyIds: selectedHotelIds.length ? selectedHotelIds : undefined,
      guestName: debouncedGuestName.trim() || undefined,
      bookingId: debouncedBookingId.trim() || undefined,
      dateFilter: dateFilterParams.dateFilter,
      fromDate: dateFilterParams.fromDate,
      toDate: dateFilterParams.toDate,
      bookingStatus: bookingStatus.trim() || undefined,
      view: drillView || undefined,
      orderBy,
      sortDir,
    };
  }, [
    selectedHotelId,
    selectedHotelIds,
    debouncedGuestName,
    debouncedBookingId,
    dateFilterParams.dateFilter,
    dateFilterParams.fromDate,
    dateFilterParams.toDate,
    bookingStatus,
    drillView,
    orderBy,
    sortDir,
    seesAllBookings,
  ]);

  const exportBaseName = () => {
    const hotelPart = selectedHotelId
      ? selectedHotelId.slice(0, 8)
      : "bookings";
    const datePart = new Date().toISOString().slice(0, 10);
    return `booking-list-${hotelPart}-${datePart}`;
  };

  const handleExport = async (format: ReportExportFormat) => {
    if (!listExportParams) return;
    setDownloadOpen(false);
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await bookingService.exportBookingList({
        params: listExportParams,
        format,
        defaultFileName: exportBaseName(),
        onStatus: setExportStatus,
      });
      showToast("Booking list downloaded.", "success");
    } catch (err) {
      console.error("Booking list export failed:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Export failed";
      showToast(message, "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  // Seed the filter bar from Booking Summary drill-down params, then drop them
  // from the URL so the filters stay fully editable afterwards.
  const urlFilterKey = searchParams.toString();
  useEffect(() => {
    if (!DRILL_PARAM_KEYS.some((key) => searchParams.has(key))) return;
    const read = (key: string) => searchParams.get(key)?.trim() || "";
    const nextAxis = inferAxisFromDrill(searchParams);
    const nextFrom =
      read("fromDate") ||
      read("bookingDate") ||
      read("checkInDate") ||
      read("checkOutDate") ||
      read("today") ||
      read("checkOutFrom") ||
      "";
    const nextTo =
      read("toDate") ||
      read("checkOutTo") ||
      read("fromDate") ||
      read("bookingDate") ||
      read("checkInDate") ||
      read("checkOutDate") ||
      read("today") ||
      "";

    setDrillView(read("view"));
    setBookingStatus(read("bookingStatus"));
    setDateAxis(nextAxis);
    setDatePreset(nextAxis === "NONE" ? "TODAY" : "CUSTOM");
    setCustomFrom(nextFrom);
    setCustomTo(nextTo);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));

    const hotelId = searchParams.get("hotelId");
    if (hotelId) {
      navigate(
        `${ROUTES.BOOKINGS.LIST}?hotelId=${encodeURIComponent(hotelId)}`,
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilterKey]);

  const hasDateFilter = dateAxis !== "NONE";
  const hasActiveFilters =
    (seesAllBookings && selectedHotelIds.length > 0) ||
    guestName.trim() !== "" ||
    bookingId.trim() !== "" ||
    hasDateFilter ||
    bookingStatus.trim() !== "" ||
    orderBy !== "bookingDate" ||
    sortDir !== "desc" ||
    !!drillView;

  const clearFilters = () => {
    setGuestName("");
    setDebouncedGuestName("");
    setBookingId("");
    setDebouncedBookingId("");
    setDateAxis("NONE");
    setDatePreset("THIS_MONTH");
    setCustomFrom("");
    setCustomTo("");
    setBookingStatus("");
    setDrillView("");
    setOrderBy("bookingDate");
    setSortDir("desc");
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    if (seesAllBookings && selectedHotelIds.length) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("hotelId");
          next.delete("propertyIds");
          return next;
        },
        { replace: true },
      );
    }
    if (searchParams.has("bookingId")) {
      const hotelId = searchParams.get("hotelId");
      navigate(
        hotelId
          ? `${ROUTES.BOOKINGS.LIST}?hotelId=${encodeURIComponent(hotelId)}`
          : ROUTES.BOOKINGS.LIST,
        { replace: true },
      );
    }
  };

  const openBookingFilters = () => {
    setDraftHotelIds(selectedHotelIds);
    setBookingFilterOpen(true);
  };

  const applyHotelFilter = () => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("hotelId");
        if (draftHotelIds.length) {
          next.set("propertyIds", draftHotelIds.join(","));
        } else {
          next.delete("propertyIds");
        }
        return next;
      },
      { replace: true },
    );
    setBookingFilterOpen(false);
  };

  const columns: GridColDef<BookingListItem>[] = useMemo(
    () => [
      {
        field: "bookingId",
        headerName: "Booking ID",
        flex: 0.9,
        minWidth: 150,
        renderHeader: () => (
          <BookingColumnHeader icon={Hash} label="Booking ID" />
        ),
        renderCell: (params) => (
          <div className="flex w-full min-w-0 items-center gap-2">
            <BookingCellChip icon={Hash} theme="indigo" />
            <span
              className="truncate font-mono text-sm font-semibold text-[#2f3d95]"
              title={params.value}
            >
              {params.value}
            </span>
          </div>
        ),
      },
      ...(seesAllBookings
        ? [
            {
              field: "hotelName",
              headerName: "Hotel",
              flex: 1,
              minWidth: 160,
              renderHeader: () => (
                <BookingColumnHeader icon={Building2} label="Hotel" />
              ),
              renderCell: (params: { value?: string }) => (
                <span className="truncate text-sm text-gray-700">
                  {params.value || "—"}
                </span>
              ),
            } satisfies GridColDef,
          ]
        : []),
      {
        field: "guestName",
        headerName: "Guest",
        flex: 1,
        minWidth: 170,
        renderHeader: () => <BookingColumnHeader icon={User} label="Guest" />,
        renderCell: (params) => {
          const row = params.row;
          const displayName =
            row.guestName?.trim() || row.guestContact?.trim() || "—";
          const showContactBelow =
            !!row.guestName?.trim() &&
            !!row.guestContact?.trim() &&
            row.guestContact.trim() !== row.guestName?.trim();
          const metaLine = [
            showContactBelow ? row.guestContact : null,
            `${row.numberOfGuests} guest${row.numberOfGuests !== 1 ? "s" : ""}`,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <div className="flex h-full w-full min-w-0 items-center py-1">
              <div className="min-w-0 flex-1 overflow-hidden leading-snug">
                <p
                  className="truncate text-sm font-medium text-gray-900"
                  title={displayName !== "—" ? displayName : undefined}
                >
                  {displayName}
                </p>
                {metaLine ? (
                  <p
                    className="truncate text-xs text-gray-500"
                    title={metaLine}
                  >
                    {metaLine}
                  </p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        field: "bookingDate",
        headerName: "Booking date",
        flex: 0.65,
        minWidth: 120,
        renderHeader: () => (
          <BookingColumnHeader icon={Calendar} label="Booking date" />
        ),
        renderCell: (params) => (
          <span className="whitespace-nowrap text-sm text-gray-700">
            {formatDate(params.value)}
          </span>
        ),
      },
      {
        field: "checkInDate",
        headerName: "Check-in",
        flex: 0.65,
        minWidth: 120,
        renderHeader: () => (
          <BookingColumnHeader icon={LogIn} label="Check-in" />
        ),
        renderCell: (params) => (
          <span className="whitespace-nowrap text-sm text-gray-700">
            {formatDate(params.value)}
          </span>
        ),
      },
      {
        field: "checkOutDate",
        headerName: "Check-out",
        flex: 0.65,
        minWidth: 120,
        renderHeader: () => (
          <BookingColumnHeader icon={LogOut} label="Check-out" />
        ),
        renderCell: (params) => (
          <span className="whitespace-nowrap text-sm text-gray-700">
            {formatDate(params.value)}
          </span>
        ),
      },
      {
        field: "roomDisplay",
        headerName: "Room",
        flex: 1.2,
        minWidth: 160,
        renderHeader: () => (
          <BookingColumnHeader icon={BedDouble} label="Room" />
        ),
        renderCell: (params) => (
          <span
            className="text-sm text-gray-700 wrap-break-word"
            style={{ wordBreak: "break-word" }}
          >
            {params.value || "—"}
          </span>
        ),
      },
      {
        field: "mealPlan",
        headerName: "Meal",
        flex: 0.5,
        minWidth: 88,
        renderHeader: () => (
          <BookingColumnHeader icon={UtensilsCrossed} label="Meal" />
        ),
        renderCell: (params) => (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${getMealPlanStyle(params.value)}`}
            title={params.value || undefined}
          >
            {params.value || "—"}
          </span>
        ),
      },
      {
        field: "bookingSource",
        headerName: "Source",
        flex: 0.5,
        minWidth: 88,
        renderHeader: () => <BookingColumnHeader icon={Radio} label="Source" />,
        renderCell: (params) => (
          <span
            className="inline-flex items-center gap-1.5 truncate rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
            title={params.value || undefined}
          >
            <Radio className="h-3 w-3 shrink-0 text-cyan-600" />
            {params.value || "—"}
          </span>
        ),
      },
      {
        field: "bookingMode",
        headerName: "Mode",
        flex: 0.55,
        minWidth: 92,
        renderHeader: () => (
          <BookingColumnHeader icon={Layers} label="Booking mode" />
        ),
        renderCell: (params) => {
          const label = formatBookingModeLabel(params.value);
          if (label === "—") {
            return <span className="text-sm text-gray-400">—</span>;
          }
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${getBookingModeStyle(params.value)}`}
              title={params.value || undefined}
            >
              <Layers className="h-3 w-3 shrink-0 opacity-70" />
              {label}
            </span>
          );
        },
      },
      {
        field: "status",
        headerName: "Booking status",
        flex: 0.7,
        minWidth: 120,
        renderHeader: () => (
          <BookingColumnHeader icon={BookOpen} label="Booking status" />
        ),
        renderCell: (params) => {
          const statusStyle = getStatusConfig(params.value);
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusStyle.className}`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusStyle.dotClass}`}
              />
              {params.value}
            </span>
          );
        },
      },
      {
        field: "netAmount",
        headerName: "Net amount",
        flex: 0.8,
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderHeader: () => (
          <BookingColumnHeader icon={IndianRupee} label="Net amount" />
        ),
        renderCell: (params) => (
          <div className="flex w-full items-center justify-end gap-1.5">
            <span className="tabular-nums text-sm font-bold text-emerald-700">
              {formatCurrency(params.value)}
            </span>
          </div>
        ),
      },
      {
        field: "actions",
        headerName: "Voucher",
        flex: 0.5,
        minWidth: 108,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderHeader: () => (
          <BookingColumnHeader icon={FileText} label="Voucher" />
        ),
        renderCell: (params) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVoucherBookingId(params.row.id);
              setVoucherBookingRef(params.row.bookingId || "");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2f3d95]/20 bg-[#2f3d95]/10 px-2.5 py-1.5 text-xs font-semibold text-[#2f3d95] transition-colors hover:border-[#2f3d95]/35 hover:bg-[#2f3d95]/20"
          >
            <FileText className="h-3.5 w-3.5" />
            Voucher
          </button>
        ),
      },
    ],
    [seesAllBookings],
  );

  const fetchBookings = async () => {
    if (!seesAllBookings && !selectedHotelId) return;
    setLoading(true);
    try {
      const data = await bookingService.getBookingList({
        propertyIds: selectedHotelIds.length ? selectedHotelIds : undefined,
        guestName: debouncedGuestName.trim() || undefined,
        bookingId: debouncedBookingId.trim() || undefined,
        dateFilter: dateFilterParams.dateFilter,
        fromDate: dateFilterParams.fromDate,
        toDate: dateFilterParams.toDate,
        bookingStatus: bookingStatus.trim() || undefined,
        view: drillView || undefined,
        orderBy,
        sortDir,
        page: paginationModel.page,
        size: paginationModel.pageSize,
      });
      setListData(data);
    } catch (err) {
      console.error("Error fetching booking list:", err);
      showToast("Failed to load bookings", "error");
      setListData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seesAllBookings || selectedHotelId) {
      fetchBookings();
    } else {
      setListData(null);
    }
  }, [
    seesAllBookings,
    selectedHotelId,
    selectedHotelIds,
    debouncedGuestName,
    debouncedBookingId,
    dateFilterParams.dateFilter,
    dateFilterParams.fromDate,
    dateFilterParams.toDate,
    bookingStatus,
    drillView,
    orderBy,
    sortDir,
    paginationModel.page,
    paginationModel.pageSize,
  ]);

  const openBookingDetail = (rowId: number) => {
    const query = new URLSearchParams();
    if (selectedHotelId) query.set("hotelId", selectedHotelId);
    appendReturnToQuery(query, returnTo);
    const qs = query.toString();
    navigate(`${ROUTES.BOOKINGS.DETAIL(String(rowId))}${qs ? `?${qs}` : ""}`, {
      state: returnTo ? { returnTo } : undefined,
    });
  };

  useEffect(() => {
    autoNavigatedRef.current = false;
    setDeepLinkExhausted(false);
  }, [bookingIdFromUrl, returnTo]);

  useEffect(() => {
    if (
      autoNavigatedRef.current ||
      !isSettlementDeepLink ||
      loading ||
      (!seesAllBookings && !selectedHotelId)
    ) {
      return;
    }
    if (!listData) return;
    if (listData.data.length === 1 && paginationModel.page === 0) {
      autoNavigatedRef.current = true;
      openBookingDetail(listData.data[0].id);
      return;
    }
    setDeepLinkExhausted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSettlementDeepLink,
    loading,
    listData,
    paginationModel.page,
    selectedHotelId,
  ]);

  const showDeepLinkLoader =
    isSettlementDeepLink &&
    !deepLinkExhausted &&
    (loading || !listData || listData.data.length === 1);

  if (!seesAllBookings && !selectedHotelId) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Please select a hotel from the dropdown above to view booking list
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white p-8 shadow-sm">
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#2f3d95]/10 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-[#2f3d95]" />
            </div>
            <p className="text-gray-500 font-medium">No hotel selected</p>
            <p className="text-sm text-gray-400 mt-1">
              Use the hotel selector in the top bar to choose a property
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showDeepLinkLoader) {
    return (
      <>
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
          <Loader2 className="mb-3 h-9 w-9 animate-spin text-[#2f3d95]" />
          <p className="text-sm font-medium text-gray-600">Opening booking…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="container mx-auto flex h-full min-h-0 flex-1 flex-col px-4 py-4">
          {returnTo ? (
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              className="mb-2 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </button>
          ) : null}
          <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Bookings
                {listData != null && (
                  <span className="ml-1.5 font-bold text-gray-900">
                    ({rowCount} booking{rowCount !== 1 ? "s" : ""})
                  </span>
                )}
              </h1>
              {drillViewLabel ? (
                <span className="rounded-full bg-[#2f3d95]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2f3d95]">
                  {drillViewLabel}
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(seesAllBookings || selectedHotelId) ? (
                <>
                  <button
                    type="button"
                    onClick={openBookingFilters}
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#2f3d95]/20 bg-[#2f3d95]/10 px-2.5 text-xs font-semibold uppercase tracking-wide text-[#2f3d95] transition-colors hover:border-[#2f3d95]/35 hover:bg-[#2f3d95]/20"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                    {hasActiveFilters ? (
                      <span className="rounded-full bg-[#2f3d95] px-1.5 py-0.5 text-[9px] text-white">
                        Active
                      </span>
                    ) : null}
                  </button>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  ) : null}
                </>
              ) : null}
              <div className="relative" ref={downloadMenuRef}>
                <button
                  type="button"
                  onClick={() => setDownloadOpen((open) => !open)}
                  disabled={exporting || loading}
                  title={
                    exporting
                      ? exportStatusLabel(exportStatus) || "Exporting…"
                      : "Download bookings"
                  }
                  aria-label={
                    exporting
                      ? exportStatusLabel(exportStatus) || "Exporting bookings"
                      : "Download bookings"
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2f3d95]/20 bg-[#2f3d95]/10 text-[#2f3d95] shadow-sm transition-colors hover:border-[#2f3d95]/35 hover:bg-[#2f3d95]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
                {downloadOpen && !exporting ? (
                  <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => void handleExport("EXCEL")}
                      className="flex w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Download Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExport("CSV")}
                      className="flex w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Download CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExport("PDF")}
                      className="flex w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Download PDF
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={fetchBookings}
                disabled={loading}
                title="Refresh"
                aria-label="Refresh bookings"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {drillView ? (
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm text-indigo-900">
              <span className="flex flex-wrap items-center gap-2">
                Filters applied from Booking Summary
                {drillViewLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#2f3d95] ring-1 ring-indigo-200">
                    {drillViewLabel}
                    <button
                      type="button"
                      onClick={() => {
                        setDrillView("");
                        setPaginationModel((prev) => ({ ...prev, page: 0 }));
                      }}
                      aria-label="Remove drill-down view"
                      className="cursor-pointer rounded-full p-0.5 hover:bg-indigo-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null}
                <span className="text-xs text-indigo-700/80">
                  Edit them below to refine the list.
                </span>
              </span>
              <button
                type="button"
                onClick={() => navigate(ROUTES.REPORTS.BOOKING_SUMMARY)}
                className="cursor-pointer font-semibold text-[#2f3d95] hover:underline"
              >
                Back to summary
              </button>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
            {loading ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4">
                <Loader2 className="mb-3 h-9 w-9 animate-spin text-[#2f3d95]" />
                <p className="text-sm font-medium text-gray-600">
                  Loading bookings...
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No bookings found
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  {hasActiveFilters
                    ? "Try adjusting or clearing the applied filters."
                    : "There are no bookings for this hotel."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-2 py-2 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <X className="w-4 h-4" />
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <DataTable
                rows={rows}
                columns={columns}
                getRowId={(row) => String(row.id)}
                rowCount={rowCount}
                rowHeight={64}
                paginationMode="server"
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 20, 50]}
                showToolbar
                fillContainer
                slots={{ toolbar: BookingTableToolbar }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: false,
                  },
                }}
                exportFileName={`bookings-${selectedHotelId ?? "export"}`}
                disableRowSelectionOnClick
                onRowClick={(params) => {
                  openBookingDetail(params.row.id);
                }}
                sx={bookingTableGridSx}
                className="h-full rounded-none border-0 shadow-none"
              />
            )}
          </div>
        </div>
      </div>

      {bookingFilterOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close booking filters"
            onClick={() => setBookingFilterOpen(false)}
            className="absolute inset-0 cursor-pointer bg-slate-900/40"
          />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Booking Filters</h2>
              <button
                type="button"
                onClick={() => setBookingFilterOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {seesAllBookings ? (
                <HotelLookupMultiSelectField
                  label="Hotels"
                  allLabel="All hotels"
                  value={draftHotelIds}
                  onChange={setDraftHotelIds}
                />
              ) : null}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Guest name
                </span>
                <input
                  type="text"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Search by guest name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/20"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Booking ID
                </span>
                <input
                  type="text"
                  value={bookingId}
                  onChange={(event) => setBookingId(event.target.value)}
                  placeholder="Search by booking ID"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/20"
                />
              </label>

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Date range</h3>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Date field</span>
                  <select
                    value={dateAxis}
                    onChange={(event) => {
                      const nextAxis = event.target.value as BookingDateAxis;
                      setDateAxis(nextAxis);
                      setPaginationModel((prev) => ({ ...prev, page: 0 }));
                      if (
                        nextAxis !== "NONE" &&
                        (!customFrom || !customTo)
                      ) {
                        applyPresetRange(
                          datePreset === "CUSTOM" ? "THIS_MONTH" : datePreset,
                        );
                      }
                    }}
                    className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f3d95] focus:outline-none"
                  >
                    {DATE_AXIS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {dateAxis !== "NONE" ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-500">
                        Quick range
                      </span>
                      <select
                        value={datePreset}
                        onChange={(event) =>
                          applyPresetRange(
                            event.target.value as BookingDatePreset,
                          )
                        }
                        className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f3d95] focus:outline-none"
                      >
                        {DATE_PRESET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <CalendarDateField
                        label="From"
                        value={customFrom}
                        onChange={handleFromDateChange}
                        inputRef={fromDateInputRef}
                      />
                      <CalendarDateField
                        label="To"
                        value={customTo}
                        min={customFrom || undefined}
                        onChange={handleToDateChange}
                        inputRef={toDateInputRef}
                      />
                    </div>
                  </>
                ) : null}
              </section>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Booking status
                </span>
                <select
                  value={bookingStatus}
                  onChange={(event) => {
                    setBookingStatus(event.target.value);
                    setPaginationModel((prev) => ({ ...prev, page: 0 }));
                  }}
                  className="w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f3d95] focus:outline-none"
                >
                  {BOOKING_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label || "All statuses"}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Sort by
                  </span>
                  <select
                    value={orderBy}
                    onChange={(event) => {
                      setOrderBy(event.target.value as BookingListOrderBy);
                      setPaginationModel((prev) => ({ ...prev, page: 0 }));
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f3d95] focus:outline-none"
                  >
                    {BOOKING_ORDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Direction
                  </span>
                  <select
                    value={sortDir}
                    onChange={(event) => {
                      setSortDir(event.target.value as BookingListSortDir);
                      setPaginationModel((prev) => ({ ...prev, page: 0 }));
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2f3d95] focus:outline-none"
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setDraftHotelIds([]);
                  clearFilters();
                }}
                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={applyHotelFilter}
                className="cursor-pointer rounded-lg bg-[#2f3d95] px-4 py-2 text-sm font-semibold text-white hover:bg-[#253178]"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <VoucherViewModal
        open={voucherBookingId != null}
        onClose={() => setVoucherBookingId(null)}
        bookingId={voucherBookingId != null ? String(voucherBookingId) : ""}
        bookingReference={voucherBookingRef}
      />
    </>
  );
}
