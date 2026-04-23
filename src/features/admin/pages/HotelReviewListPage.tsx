import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  adminService,
  type HotelReviewItem,
  type ApprovedHotelItem,
  type RejectedHotelItem,
  type ReviewRemark,
} from "../services/adminService";
import { Button, ExportButton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Eye, Calendar, User, Building2, X } from "lucide-react";
import { ROUTES } from "@/constants";
import { LoadingSpinner } from "@/components/ui";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { exportToCSV, exportToExcel, type ExportColumn } from "@/utils/export";
import { useAuth } from "@/hooks/useAuth";
import {
  isZonalHotelReviewerRole,
  isQcReviewerRole,
} from "@/constants/roles";

type HotelReviewFetchMode = "super_admin" | "qc" | "zonal";
type ReviewBucket = "pending" | "approved" | "rejected";
const REVIEW_CONTEXT_KEY = "hotel-review-context";

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
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
      minWidth: 200,
      renderCell: (params) => (
        <div className="flex items-center gap-3 w-full">
          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-semibold text-gray-900 truncate">
            {params.value}
          </div>
        </div>
      ),
    },
    {
      field: "hotelCity",
      headerName: "Hotel City",
      flex: 0.9,
      minWidth: 150,
      renderCell: (params) => (
        <div className="text-sm text-gray-700">{params.value || "-"}</div>
      ),
    },
    {
      field: "hotelCode",
      headerName: "Hotel Code",
      flex: 0.8,
      minWidth: 150,
      renderCell: (params) => (
        <div className="text-sm text-gray-600 font-mono">{params.value}</div>
      ),
    },
    {
      field: "requestedBy",
      headerName: "Submitted By",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <div className="flex items-center text-sm text-gray-600 min-w-0">
          <User className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <span className="truncate">{params.value}</span>
        </div>
      ),
    },
    {
      field: "submittedAt",
      headerName: "Submitted At",
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <div className="flex items-center text-sm text-gray-600 whitespace-nowrap">
          <Calendar className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <span>{formatDate(params.value)}</span>
        </div>
      ),
    },
    {
      field: "qcRemarks",
      headerName: "QC/Zonal Remark",
      flex: 1.3,
      minWidth: 260,
      sortable: false,
      renderCell: (params) => {
        const latest = getLatestReviewRemark(params.row);
        if (!latest) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        const allRemarks = params.row.qcRemarks ?? [];
        return (
          <div className="min-w-0 leading-tight py-1">
            <button
              type="button"
              onClick={() =>
                setRemarkModalData({
                  hotelName: String(params.row.hotelName || "Hotel"),
                  remarks: [...allRemarks].sort(
                    (a, b) =>
                      new Date(b.remarkedAt).getTime() -
                      new Date(a.remarkedAt).getTime(),
                  ),
                })
              }
              className="text-left text-sm text-gray-800 hover:text-blue-700 hover:underline"
              title={latest.remark}
            >
              {truncateRemark(latest.remark)}
            </button>
            <p className="text-xs text-gray-500">
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
      minWidth: 100,
      sortable: false,
      filterable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
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
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          View
        </Button>
      ),
    },
  ];

  const renderTable = (hotels: (HotelReviewItem | ApprovedHotelItem | RejectedHotelItem)[]) => {
    if (hotels.length === 0) {
      const emptyMessages = {
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
      const message = emptyMessages[activeTab as keyof typeof emptyMessages] || emptyMessages.pending;

      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-16 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">{message.title}</p>
          <p className="text-gray-500 text-sm">{message.description}</p>
        </div>
      );
    }

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
          pageSizeOptions={[10, 20, 50, 100]}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={getCurrentTotalRows()}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
              csvOptions: {
                fileName: `hotel-review-${activeTab}-${new Date().toISOString().split('T')[0]}`,
                delimiter: ',',
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
              "&.MuiDataGrid-columnHeader--sorted .MuiDataGrid-iconButtonContainer": {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const currentHotels = getCurrentHotels();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hotel Review Queue
          </h1>
          <p className="text-gray-600">
            Review and approve or reject hotel onboarding requests
          </p>
        </div>
        {currentHotels.length > 0 && (
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
        className="w-full"
      >
        <TabsList className="inline-flex w-auto mb-6">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {renderTable(pendingHotels)}
        </TabsContent>

        <TabsContent value="approved">
          {renderTable(approvedHotels)}
        </TabsContent>

        <TabsContent value="rejected">
          {renderTable(rejectedHotels)}
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
  );
}

