import { useNavigate } from "react-router";
import { Button, ExportButton } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import {
  Plus,
  Edit,
  Eye,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { canOnboardHotel } from "@/constants/roles";
import { useAuth } from "@/hooks";
import type { HotelList, HotelStatus } from "../types";
import { propertyService } from "../services/propertyService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  DataGrid,
  GridToolbar,
} from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { exportToCSV, exportToExcel, type ExportColumn } from "@/utils/export";
import { Toast, useToast } from "@/components/ui/Toast";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import {
  isoToReportDateText,
  parseOptionalReportDate,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";

const HOTEL_LIST_STATUSES = [
  "DRAFT",
  "UNDER_QC",
  "QC_REJECTED",
  "UNDER_ZONAL_REVIEW",
  "ZONAL_REJECTED",
  "LIVE",
] as const;

type PropertyListFilters = {
  hotelName: string;
  hotelCode: string;
  city: string;
  status: string;
  requestedBy: string;
  submittedAt: string;
  submittedAtFrom: string;
  submittedAtTo: string;
};

const DEFAULT_PROPERTY_FILTERS: PropertyListFilters = {
  hotelName: "",
  hotelCode: "",
  city: "",
  status: "",
  requestedBy: "",
  submittedAt: "",
  submittedAtFrom: "",
  submittedAtTo: "",
};

const statusConfig: Record<
  HotelStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  LIVE: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="w-3 h-3" />,
  },
  DRAFT: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: <Edit className="w-3 h-3" />,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: <Clock className="w-3 h-3" />,
  },
  SUSPENDED: {
    label: "Suspended",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <Clock className="w-3 h-3" />,
  },
};

const formatStep = (step: string) => {
  return step
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getStatusInfo = (status?: string) => {
  const normalized = (status || "DRAFT") as HotelStatus;
  const mapped = statusConfig[normalized];
  if (mapped) return mapped;

  const fallbackLabel = (status || "UNKNOWN")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    label: fallbackLabel,
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: <Clock className="w-3 h-3" />,
  };
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getOnboardingReadOnlyUrl = (hotelId: string) =>
  `${ROUTES.PROPERTIES.EDIT(hotelId)}&readOnly=true`;

function mapHotelToListItem(
  hotel: {
    hotelId: string;
    hotelCode: string;
    hotelName: string;
    city?: string | null;
    status: string;
    currentStep: string;
    locked: boolean;
    submittedAt?: string | null;
    requestedByEmail?: string | null;
    rejectionReason?: string | null;
  },
): HotelList {
  return {
    hotelId: hotel.hotelId,
    hotelCode: hotel.hotelCode,
    hotelName: hotel.hotelName,
    city: hotel.city ?? undefined,
    status: hotel.status as HotelStatus,
    currentStep: hotel.currentStep,
    locked: hotel.locked,
    submittedAt: hotel.submittedAt ?? undefined,
    requestedByEmail: hotel.requestedByEmail ?? undefined,
    rejectionReason: hotel.rejectionReason,
  };
}

function splitHotelsByTab(hotels: ReturnType<typeof mapHotelToListItem>[]) {
  const hasRejectionFeedback = (hotel: (typeof hotels)[number]) =>
    Boolean(
      hotel.rejectionReason && String(hotel.rejectionReason).trim().length > 0,
    );
  const status = (hotel: (typeof hotels)[number]) =>
    String(hotel.status || "").toUpperCase();
  const isExplicitRejectedStatus = (hotel: (typeof hotels)[number]) =>
    status(hotel) === "REJECTED";
  const isReviewInProgressStatus = (hotel: (typeof hotels)[number]) =>
    status(hotel) === "UNDER_QC" ||
    status(hotel) === "UNDER_REVIEW" ||
    status(hotel) === "PENDING";
  const shouldGoToRejected = (hotel: (typeof hotels)[number]) =>
    isExplicitRejectedStatus(hotel) ||
    (status(hotel) === "DRAFT" && hasRejectionFeedback(hotel));

  return {
    active: hotels.filter((hotel) => hotel.status === "LIVE"),
    inProcess: hotels.filter(
      (hotel) =>
        hotel.status !== "LIVE" &&
        (!shouldGoToRejected(hotel) || isReviewInProgressStatus(hotel)),
    ),
    rejected: hotels.filter(
      (hotel) => shouldGoToRejected(hotel) && !isReviewInProgressStatus(hotel),
    ),
  };
}

export default function MyPropertiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [activeHotels, setActiveHotels] = useState<HotelList[]>([]);
  const [inProcessHotels, setInProcessHotels] = useState<HotelList[]>([]);
  const [rejectedHotels, setRejectedHotels] = useState<HotelList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<PropertyListFilters>(
    DEFAULT_PROPERTY_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<PropertyListFilters>(
    DEFAULT_PROPERTY_FILTERS,
  );
  const isScopedPropertyViewer =
    !!user?.roles?.includes("HOTEL_MANAGER") ||
    !!user?.roles?.includes("FRONT_DESK_EXEC") ||
    !!user?.roles?.includes("ACCOUNTANT");
  const isHotelBdUser = !!user?.roles?.includes("HOTEL_BD");

  const canOnboard = canOnboardHotel(user?.roles);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalElements / Math.max(1, pageSize))),
    [totalElements, pageSize],
  );

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    const err = error as {
      message?: string;
      response?: { data?: { message?: string } };
      data?: { message?: string };
    };
    return (
      err?.response?.data?.message ||
      err?.data?.message ||
      err?.message ||
      fallback
    );
  };

  const handleAddProperty = async () => {
    if (!canOnboard) return;
    try {
      const response = await propertyService.generateDraftHotel();
      navigate(`${ROUTES.PROPERTIES.CREATE}?draftId=${response.hotelId}`);
    } catch (error) {
      showToast(
        getApiErrorMessage(
          error,
          "Failed to create draft property. Please try again.",
        ),
        "error",
      );
    }
  };

  const hasActiveFilters = Boolean(
    appliedFilters.hotelName ||
      appliedFilters.hotelCode ||
      appliedFilters.city ||
      appliedFilters.status ||
      appliedFilters.requestedBy ||
      appliedFilters.submittedAt ||
      appliedFilters.submittedAtFrom ||
      appliedFilters.submittedAtTo,
  );

  const applyFilters = () => {
    const submittedAtIso = parseOptionalReportDate(draftFilters.submittedAt);
    if (draftFilters.submittedAt.trim() && !submittedAtIso) {
      showToast("Enter submitted date as dd/mm/yyyy", "error");
      return;
    }

    let submittedAtFrom = "";
    let submittedAtTo = "";
    if (!submittedAtIso) {
      const range = validateOptionalDateRange(
        draftFilters.submittedAtFrom,
        draftFilters.submittedAtTo,
      );
      if (!range.ok) {
        showToast(range.message, "error");
        return;
      }
      submittedAtFrom = range.fromDate || "";
      submittedAtTo = range.toDate || "";
    }

    setAppliedFilters({
      hotelName: draftFilters.hotelName.trim(),
      hotelCode: draftFilters.hotelCode.trim(),
      city: draftFilters.city.trim(),
      status: draftFilters.status.trim(),
      requestedBy: draftFilters.requestedBy.trim(),
      submittedAt: submittedAtIso || "",
      submittedAtFrom,
      submittedAtTo,
    });
    setPage(0);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_PROPERTY_FILTERS);
    setAppliedFilters(DEFAULT_PROPERTY_FILTERS);
    setPage(0);
    setFilterOpen(false);
  };

  const openFilterDrawer = () => {
    setDraftFilters({
      ...appliedFilters,
      submittedAt: isoToReportDateText(appliedFilters.submittedAt),
      submittedAtFrom: isoToReportDateText(appliedFilters.submittedAtFrom),
      submittedAtTo: isoToReportDateText(appliedFilters.submittedAtTo),
    });
    setFilterOpen(true);
  };

  const fetchProperties = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await propertyService.getAllHotels({
        page,
        size: pageSize,
        ...(appliedFilters.hotelName
          ? { hotelName: appliedFilters.hotelName }
          : {}),
        ...(appliedFilters.hotelCode
          ? { hotelCode: appliedFilters.hotelCode }
          : {}),
        ...(appliedFilters.city ? { city: appliedFilters.city } : {}),
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
        ...(appliedFilters.requestedBy
          ? { requestedBy: appliedFilters.requestedBy }
          : {}),
        ...(appliedFilters.submittedAt
          ? { submittedAt: appliedFilters.submittedAt }
          : {
              ...(appliedFilters.submittedAtFrom
                ? {
                    submittedAtFrom: `${appliedFilters.submittedAtFrom}T00:00:00.000+05:30`,
                  }
                : {}),
              ...(appliedFilters.submittedAtTo
                ? {
                    submittedAtTo: `${appliedFilters.submittedAtTo}T23:59:59.999+05:30`,
                  }
                : {}),
            }),
      });
      const hotelsList = (response.content || []).map(mapHotelToListItem);
      const split = splitHotelsByTab(hotelsList);

      setActiveHotels(split.active);
      setInProcessHotels(split.inProcess);
      setRejectedHotels(split.rejected);
      setTotalElements(response.totalElements || 0);
    } catch (error) {
      console.error("Error fetching properties:", error);
      setActiveHotels([]);
      setInProcessHotels([]);
      setRejectedHotels([]);
      setTotalElements(0);
      showToast(
        getApiErrorMessage(error, "Failed to load properties. Please try again."),
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, appliedFilters, showToast]);

  useEffect(() => {
    void fetchProperties();
  }, [fetchProperties]);

  const paginationFooter = (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-gray-600">
        Page {page + 1} of {totalPages}
        <span className="text-gray-400"> · </span>
        {totalElements.toLocaleString("en-IN")} total
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Rows
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(0);
              setPageSize(Number(e.target.value));
            }}
            className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={page <= 0 || isLoading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <button
          type="button"
          disabled={page + 1 >= totalPages || isLoading}
          onClick={() => setPage((p) => p + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const handleExportCSV = (
    hotels: HotelList[],
    tab: "active" | "inprocess" | "rejected",
  ) => {
    const exportColumns: ExportColumn[] = [
      { field: "hotelName", headerName: "Hotel Name" },
      { field: "hotelCode", headerName: "Hotel Code" },
      { field: "city", headerName: "City" },
      { field: "status", headerName: "Status" },
      ...(tab !== "active"
        ? [
            {
              field: "currentStep",
              headerName: "Current Step",
              valueGetter: (row) => formatStep(row.currentStep),
            },
          ]
        : []),
      {
        field: "submittedAt",
        headerName: "Submitted At",
        valueGetter: (row) => formatDate(row.submittedAt),
      },
      { field: "requestedByEmail", headerName: "Requested By" },
      ...(tab !== "active"
        ? [{ field: "rejectionReason", headerName: "Rejection Reason" }]
        : []),
    ];
    const today = new Date().toISOString().split("T")[0];
    const filename =
      tab === "active"
        ? `active-hotels-${today}`
        : tab === "inprocess"
          ? `in-process-hotels-${today}`
          : `rejected-hotels-${today}`;
    exportToCSV(hotels, exportColumns, filename);
  };

  const handleExportExcel = (
    hotels: HotelList[],
    tab: "active" | "inprocess" | "rejected",
  ) => {
    const exportColumns: ExportColumn[] = [
      { field: "hotelName", headerName: "Hotel Name" },
      { field: "hotelCode", headerName: "Hotel Code" },
      { field: "city", headerName: "City" },
      { field: "status", headerName: "Status" },
      ...(tab !== "active"
        ? [
            {
              field: "currentStep",
              headerName: "Current Step",
              valueGetter: (row) => formatStep(row.currentStep),
            },
          ]
        : []),
      {
        field: "submittedAt",
        headerName: "Submitted At",
        valueGetter: (row) => formatDate(row.submittedAt),
      },
      { field: "requestedByEmail", headerName: "Requested By" },
      ...(tab !== "active"
        ? [{ field: "rejectionReason", headerName: "Rejection Reason" }]
        : []),
    ];
    const today = new Date().toISOString().split("T")[0];
    const filename =
      tab === "active"
        ? `active-hotels-${today}`
        : tab === "inprocess"
          ? `in-process-hotels-${today}`
          : `rejected-hotels-${today}`;
    exportToExcel(hotels, exportColumns, filename);
  };

  const renderTable = (
    hotels: HotelList[],
    isActiveTab: boolean = false,
    canAddProperty: boolean = true,
    inProcessViewOnly: boolean = false,
  ) => {
    if (hotels.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-16 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">
            No properties found on this page
          </p>
          {canAddProperty && (
            <>
              <p className="text-gray-500 text-sm mb-6">
                Get started by adding your first property
              </p>
              <Button
                onClick={handleAddProperty}
                variant="primary"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Property
              </Button>
            </>
          )}
        </div>
      );
    }

    const columns: GridColDef[] = [
      {
        field: "hotelName",
        headerName: "Hotel Name",
        flex: 1.5,
        minWidth: 200,
        renderCell: (params) => (
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {params.row.hotelName}
              </div>
              <div className="text-xs text-gray-500 truncate">
                ID: {params.row.hotelId}
              </div>
            </div>
          </div>
        ),
      },
      {
        field: "hotelCode",
        headerName: "Hotel Code",
        flex: 0.8,
        minWidth: 150,
        renderCell: (params) => (
          <div className="text-sm text-gray-600 font-mono">
            {params.value || "N/A"}
          </div>
        ),
      },
      {
        field: "city",
        headerName: "City",
        flex: 0.7,
        minWidth: 130,
        renderCell: (params) => (
          <div className="text-sm text-gray-600">{params.value || "N/A"}</div>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.7,
        minWidth: 120,
        renderCell: (params) => {
          const statusInfo = getStatusInfo(params.value);
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap",
                statusInfo.className,
              )}
            >
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          );
        },
      },
      ...(!isActiveTab
        ? [
            {
              field: "currentStep",
              headerName: "Current Step",
              flex: 0.8,
              minWidth: 150,
              renderCell: (params) => (
                <div className="text-sm text-gray-700">
                  {formatStep(params.value)}
                </div>
              ),
            } as GridColDef,
          ]
        : []),
      {
        field: "submittedAt",
        headerName: "Submitted At",
        flex: 1,
        minWidth: 180,
        renderCell: (params) =>
          params.value ? (
            <div className="flex items-center text-sm text-gray-600 whitespace-nowrap">
              <Calendar className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
              <span>{formatDate(params.value)}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">N/A</span>
          ),
      },
      {
        field: "requestedByEmail",
        headerName: "Requested By",
        flex: 1,
        minWidth: 200,
        renderCell: (params) =>
          params.value ? (
            <div className="flex items-center text-sm text-gray-600 min-w-0">
              <User className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
              <span className="truncate">{params.value}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">N/A</span>
          ),
      },
      ...(!isActiveTab
        ? [
            {
              field: "rejectionReason",
              headerName: "Rejection Reason",
              flex: 1.2,
              minWidth: 200,
              renderCell: (params) =>
                params.value ? (
                  <div className="flex items-start gap-2 max-w-full">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-red-700 line-clamp-2 wrap-break-word">
                      {params.value}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                ),
            } as GridColDef,
          ]
        : []),
      {
        field: "actions",
        headerName: "Actions",
        width: 120,
        flex: 0,
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          if (isActiveTab) {
            return (
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(getOnboardingReadOnlyUrl(params.row.hotelId));
                }}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                View
              </Button>
            );
          }

          const shouldOpenReadOnly =
            inProcessViewOnly && params.row.status !== "DRAFT";

          if (!(shouldOpenReadOnly || !params.row.locked)) return null;

          return (
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                navigate(
                  shouldOpenReadOnly
                    ? getOnboardingReadOnlyUrl(params.row.hotelId)
                    : ROUTES.PROPERTIES.EDIT(params.row.hotelId),
                );
              }}
              className="gap-2"
            >
              {shouldOpenReadOnly ? (
                <>
                  <Eye className="w-4 h-4" />
                  View
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Edit
                </>
              )}
            </Button>
          );
        },
      } as GridColDef,
    ];

    return (
      <Box
        sx={{
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
        }}
        className="bg-white border border-gray-200 shadow-md"
      >
        <DataGrid
          rows={hotels}
          columns={columns}
          getRowId={(row) => row.hotelId}
          autoHeight
          hideFooter
          disableColumnFilter
          onRowClick={
            isActiveTab
              ? (params) => {
                  navigate(
                    `${ROUTES.PROPERTY_INFO.BASIC_INFO}?hotelId=${params.row.hotelId}`,
                  );
                }
              : undefined
          }
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
              csvOptions: {
                fileName: `hotels-${new Date().toISOString().split("T")[0]}`,
                delimiter: ",",
                utf8WithBom: true,
              },
              printOptions: {
                disableToolbarButton: false,
              },
              exportOptions: {
                formatOptions: {
                  utf8WithBom: true,
                },
              },
            },
          }}
          sx={{
            border: "none",
            borderRadius: "12px",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#2f3d95 !important",
              color: "white !important",
              fontSize: "0.875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              minHeight: "56px !important",
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 700,
                fontSize: "0.875rem",
                color: "white !important",
              },
              "& .MuiDataGrid-iconButtonContainer": {
                color: "white !important",
              },
            },
            "& .MuiDataGrid-columnHeader": {
              padding: "14px 16px",
              backgroundColor: "#2f3d95 !important",
              color: "white !important",
              "&:focus": {
                outline: "none",
              },
              "&:focus-within": {
                outline: "none",
              },
              "&:hover .MuiDataGrid-iconButtonContainer": {
                opacity: 0,
              },
              "& .MuiDataGrid-iconButtonContainer": {
                opacity: 0,
                transition: "opacity 0.2s",
              },
              "&.MuiDataGrid-columnHeader--sorted .MuiDataGrid-iconButtonContainer":
                {
                  opacity: 1,
                  "& .MuiDataGrid-sortIcon": {
                    color: "#10b981 !important",
                    fontSize: "0.875rem",
                    width: "16px",
                    height: "16px",
                  },
                },
              "& .MuiDataGrid-sortIcon": {
                color: "#10b981 !important",
                fontSize: "0.875rem",
                width: "16px",
                height: "16px",
              },
            },
            "& .MuiDataGrid-row": {
              ...(isActiveTab ? { cursor: "pointer" } : {}),
              "&:hover": {
                backgroundColor: "#eff6ff",
              },
              "&:nth-of-type(even)": {
                backgroundColor: "#fafafa",
                "&:hover": {
                  backgroundColor: "#eff6ff",
                },
              },
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #e5e7eb",
              padding: "14px 16px",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              "&:focus": {
                outline: "none",
              },
              "&:focus-within": {
                outline: "none",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid #e5e7eb",
              padding: "12px 16px",
              backgroundColor: "white",
            },
            "& .MuiDataGrid-toolbarContainer": {
              padding: "12px 16px",
              backgroundColor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              "& .MuiButton-root": {
                textTransform: "none",
              },
            },
            "& .MuiDataGrid-main": {
              overflowX: "hidden",
            },
            "& .MuiDataGrid-columnHeadersInner": {
              backgroundColor: "#2f3d95 !important",
            },
            "& .MuiDataGrid-columnHeaders .MuiDataGrid-filler": {
              backgroundColor: "#2f3d95 !important",
            },
          }}
        />
      </Box>
    );
  };

  if (isLoading && totalElements === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      {isScopedPropertyViewer ? (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={openFilterDrawer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters ? (
                <span className="rounded-full bg-[#2f3d95] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Active
                </span>
              ) : null}
            </button>
          </div>
          {renderTable(activeHotels, true, false)}
          {paginationFooter}
        </>
      ) : (
        <Tabs
          defaultValue="active"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <TabsList className="bg-white border border-gray-200 shadow-sm h-12 px-1 space-x-1 rounded-xl">
              <TabsTrigger
                value="active"
                className="cursor-pointer px-6 py-2.5 text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all"
              >
                <span>Active Properties</span>
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium data-[state=active]:bg-white/20 data-[state=active]:text-white">
                  {activeHotels.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="inprocess"
                className="cursor-pointer px-6 py-2.5 text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all"
              >
                <span>In Process</span>
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium data-[state=active]:bg-white/20 data-[state=active]:text-white">
                  {inProcessHotels.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="cursor-pointer px-6 py-2.5 text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all"
              >
                <span>Rejected</span>
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium data-[state=active]:bg-white/20 data-[state=active]:text-white">
                  {rejectedHotels.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openFilterDrawer}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters ? (
                  <span className="rounded-full bg-[#2f3d95] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Active
                  </span>
                ) : null}
              </button>
              {canOnboard && (
                <Button
                  onClick={handleAddProperty}
                  variant="primary"
                  className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add New Property</span>
                </Button>
              )}
              {activeTab === "active" && activeHotels.length > 0 && (
                <ExportButton
                  onExportCSV={() => handleExportCSV(activeHotels, "active")}
                  onExportExcel={() =>
                    handleExportExcel(activeHotels, "active")
                  }
                />
              )}
              {activeTab === "inprocess" && inProcessHotels.length > 0 && (
                <ExportButton
                  onExportCSV={() =>
                    handleExportCSV(inProcessHotels, "inprocess")
                  }
                  onExportExcel={() =>
                    handleExportExcel(inProcessHotels, "inprocess")
                  }
                />
              )}
              {activeTab === "rejected" && rejectedHotels.length > 0 && (
                <ExportButton
                  onExportCSV={() =>
                    handleExportCSV(rejectedHotels, "rejected")
                  }
                  onExportExcel={() =>
                    handleExportExcel(rejectedHotels, "rejected")
                  }
                />
              )}
            </div>
          </div>

          {/* Active Properties Tab */}
          <TabsContent value="active" className="mt-0">
            {renderTable(activeHotels, true, canOnboard)}
          </TabsContent>

          {/* In Process Properties Tab */}
          <TabsContent value="inprocess" className="mt-0">
            {renderTable(inProcessHotels, false, canOnboard, isHotelBdUser)}
          </TabsContent>

          {/* Rejected Properties Tab */}
          <TabsContent value="rejected" className="mt-0">
            {renderTable(rejectedHotels, false, canOnboard, isHotelBdUser)}
          </TabsContent>

          {paginationFooter}
        </Tabs>
      )}

      {filterOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setFilterOpen(false)}
          />
          <aside className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
                <p className="text-[11px] text-slate-500">
                  Search hotels, then apply to refresh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Hotel name
                </label>
                <input
                  type="search"
                  value={draftFilters.hotelName}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      hotelName: e.target.value,
                    }))
                  }
                  placeholder="Taj"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Hotel code
                </label>
                <input
                  type="search"
                  value={draftFilters.hotelCode}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      hotelCode: e.target.value,
                    }))
                  }
                  placeholder="HTL"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  City
                </label>
                <input
                  type="search"
                  value={draftFilters.city}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  placeholder="Mumbai"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Status
                </label>
                <select
                  value={draftFilters.status}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  {HOTEL_LIST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status
                        .toLowerCase()
                        .split("_")
                        .map(
                          (part) =>
                            part.charAt(0).toUpperCase() + part.slice(1),
                        )
                        .join(" ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Requested by
                </label>
                <input
                  type="search"
                  value={draftFilters.requestedBy}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      requestedBy: e.target.value,
                    }))
                  }
                  placeholder="owner@"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <ReportCustomDateFields
                  singleDate
                  singleLabel="Submitted date (IST day)"
                  fromText={draftFilters.submittedAt}
                  onFromTextChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      submittedAt: value,
                      submittedAtFrom: "",
                      submittedAtTo: "",
                    }))
                  }
                />
              </div>
              <ReportCustomDateFields
                fromLabel="Submitted from"
                toLabel="Submitted to"
                fromText={draftFilters.submittedAtFrom}
                toText={draftFilters.submittedAtTo}
                onFromTextChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    submittedAtFrom: value,
                    submittedAt: "",
                  }))
                }
                onToTextChange={(value) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    submittedAtTo: value,
                    submittedAt: "",
                  }))
                }
              />
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 rounded-lg bg-[#2f3d95] px-3 py-2 text-sm font-semibold text-white hover:bg-[#263578]"
              >
                Apply
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
