import { useNavigate } from "react-router";
import { Button, DataTable, ExportButton } from "@/components/ui";
import type { GridColDef } from "@mui/x-data-grid";
import {
  Plus,
  Edit,
  Eye,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  CalendarDays,
  MapPin,
  User,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { canOnboardHotel } from "@/constants/roles";
import { useAuth } from "@/hooks";
import type { HotelList, HotelStatus } from "../types";
import { propertyService } from "../services/propertyService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Toast, useToast } from "@/components/ui/Toast";
import { ReportCustomDateFields } from "@/features/reports/components/ReportCustomDateFields";
import {
  ReportFilterButton,
  ReportFilterDrawer,
} from "@/features/reports/components/ReportFilterDrawer";
import {
  exportStatusLabel,
  isoToReportDateText,
  parseOptionalReportDate,
  validateOptionalDateRange,
} from "@/features/reports/components/reportUiHelpers";
import type {
  ExportJobStatus,
  ReportExportFormat,
} from "@/features/reports/services/reportExportService";

const PROPERTY_TABS = [
  { value: "all", label: "All Properties" },
  { value: "active", label: "Active Properties" },
  { value: "inprocess", label: "In Process" },
  { value: "rejected", label: "Rejected" },
] as const;

const TAB_STATUS_PARAMS: Record<string, string> = {
  all: "",
  active: "LIVE",
  inprocess: "INPROCESS",
  rejected: "REJECTED",
};

type PropertyListFilters = {
  hotelName: string;
  hotelCode: string;
  city: string;
  requestedBy: string;
  submittedAt: string;
  submittedAtFrom: string;
  submittedAtTo: string;
};

const DEFAULT_PROPERTY_FILTERS: PropertyListFilters = {
  hotelName: "",
  hotelCode: "",
  city: "",
  requestedBy: "",
  submittedAt: "",
  submittedAtFrom: "",
  submittedAtTo: "",
};

const statusConfig: Record<
  HotelStatus,
  { label: string; className: string; icon: React.ReactNode; iconWrap: string }
> = {
  LIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    iconWrap: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    iconWrap: "bg-amber-100 text-amber-700",
    icon: <Clock className="w-3 h-3" />,
  },
  DRAFT: {
    label: "Draft",
    className: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
    iconWrap: "bg-sky-100 text-sky-700",
    icon: <Edit className="w-3 h-3" />,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
    iconWrap: "bg-rose-100 text-rose-700",
    icon: <AlertCircle className="w-3 h-3" />,
  },
  SUSPENDED: {
    label: "Suspended",
    className: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
    iconWrap: "bg-orange-100 text-orange-700",
    icon: <Clock className="w-3 h-3" />,
  },
};

const STEP_TONES: Array<{ match: RegExp; className: string }> = [
  {
    match: /basic|info/i,
    className: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200",
  },
  {
    match: /document/i,
    className: "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
  },
  {
    match: /room|inventory/i,
    className: "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200",
  },
  {
    match: /rate|price/i,
    className: "bg-teal-50 text-teal-800 ring-1 ring-teal-200",
  },
  {
    match: /polic/i,
    className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  },
  {
    match: /photo|image|media/i,
    className: "bg-fuchsia-50 text-fuchsia-800 ring-1 ring-fuchsia-200",
  },
  {
    match: /review|submit/i,
    className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  },
];

const formatStep = (step: string) => {
  return step
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getStepTone = (step: string) => {
  const found = STEP_TONES.find((tone) => tone.match.test(step));
  return found?.className ?? "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
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
    className: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    iconWrap: "bg-slate-100 text-slate-600",
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

const withMyPropertyOrigin = (url: string) =>
  `${url}${url.includes("?") ? "&" : "?"}from=my-property`;

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
    rejectionReason: hotel.rejectionReason ?? undefined,
  };
}

export default function MyPropertiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [allHotels, setAllHotels] = useState<HotelList[]>([]);
  const [activeHotels, setActiveHotels] = useState<HotelList[]>([]);
  const [inProcessHotels, setInProcessHotels] = useState<HotelList[]>([]);
  const [rejectedHotels, setRejectedHotels] = useState<HotelList[]>([]);
  const [tabTotals, setTabTotals] = useState<Record<string, number>>({
    all: 0,
    active: 0,
    inprocess: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportJobStatus | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
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
    !!user?.roles?.includes("HOTEL_ACCOUNTANT") ||
    !!user?.roles?.includes("ACCOUNTANT");
  const isHotelBdUser = !!user?.roles?.includes("HOTEL_BD");

  const canOnboard = canOnboardHotel(user?.roles);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalElements / Math.max(1, pageSize))),
    [totalElements, pageSize],
  );

  const propertyFilterParams = useMemo(
    () => ({
      ...(appliedFilters.hotelName
        ? { hotelName: appliedFilters.hotelName }
        : {}),
      ...(appliedFilters.hotelCode
        ? { hotelCode: appliedFilters.hotelCode }
        : {}),
      ...(appliedFilters.city ? { city: appliedFilters.city } : {}),
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
    }),
    [appliedFilters],
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
      navigate(
        withMyPropertyOrigin(
          `${ROUTES.PROPERTIES.CREATE}?draftId=${response.hotelId}`,
        ),
      );
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

  const activeFilterCount =
    (appliedFilters.hotelName.trim() ? 1 : 0) +
    (appliedFilters.hotelCode.trim() ? 1 : 0) +
    (appliedFilters.city.trim() ? 1 : 0) +
    (appliedFilters.requestedBy.trim() ? 1 : 0) +
    (appliedFilters.submittedAt ? 1 : 0) +
    (!appliedFilters.submittedAt &&
    (appliedFilters.submittedAtFrom || appliedFilters.submittedAtTo)
      ? 1
      : 0);

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
      const requestedTab = isScopedPropertyViewer ? "active" : activeTab;
      const response = await propertyService.getAllHotels({
        page,
        size: pageSize,
        ...propertyFilterParams,
        ...(TAB_STATUS_PARAMS[requestedTab]
          ? { status: TAB_STATUS_PARAMS[requestedTab] }
          : {}),
      });
      const hotelsList = (response.content || []).map(mapHotelToListItem);
      if (requestedTab === "all") setAllHotels(hotelsList);
      if (requestedTab === "active") setActiveHotels(hotelsList);
      if (requestedTab === "inprocess") setInProcessHotels(hotelsList);
      if (requestedTab === "rejected") setRejectedHotels(hotelsList);
      const responseTotal = response.totalElements || 0;
      setTabTotals((prev) => ({ ...prev, [requestedTab]: responseTotal }));
      setTotalElements(responseTotal);
    } catch (error) {
      console.error("Error fetching properties:", error);
      setAllHotels([]);
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
  }, [
    page,
    pageSize,
    activeTab,
    propertyFilterParams,
    isScopedPropertyViewer,
    showToast,
  ]);

  useEffect(() => {
    void fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    if (isScopedPropertyViewer) return;
    let cancelled = false;

    void Promise.all(
      (["active", "inprocess", "rejected"] as const).map(async (tab) => {
        const response = await propertyService.getAllHotels({
          page: 0,
          size: 1,
          ...propertyFilterParams,
          status: TAB_STATUS_PARAMS[tab],
        });
        return [tab, response.totalElements || 0] as const;
      }),
    )
      .then((totals) => {
        if (cancelled) return;
        setTabTotals((prev) => ({
          ...prev,
          ...Object.fromEntries(totals),
        }));
      })
      .catch((error) => {
        console.error("Failed to preload property counts:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [isScopedPropertyViewer, propertyFilterParams]);

  const handleExport = async (format: ReportExportFormat) => {
    setExporting(true);
    setExportStatus("QUEUED");
    try {
      await propertyService.exportHotels({
        params: {
          ...propertyFilterParams,
          ...(TAB_STATUS_PARAMS[activeTab]
            ? { status: TAB_STATUS_PARAMS[activeTab] }
            : {}),
        },
        format,
        defaultFileName: `${activeTab}-properties-${new Date().toISOString().split("T")[0]}`,
        onStatus: setExportStatus,
      });
      showToast("Property export downloaded.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Property export failed."), "error");
    } finally {
      setExporting(false);
      setExportStatus(null);
    }
  };

  const effectiveTab = isScopedPropertyViewer ? "active" : activeTab;
  const isActiveTab = effectiveTab === "active";
  const isAllTab = effectiveTab === "all";
  const showStepAndRejection = !isActiveTab;
  const inProcessViewOnly = isHotelBdUser && !isActiveTab;
  const hotels =
    effectiveTab === "all"
      ? allHotels
      : effectiveTab === "active"
        ? activeHotels
        : effectiveTab === "inprocess"
          ? inProcessHotels
          : rejectedHotels;
  const handleRowNavigate = (hotel: HotelList) => {
    if (isScopedPropertyViewer) return;
    const isLiveProperty = ["ACTIVE", "LIVE"].includes(
      String(hotel.status || "").toUpperCase(),
    );
    if (isActiveTab || (isAllTab && isLiveProperty)) {
      navigate(
        `${ROUTES.PROPERTY_INFO.BASIC_INFO}?hotelId=${hotel.hotelId}`,
      );
    }
  };

  const renderRowActions = (hotel: HotelList) => {
    if (isScopedPropertyViewer) return null;

    const isLiveProperty = ["ACTIVE", "LIVE"].includes(
      String(hotel.status || "").toUpperCase(),
    );

    if (isActiveTab || (isAllTab && isLiveProperty)) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            navigate(getOnboardingReadOnlyUrl(hotel.hotelId));
          }}
          className="gap-1.5 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
      );
    }

    const shouldOpenReadOnly =
      inProcessViewOnly && hotel.status !== "DRAFT";

    if (!(shouldOpenReadOnly || !hotel.locked)) return null;

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          navigate(
            shouldOpenReadOnly
              ? getOnboardingReadOnlyUrl(hotel.hotelId)
              : withMyPropertyOrigin(ROUTES.PROPERTIES.EDIT(hotel.hotelId)),
          );
        }}
        className={cn(
          "gap-1.5",
          shouldOpenReadOnly
            ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
        )}
      >
        {shouldOpenReadOnly ? (
          <>
            <Eye className="h-3.5 w-3.5" />
            View
          </>
        ) : (
          <>
            <Edit className="h-3.5 w-3.5" />
            Edit
          </>
        )}
      </Button>
    );
  };

  const columns: GridColDef<HotelList>[] = [
    {
      field: "hotelName",
      headerName: "Hotel Name",
      flex: 1,
      minWidth: 220,
      sortable: false,
      renderCell: (params) => {
        const statusInfo = getStatusInfo(params.row.status);
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                statusInfo.iconWrap,
              )}
            >
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">
                {params.row.hotelName}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                ID: {params.row.hotelId}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      field: "hotelCode",
      headerName: "Hotel Code",
      width: 160,
      sortable: false,
      renderCell: (params) =>
        params.row.hotelCode ? (
          <span className="inline-flex max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            {params.row.hotelCode}
          </span>
        ) : (
          <span className="text-sm text-slate-400">N/A</span>
        ),
    },
    {
      field: "city",
      headerName: "City",
      width: 140,
      sortable: false,
      renderCell: (params) =>
        params.row.city ? (
          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200">
            <MapPin className="h-3 w-3 shrink-0" />
            {params.row.city}
          </span>
        ) : (
          <span className="text-sm text-slate-400">N/A</span>
        ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      sortable: false,
      renderCell: (params) => {
        const statusInfo = getStatusInfo(params.row.status);
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              statusInfo.className,
            )}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        );
      },
    },
    ...(showStepAndRejection
      ? [
          {
            field: "currentStep",
            headerName: "Current Step",
            width: 150,
            sortable: false,
            renderCell: (params) => (
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
                  getStepTone(params.row.currentStep || ""),
                )}
              >
                {formatStep(params.row.currentStep || "")}
              </span>
            ),
          } satisfies GridColDef<HotelList>,
        ]
      : []),
    {
      field: "submittedAt",
      headerName: "Submitted At",
      width: 150,
      sortable: false,
      renderCell: (params) =>
        params.row.submittedAt ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            <CalendarDays className="h-3 w-3 shrink-0" />
            {formatDate(params.row.submittedAt)}
          </span>
        ) : (
          <span className="text-sm text-slate-400">N/A</span>
        ),
    },
    {
      field: "requestedByEmail",
      headerName: "Requested By",
      width: 220,
      sortable: false,
      renderCell: (params) =>
        params.row.requestedByEmail ? (
          <span
            className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200"
            title={params.row.requestedByEmail}
          >
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{params.row.requestedByEmail}</span>
          </span>
        ) : (
          <span className="text-sm text-slate-400">N/A</span>
        ),
    },
    ...(showStepAndRejection
      ? [
          {
            field: "rejectionReason",
            headerName: "Rejection Reason",
            width: 220,
            sortable: false,
            renderCell: (params) =>
              params.row.rejectionReason ? (
                <span className="inline-flex items-start gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">
                    {params.row.rejectionReason}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-slate-400">—</span>
              ),
          } satisfies GridColDef<HotelList>,
        ]
      : []),
    ...(!isScopedPropertyViewer
      ? [
          {
            field: "actions",
            headerName: "Actions",
            width: 120,
            sortable: false,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => renderRowActions(params.row),
          } satisfies GridColDef<HotelList>,
        ]
      : []),
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <div className="mx-auto max-w-350 px-3 py-4 sm:px-5">
        <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1">
              {isScopedPropertyViewer ? (
                <span className="rounded-full bg-[#2f3d95] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Active Properties
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-px text-[10px] font-bold">
                    {tabTotals.active}
                  </span>
                </span>
              ) : (
                PROPERTY_TABS.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.value);
                        setPage(0);
                      }}
                      className={cn(
                        "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition",
                        isActive
                          ? "bg-[#2f3d95] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      {tab.label}
                      <span
                        className={cn(
                          "ml-1.5 rounded-full px-1.5 py-px text-[10px] font-bold",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white text-slate-500",
                        )}
                      >
                        {tabTotals[tab.value] ?? 0}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ReportFilterButton
                onClick={openFilterDrawer}
                activeCount={activeFilterCount}
                label="Filters"
              />
              {!isScopedPropertyViewer && canOnboard ? (
                <Button
                  onClick={() => void handleAddProperty()}
                  variant="primary"
                  size="sm"
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add New Property
                </Button>
              ) : null}
              {!isScopedPropertyViewer && (tabTotals[activeTab] ?? 0) > 0 ? (
                <ExportButton
                  iconOnly
                  exporting={exporting}
                  exportingLabel={
                    exportStatusLabel(exportStatus) || "Exporting…"
                  }
                  onExportExcel={() => void handleExport("EXCEL")}
                  onExportCSV={() => void handleExport("CSV")}
                />
              ) : null}
            </div>
          </div>
        </div>

        <DataTable
          subtitle={
            isLoading && hotels.length === 0 ? (
              "Loading…"
            ) : (
              <>
                <span className="font-medium text-slate-600">
                  {totalElements.toLocaleString("en-IN")}{" "}
                  {totalElements === 1 ? "property" : "properties"}
                </span>
                <span className="text-slate-400">
                  {" "}
                  · Page {page + 1} of {Math.max(totalPages, 1)}
                </span>
              </>
            )
          }
          rows={hotels}
          columns={columns}
          getRowId={(row) => row.hotelId}
          loading={isLoading}
          paginationMode="server"
          rowCount={totalElements}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            if (model.pageSize !== pageSize) {
              setPage(0);
              setPageSize(model.pageSize);
              return;
            }
            if (model.page !== page) setPage(model.page);
          }}
          pageSizeOptions={[10, 20, 50, 100]}
          disableRowSelectionOnClick
          disableColumnFilter
          showToolbar
          showExport={false}
          allowHorizontalScroll
          getRowHeight={() => "auto"}
          onRowClick={(params) => {
            const hotel = params.row;
            const rowClickable =
              !isScopedPropertyViewer &&
              (isActiveTab ||
                (isAllTab &&
                  ["ACTIVE", "LIVE"].includes(
                    String(hotel.status || "").toUpperCase(),
                  )));
            if (rowClickable) handleRowNavigate(hotel);
          }}
          getRowClassName={(params) => {
            const hotel = params.row;
            const rowClickable =
              !isScopedPropertyViewer &&
              (isActiveTab ||
                (isAllTab &&
                  ["ACTIVE", "LIVE"].includes(
                    String(hotel.status || "").toUpperCase(),
                  )));
            return rowClickable ? "property-row-clickable" : "";
          }}
          localeText={{
            noRowsLabel:
              canOnboard && !isScopedPropertyViewer
                ? "No properties found. Add a new property to get started."
                : "No properties found on this page.",
          }}
          sx={{
            "& .MuiDataGrid-cell": {
              alignItems: "center",
              whiteSpace: "normal",
              py: "8px",
            },
            "& .property-row-clickable": {
              cursor: "pointer",
            },
          }}
        />
      </div>

      <ReportFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        onApply={applyFilters}
        title="Filters"
        resetLabel="Reset"
        applyLabel="Apply"
      >
        <section>
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
        </section>
        <section>
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
        </section>
        <section>
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
        </section>
        <section>
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
        </section>
        <section>
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
        </section>
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
      </ReportFilterDrawer>
    </div>
  );
}
