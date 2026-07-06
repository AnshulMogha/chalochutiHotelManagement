import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { ROUTES } from "@/constants";
import {
  bookingService,
  type BookingListItem,
  type BookingListResponse,
} from "../services/bookingService";
const TEXT_FILTER_DEBOUNCE_MS = 400;
import { Toast, useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import {
  BookOpen,
  Building2,
  Hash,
  Loader2,
  RefreshCw,
  Search,
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

export default function BookingListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedHotelId = searchParams.get("hotelId");
  const { toast, showToast, hideToast } = useToast();
  const [listData, setListData] = useState<BookingListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [debouncedGuestName, setDebouncedGuestName] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [debouncedBookingId, setDebouncedBookingId] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [voucherBookingId, setVoucherBookingId] = useState<number | null>(null);
  const [voucherBookingRef, setVoucherBookingRef] = useState<string>("");

  const rows = listData?.data ?? [];
  const rowCount = listData?.totalElements ?? 0;

  // Debounce text filters for server request
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedGuestName(guestName);
      setDebouncedBookingId(bookingId);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, TEXT_FILTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [guestName, bookingId]);

  const hasActiveFilters =
    guestName.trim() !== "" ||
    bookingId.trim() !== "" ||
    checkInDate.trim() !== "";
  const clearFilters = () => {
    setGuestName("");
    setDebouncedGuestName("");
    setBookingId("");
    setDebouncedBookingId("");
    setCheckInDate("");
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
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
        field: "status",
        headerName: "Status",
        flex: 0.7,
        minWidth: 120,
        renderHeader: () => (
          <BookingColumnHeader icon={BookOpen} label="Status" />
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
    [],
  );

  const fetchBookings = async () => {
    if (!selectedHotelId) return;
    setLoading(true);
    try {
      const data = await bookingService.getBookingList({
        hotelId: selectedHotelId,
        guestName: debouncedGuestName.trim() || undefined,
        bookingId: debouncedBookingId.trim() || undefined,
        checkInDate: checkInDate.trim() || undefined,
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
    if (selectedHotelId) {
      fetchBookings();
    } else {
      setListData(null);
    }
  }, [
    selectedHotelId,
    debouncedGuestName,
    debouncedBookingId,
    checkInDate,
    paginationModel.page,
    paginationModel.pageSize,
  ]);

  if (!selectedHotelId) {
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
            </div>
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {selectedHotelId && (
            <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-gray-200/80 bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center gap-1.5 pr-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <Filter className="h-3.5 w-3.5 text-[#2f3d95]" />
                Filters
              </div>
              <div className="relative min-w-[160px] max-w-[220px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Guest name..."
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-1.5 pr-2.5 pl-8 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30"
                />
              </div>
              <div className="relative min-w-[160px] max-w-[220px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Booking ID..."
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-1.5 pr-2.5 pl-8 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="whitespace-nowrap text-xs text-gray-500">
                  Check-in
                </span>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => {
                    setCheckInDate(e.target.value);
                    setPaginationModel((prev) => ({ ...prev, page: 0 }));
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-[#2f3d95] focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30"
                />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          )}

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
                    ? "Try adjusting or clearing the guest name filter."
                    : "There are no bookings for this hotel."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-2 py-2 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <X className="w-4 h-4" />
                    Clear filter
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
                  const query = selectedHotelId
                    ? `?hotelId=${selectedHotelId}`
                    : "";
                  navigate(
                    `${ROUTES.BOOKINGS.DETAIL(String(params.row.id))}${query}`,
                  );
                }}
                sx={bookingTableGridSx}
                className="h-full rounded-none border-0 shadow-none"
              />
            )}
          </div>
        </div>
      </div>

      <VoucherViewModal
        open={voucherBookingId != null}
        onClose={() => setVoucherBookingId(null)}
        bookingId={voucherBookingId != null ? String(voucherBookingId) : ""}
        bookingReference={voucherBookingRef}
      />
    </>
  );
}
