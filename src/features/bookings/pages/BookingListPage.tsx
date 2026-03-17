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
  Calendar,
  Building2,
  Hash,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  X,
  FileText,
} from "lucide-react";
import { VoucherViewModal } from "../components/VoucherViewModal";

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
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

function getStatusStyle(status: string | undefined): string {
  if (!status) return "bg-gray-100 text-gray-700 border-gray-200";
  const s = status.toUpperCase();
  if (s === "CONFIRMED" || s === "COMPLETED")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "RESERVED" || s === "PENDING" || s === "PROCESSING")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "CANCELLED" || s === "CANCELED")
    return "bg-red-50 text-red-700 border-red-200";
  if (s === "CHECKED_IN" || s === "CHECKED_OUT")
    return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
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
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
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
    guestName.trim() !== "" || bookingId.trim() !== "" || checkInDate.trim() !== "";
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
        minWidth: 140,
        renderCell: (params) => (
          <div className="flex items-center gap-2 w-full min-w-0">
            <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#2f3d95]/10 text-[#2f3d95]">
              <Hash className="w-4 h-4" />
            </span>
            <span className="text-sm font-medium text-gray-900 font-mono truncate" title={params.value}>
              {params.value}
            </span>
          </div>
        ),
      },
      {
        field: "guestName",
        headerName: "Guest",
        flex: 1,
        minWidth: 160,
        renderCell: (params) => {
          const row = params.row;
          return (
            <div className="flex flex-col gap-0.5 w-full min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate" title={row.guestName || undefined}>
                {row.guestName || "—"}
              </span>
              {row.guestContact ? (
                <span className="text-xs text-gray-500 truncate" title={row.guestContact}>
                  {row.guestContact}
                </span>
              ) : null}
              <span className="text-xs text-gray-400">
                {row.numberOfGuests} guest{row.numberOfGuests !== 1 ? "s" : ""}
              </span>
            </div>
          );
        },
      },
      {
        field: "checkInDate",
        headerName: "Check-in",
        flex: 0.65,
        minWidth: 110,
        renderCell: (params) => (
          <div className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
            <Calendar className="w-4 h-4 shrink-0 text-gray-400" />
            {formatDate(params.value)}
          </div>
        ),
      },
      {
        field: "checkOutDate",
        headerName: "Check-out",
        flex: 0.65,
        minWidth: 110,
        renderCell: (params) => (
          <div className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
            <Calendar className="w-4 h-4 shrink-0 text-gray-400" />
            {formatDate(params.value)}
          </div>
        ),
      },
      {
        field: "roomDisplay",
        headerName: "Room",
        flex: 1.2,
        minWidth: 160,
        renderCell: (params) => (
          <span className="text-sm text-gray-700 block wrap-break-word" style={{ wordBreak: "break-word" }}>
            {params.value || "—"}
          </span>
        ),
      },
      {
        field: "mealPlan",
        headerName: "Meal",
        flex: 0.5,
        minWidth: 80,
        renderCell: (params) => (
          <span className="text-sm text-gray-600 truncate block w-full" title={params.value || undefined}>
            {params.value || "—"}
          </span>
        ),
      },
      {
        field: "bookingSource",
        headerName: "Source",
        flex: 0.5,
        minWidth: 80,
        renderCell: (params) => (
          <span className="text-sm text-gray-600 truncate block w-full" title={params.value || undefined}>
            {params.value || "—"}
          </span>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.7,
        minWidth: 110,
        renderCell: (params) => (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${getStatusStyle(params.value)}`}
          >
            {params.value}
          </span>
        ),
      },
      {
        field: "netAmount",
        headerName: "Net amount",
        flex: 0.8,
        minWidth: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <span className="text-sm font-medium text-gray-900 tabular-nums">
            {formatCurrency(params.value)}
          </span>
        ),
      },
      {
        field: "actions",
        headerName: "Voucher",
        flex: 0.5,
        minWidth: 100,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVoucherBookingId(params.row.id);
              setVoucherBookingRef(params.row.bookingId || "");
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#2f3d95] bg-[#2f3d95]/10 hover:bg-[#2f3d95]/20 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Voucher
          </button>
        ),
      },
    ],
    []
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-2">
            Please select a hotel from the dropdown above to view booking list
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-12">
          <div className="flex flex-col items-center justify-center min-h-[360px] text-center">
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Bookings
            </h1>
            <p className="text-gray-500 mt-1">
              View and manage bookings for the selected hotel
              {listData != null && (
                <span className="ml-2 text-gray-400">
                  · {rowCount} booking{rowCount !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Filters */}
        {selectedHotelId && (
          <div className="mb-4 p-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Filter className="w-4 h-4 text-[#2f3d95]" />
                Filters
              </div>
              <div className="relative min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Guest name..."
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30 focus:border-[#2f3d95]"
                />
              </div>
              <div className="relative min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Booking ID..."
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30 focus:border-[#2f3d95]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Check-in date</span>
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => {
                    setCheckInDate(e.target.value);
                    setPaginationModel((prev) => ({ ...prev, page: 0 }));
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f3d95]/30 focus:border-[#2f3d95] bg-white"
                />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 px-4">
              <Loader2 className="w-10 h-10 text-[#2f3d95] animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-600">
                Loading bookings...
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No bookings found
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {hasActiveFilters ? "Try adjusting or clearing the guest name filter." : "There are no bookings for this hotel."}
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
              paginationMode="server"
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 20, 50]}
              showToolbar
              exportFileName={`bookings-${selectedHotelId ?? "export"}`}
              disableRowSelectionOnClick
              onRowClick={(params) => {
                const query = selectedHotelId ? `?hotelId=${selectedHotelId}` : "";
                navigate(`${ROUTES.BOOKINGS.DETAIL(String(params.row.id))}${query}`);
              }}
              className="rounded-xl border-0 shadow-none"
            />
          )}
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
