import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  adminService,
  type HotelReviewItem,
  type ApprovedHotelItem,
  type RejectedHotelItem,
  type ReviewRemark,
} from "../services/adminService";
import { Button, ExportButton, Tabs, TabsContent, TabsList, TabsTrigger, DataTable } from "@/components/ui";
import {
  Eye,
  Calendar,
  User,
  Building2,
  X,
  Loader2,
  AlertCircle,
  Hash,
  MapPin,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ROUTES } from "@/constants";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { exportToCSV, exportToExcel, type ExportColumn } from "@/utils/export";
import { useAuth } from "@/hooks/useAuth";
import {
  isZonalHotelReviewerRole,
  isQcReviewerRole,
} from "@/constants/roles";
import { cn } from "@/lib/utils";
import { HotelReviewTableToolbar } from "../components/HotelReviewTableToolbar";
import {
  HotelReviewColumnHeader,
  HotelReviewBadge,
  getRemarkTone,
  hotelReviewTableGridSx,
} from "../components/hotelReviewTableUi";

type HotelReviewFetchMode = "super_admin" | "qc" | "zonal";
type ReviewBucket = "pending" | "approved" | "rejected";
const REVIEW_CONTEXT_KEY = "hotel-review-context";

const REVIEW_TABS: {
  value: ReviewBucket;
  label: string;
  icon: typeof Clock;
}[] = [
  { value: "pending", label: "Pending", icon: Clock },
  { value: "approved", label: "Approved", icon: CheckCircle2 },
  { value: "rejected", label: "Rejected", icon: XCircle },
];

const REVIEW_TAB_STYLES: Record<
  ReviewBucket,
  { active: string; idle: string; iconActive: string; iconIdle: string }
> = {
  pending: {
    active: "bg-amber-500 text-white shadow-sm",
    idle: "text-amber-800 hover:bg-amber-100/80",
    iconActive: "text-white",
    iconIdle: "text-amber-600",
  },
  approved: {
    active: "bg-emerald-600 text-white shadow-sm",
    idle: "text-emerald-800 hover:bg-emerald-100/80",
    iconActive: "text-white",
    iconIdle: "text-emerald-600",
  },
  rejected: {
    active: "bg-rose-600 text-white shadow-sm",
    idle: "text-rose-800 hover:bg-rose-100/80",
    iconActive: "text-white",
    iconIdle: "text-rose-600",
  },
};

function getHotelReviewFetchMode(
  roles: string[] | undefined,
): HotelReviewFetchMode {
  if (isZonalHotelReviewerRole(roles)) return "zonal";
  if (isQcReviewerRole(roles)) return "qc";
  return "super_admin";
}

export default function HotelReviewListPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingHotels, setPendingHotels] = useState<HotelReviewItem[]>([]);
  const [approvedHotels, setApprovedHotels] = useState<ApprovedHotelItem[]>([]);
  const [rejectedHotels, setRejectedHotels] = useState<RejectedHotelItem[]>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const [totalRows, setTotalRows] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remarkModalData, setRemarkModalData] = useState<{
    hotelName: string;
    remarks: ReviewRemark[];
  } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const fetchMode = getHotelReviewFetchMode(user?.roles);
  const useReviewerReadOnlyView =
    fetchMode === "qc" || fetchMode === "zonal";

  const persistReviewContext = (tab: ReviewBucket, hotelId?: string) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      REVIEW_CONTEXT_KEY,
      JSON.stringify({ tab, hotelId: hotelId || null, updatedAt: Date.now() }),
    );
  };

  useEffect(() => {
    persistReviewContext(activeTab as ReviewBucket);
  }, [activeTab]);

  useEffect(() => {
    const fetchHotelsByTab = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params = {
          page: paginationModel.page,
          size: paginationModel.pageSize,
        };
        if (activeTab === "pending") {
          const response =
            fetchMode === "zonal"
              ? await adminService.getZonalPendingHotelsPaginated(params)
              : fetchMode === "qc"
                ? await adminService.getQcPendingHotelsPaginated(params)
                : await adminService.getHotelsForReviewPaginated(params);
          setPendingHotels(response.content || []);
          setTotalRows((prev) => ({ ...prev, pending: response.totalElements || 0 }));
        } else if (activeTab === "approved") {
          const response =
            fetchMode === "zonal"
              ? await adminService.getZonalApprovedHotelsPaginated(params)
              : fetchMode === "qc"
                ? await adminService.getQcApprovedHotelsPaginated(params)
                : await adminService.getApprovedHotelsPaginated(params);
          setApprovedHotels(response.content || []);
          setTotalRows((prev) => ({ ...prev, approved: response.totalElements || 0 }));
        } else {
          const response =
            fetchMode === "zonal"
              ? await adminService.getZonalRejectedHotelsPaginated(params)
              : fetchMode === "qc"
                ? await adminService.getQcRejectedHotelsPaginated(params)
                : await adminService.getRejectedHotelsPaginated(params);
          setRejectedHotels(response.content || []);
          setTotalRows((prev) => ({ ...prev, rejected: response.totalElements || 0 }));
        }
      } catch (err) {
        setError("Failed to load hotels");
        console.error("Error fetching hotels:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotelsByTab();
  }, [fetchMode, activeTab, paginationModel.page, paginationModel.pageSize]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getLatestReviewRemark = (
    row: HotelReviewItem | ApprovedHotelItem | RejectedHotelItem,
  ) => {
    const remarks = row.qcRemarks ?? [];
    if (!remarks.length) return null;
    return remarks.reduce((latest, current) =>
      new Date(current.remarkedAt).getTime() >
      new Date(latest.remarkedAt).getTime()
        ? current
        : latest,
    );
  };
  const truncateRemark = (remark: string, max = 52) =>
    remark.length > max ? `${remark.slice(0, max)}...` : remark;

  const getCurrentHotels = () => {
    switch (activeTab) {
      case "pending":
        return pendingHotels;
      case "approved":
        return approvedHotels;
      case "rejected":
        return rejectedHotels;
      default:
        return [];
    }
  };

  const getCurrentTotalRows = () => {
    switch (activeTab) {
      case "pending":
        return totalRows.pending;
      case "approved":
        return totalRows.approved;
      case "rejected":
        return totalRows.rejected;
      default:
        return 0;
    }
  };

  const handleExportCSV = () => {
    const hotels = getCurrentHotels();
    const exportColumns: ExportColumn[] = [
      { field: "hotelName", headerName: "Hotel Name" },
      { field: "hotelCity", headerName: "Hotel City" },
      { field: "hotelCode", headerName: "Hotel Code" },
      { field: "requestedBy", headerName: "Submitted By" },
      {
        field: "submittedAt",
        headerName: "Submitted At",
        valueGetter: (row) => formatDate(row.submittedAt),
      },
      {
        field: "latestRemark",
        headerName: "QC/Zonal Remark",
        valueGetter: (row) => getLatestReviewRemark(row)?.remark || "",
      },
    ];
    exportToCSV(hotels, exportColumns, `hotel-review-${activeTab}-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    const hotels = getCurrentHotels();
    const exportColumns: ExportColumn[] = [
      { field: "hotelName", headerName: "Hotel Name" },
      { field: "hotelCity", headerName: "Hotel City" },
      { field: "hotelCode", headerName: "Hotel Code" },
      { field: "requestedBy", headerName: "Submitted By" },
      {
        field: "submittedAt",
        headerName: "Submitted At",
        valueGetter: (row) => formatDate(row.submittedAt),
      },
      {
        field: "latestRemark",
        headerName: "QC/Zonal Remark",
        valueGetter: (row) => getLatestReviewRemark(row)?.remark || "",
      },
    ];
    exportToExcel(hotels, exportColumns, `hotel-review-${activeTab}-${new Date().toISOString().split('T')[0]}`);
  };

  const columns: GridColDef[] = [
    {
      field: "hotelName",
      headerName: "Hotel Name",
      flex: 1.5,
      minWidth: 180,
      renderHeader: () => (
        <HotelReviewColumnHeader icon={Building2} label="Hotel Name" />
      ),
      renderCell: (params) => (
        <span className="truncate text-sm font-semibold text-gray-900">
          {params.value}
        </span>
      ),
    },
    {
      field: "hotelCity",
      headerName: "Hotel City",
      flex: 0.9,
      minWidth: 130,
      renderHeader: () => (
        <HotelReviewColumnHeader icon={MapPin} label="Hotel City" />
      ),
      renderCell: (params) =>
        params.value ? (
          <HotelReviewBadge className="bg-violet-50 text-violet-700 ring-violet-200">
            {params.value}
          </HotelReviewBadge>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      field: "hotelCode",
      headerName: "Hotel Code",
      flex: 0.8,
      minWidth: 130,
      renderHeader: () => (
        <HotelReviewColumnHeader icon={Hash} label="Hotel Code" />
      ),
      renderCell: (params) => (
        <HotelReviewBadge className="bg-indigo-50 font-mono text-indigo-700 ring-indigo-200">
          {params.value}
        </HotelReviewBadge>
      ),
    },
    {
      field: "requestedBy",
      headerName: "Submitted By",
      flex: 1,
      minWidth: 160,
      renderHeader: () => (
        <HotelReviewColumnHeader icon={User} label="Submitted By" />
      ),
      renderCell: (params) => (
        <HotelReviewBadge
          className="bg-slate-50 font-normal text-slate-600 ring-slate-200"
          title={params.value}
        >
          {params.value}
        </HotelReviewBadge>
      ),
    },
    {
      field: "submittedAt",
      headerName: "Submitted At",
      flex: 1,
      minWidth: 140,
      renderHeader: () => (
        <HotelReviewColumnHeader icon={Calendar} label="Submitted At" />
      ),
      renderCell: (params) => (
        <span className="whitespace-nowrap text-sm font-medium text-slate-600">
          {formatDate(params.value)}
        </span>
      ),
    },
    {
      field: "qcRemarks",
      headerName: "QC/Zonal Remark",
      flex: 1.3,
      minWidth: 220,
      sortable: false,
      renderHeader: () => (
        <HotelReviewColumnHeader icon={MessageSquare} label="QC/Zonal Remark" />
      ),
      renderCell: (params) => {
        const latest = getLatestReviewRemark(params.row);
        if (!latest) {
          return <span className="text-sm text-gray-400">—</span>;
        }
        const allRemarks = params.row.qcRemarks ?? [];
        const tone = getRemarkTone(latest);
        return (
          <div className="min-w-0 py-0.5 leading-tight">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRemarkModalData({
                  hotelName: String(params.row.hotelName || "Hotel"),
                  remarks: [...allRemarks].sort(
                    (a, b) =>
                      new Date(b.remarkedAt).getTime() -
                      new Date(a.remarkedAt).getTime(),
                  ),
                });
              }}
              className="group text-left"
              title={latest.remark}
            >
              <span
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 transition-opacity group-hover:opacity-80",
                  tone.className,
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tone.dotClass)}
                />
                <span className="truncate">{truncateRemark(latest.remark, 48)}</span>
              </span>
            </button>
            <p className="mt-1 text-[11px] text-slate-400">
              {formatDate(latest.remarkedAt)}
            </p>
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.5,
      minWidth: 80,
      sortable: false,
      filterable: false,
      align: "right",
      headerAlign: "right",
      renderHeader: () => (
        <HotelReviewColumnHeader icon={Eye} label="Actions" />
      ),
      renderCell: (params) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            persistReviewContext(activeTab as ReviewBucket, String(params.row.hotelId));
            const q = new URLSearchParams({
              draftId: String(params.row.hotelId),
              reviewTab: activeTab,
            });
            if (useReviewerReadOnlyView) q.set("readOnly", "true");
            navigate(`${ROUTES.PROPERTIES.CREATE}?${q.toString()}`, {
              state: { reviewTab: activeTab },
            });
          }}
          className="rounded-lg border border-[#2f3d95]/25 bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#2f3d95] transition-colors hover:border-[#2f3d95] hover:bg-[#2f3d95] hover:text-white"
        >
          View
        </button>
      ),
    },
  ];

  const emptyMessages: Record<
    ReviewBucket,
    { title: string; description: string }
  > = {
    pending: {
      title: "No hotels pending review",
      description: "All hotel requests have been processed",
    },
    approved: {
      title: "No approved hotels",
      description: "No hotels have been approved yet",
    },
    rejected: {
      title: "No rejected hotels",
      description: "No hotels have been rejected yet",
    },
  };

  const renderPanel = (
    hotels: (HotelReviewItem | ApprovedHotelItem | RejectedHotelItem)[],
  ) => {
    const message = emptyMessages[activeTab as ReviewBucket];

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <Loader2 className="mb-3 h-9 w-9 animate-spin text-[#2f3d95]" />
            <p className="text-sm font-medium text-gray-600">Loading hotels...</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
            <p className="mb-3 text-sm font-medium text-red-600">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
              className="text-sm"
            >
              Retry
            </Button>
          </div>
        ) : hotels.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              {message.title}
            </h3>
            <p className="max-w-sm text-sm text-gray-500">{message.description}</p>
          </div>
        ) : (
          <DataTable
            rows={hotels}
            columns={columns}
            getRowId={(row) => row.hotelId}
            rowHeight={64}
            pageSizeOptions={[10, 20, 50, 100]}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            rowCount={getCurrentTotalRows()}
            showToolbar
            fillContainer
            slots={{ toolbar: HotelReviewTableToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: false,
              },
            }}
            exportFileName={`hotel-review-${activeTab}-${new Date().toISOString().split("T")[0]}`}
            sx={hotelReviewTableGridSx}
            className="h-full rounded-none border-0 shadow-none"
          />
        )}
      </div>
    );
  };

  const currentHotels = getCurrentHotels();
  const currentTotal = getCurrentTotalRows();

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden">
      <div className="container mx-auto flex h-full min-h-0 flex-1 flex-col px-4 py-4">
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Hotel Review
            {!isLoading && (
              <span className="ml-1.5 font-bold text-gray-900">
                ({currentTotal} hotel{currentTotal !== 1 ? "s" : ""})
              </span>
            )}
          </h1>
          {currentHotels.length > 0 && !isLoading && (
            <ExportButton
              onExportCSV={handleExportCSV}
              onExportExcel={handleExportExcel}
            />
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(nextTab) => {
            persistReviewContext(nextTab as ReviewBucket);
            setActiveTab(nextTab);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
          className="flex min-h-0 flex-1 flex-col gap-3"
        >
          <TabsList className="inline-flex h-auto w-full shrink-0 flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
            {REVIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              const styles = REVIEW_TAB_STYLES[tab.value];
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                    isActive ? styles.active : styles.idle,
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? styles.iconActive : styles.iconIdle,
                    )}
                    strokeWidth={2.25}
                  />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent
            value="pending"
            className="mt-0 flex min-h-0 flex-1 flex-col"
          >
            {renderPanel(pendingHotels)}
          </TabsContent>

          <TabsContent
            value="approved"
            className="mt-0 flex min-h-0 flex-1 flex-col"
          >
            {renderPanel(approvedHotels)}
          </TabsContent>

          <TabsContent
            value="rejected"
            className="mt-0 flex min-h-0 flex-1 flex-col"
          >
            {renderPanel(rejectedHotels)}
          </TabsContent>
        </Tabs>

        {remarkModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setRemarkModalData(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b bg-linear-to-r from-gray-50 to-blue-50/60">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Review Remarks
                </h2>
                <p className="text-sm text-gray-600">
                  {remarkModalData.hotelName}
                </p>
                <p className="mt-1 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {remarkModalData.remarks.length} remark
                  {remarkModalData.remarks.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRemarkModalData(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close remarks"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div
              className="p-6 max-h-[62vh] overflow-y-scroll space-y-3"
              style={{ scrollbarGutter: "stable" }}
            >
              {remarkModalData.remarks.length === 0 ? (
                <p className="text-sm text-gray-500">No remarks found.</p>
              ) : (
                remarkModalData.remarks.map((item, idx) => (
                  <div
                    key={`${item.remarkedAt}-${idx}`}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {item.reviewerSource && (
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                          {item.reviewerSource}
                        </span>
                      )}
                      {item.reviewAction && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            item.reviewAction.includes("APPROVED")
                              ? "bg-emerald-100 text-emerald-700"
                              : item.reviewAction.includes("REJECT")
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {item.reviewAction}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-900 whitespace-pre-wrap wrap-break-word leading-relaxed">
                      {item.remark}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                      <p>
                        <span className="font-medium text-gray-700">At:</span>{" "}
                        {formatDate(item.remarkedAt)}
                      </p>
                      <p className="break-all">
                        <span className="font-medium text-gray-700">Acted By:</span>{" "}
                        {item.actedBy || "-"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

