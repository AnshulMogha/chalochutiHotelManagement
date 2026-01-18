import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { adminService, type HotelReviewItem, type ApprovedHotelItem, type RejectedHotelItem } from "../services/adminService";
import { Button, ExportButton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Eye, Calendar, User, Building2 } from "lucide-react";
import { ROUTES } from "@/constants";
import { LoadingSpinner } from "@/components/ui";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { exportToCSV, exportToExcel, type ExportColumn } from "@/utils/export";

export default function HotelReviewListPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingHotels, setPendingHotels] = useState<HotelReviewItem[]>([]);
  const [approvedHotels, setApprovedHotels] = useState<ApprovedHotelItem[]>([]);
  const [rejectedHotels, setRejectedHotels] = useState<RejectedHotelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllHotels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [pending, approved, rejected] = await Promise.all([
          adminService.getHotelsForReview(),
          adminService.getApprovedHotels(),
          adminService.getRejectedHotels(),
        ]);
        setPendingHotels(pending);
        setApprovedHotels(approved);
        setRejectedHotels(rejected);
      } catch (err) {
        setError("Failed to load hotels");
        console.error("Error fetching hotels:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllHotels();
  }, []);

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

  const handleExportCSV = () => {
    const hotels = getCurrentHotels();
    const exportColumns: ExportColumn[] = [
      { field: "hotelName", headerName: "Hotel Name" },
      { field: "hotelCode", headerName: "Hotel Code" },
      { field: "requestedBy", headerName: "Submitted By" },
      {
        field: "submittedAt",
        headerName: "Submitted At",
        valueGetter: (row) => formatDate(row.submittedAt),
      },
    ];
    exportToCSV(hotels, exportColumns, `hotel-review-${activeTab}-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    const hotels = getCurrentHotels();
    const exportColumns: ExportColumn[] = [
      { field: "hotelName", headerName: "Hotel Name" },
      { field: "hotelCode", headerName: "Hotel Code" },
      { field: "requestedBy", headerName: "Submitted By" },
      {
        field: "submittedAt",
        headerName: "Submitted At",
        valueGetter: (row) => formatDate(row.submittedAt),
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
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-semibold text-gray-900 truncate">
            {params.value}
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
          <User className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
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
          <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span>{formatDate(params.value)}</span>
        </div>
      ),
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
          onClick={() =>
            navigate(
              `${ROUTES.PROPERTIES.CREATE}?draftId=${params.row.hotelId}`
            )
          }
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
          pageSizeOptions={[5, 10, 20, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
    </div>
  );
}

