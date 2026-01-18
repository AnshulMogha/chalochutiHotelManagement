import { useNavigate } from "react-router";
import { Button, ExportButton } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { Plus, Edit, Building2, Calendar, CheckCircle, Clock, User, AlertCircle } from "lucide-react";
import { ROUTES } from "@/constants";
import type { HotelList, HotelStatus } from "../types";
import { propertyService } from "../services/propertyService";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DataGrid, GridColDef, GridToolbar, GridToolbarExport, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { exportToCSV, exportToExcel, type ExportColumn } from "@/utils/export";

// Mock data - replace with actual API calls

const statusConfig: Record<HotelStatus, { label: string; className: string; icon: React.ReactNode }> = {
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

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function MyPropertiesPage() {
  const navigate = useNavigate();

  const [activeHotels, setActiveHotels] = useState<HotelList[]>([]);
  const [inProcessHotels, setInProcessHotels] = useState<HotelList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("active");

  const handleAddProperty = async () => {
    const response = await propertyService.generateDraftHotel();
    navigate(`${ROUTES.PROPERTIES.CREATE}?draftId=${response.hotelId}`);
  };

  useEffect(() => {
    async function fetchProperties() {
      try {
        setIsLoading(true);
        const response = await propertyService.getAllHotels();
       
        const activeHotels = response.filter(
          (hotel) => hotel.status === "LIVE"
        );
        const inProcessHotels = response.filter(
          (hotel) => hotel.status !== "LIVE"
        );
        const activeHotelsList = activeHotels.map((hotel) => ({
          hotelId: hotel.hotelId,
          hotelCode: hotel.hotelCode,
          hotelName: hotel.hotelName,
          status: hotel.status as HotelStatus,
          currentStep: hotel.currentStep,
          locked: hotel.locked,
          submittedAt: hotel.submittedAt,
          requestedByEmail: hotel.requestedByEmail,
          rejectionReason: hotel.rejectionReason,
        }));
        const inProcessHotelsList = inProcessHotels.map((hotel) => ({
          hotelId: hotel.hotelId,
          hotelCode: hotel.hotelCode,
          hotelName: hotel.hotelName,
          status: hotel.status as HotelStatus,
          currentStep: hotel.currentStep,
          locked: hotel.locked,
          submittedAt: hotel.submittedAt,
          requestedByEmail: hotel.requestedByEmail,
          rejectionReason: hotel.rejectionReason,
        }));
        setActiveHotels(activeHotelsList);
        setInProcessHotels(inProcessHotelsList);
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProperties();
  }, []);
  const handleExportCSV = (hotels: HotelList[], isActiveTab: boolean) => {
    const exportColumns: ExportColumn[] = [
      { field: "hotelName", headerName: "Hotel Name" },
      { field: "hotelCode", headerName: "Hotel Code" },
      { field: "status", headerName: "Status" },
      ...(!isActiveTab
        ? [{ field: "currentStep", headerName: "Current Step", valueGetter: (row) => formatStep(row.currentStep) }]
        : []),
      {
        field: "submittedAt",
        headerName: "Submitted At",
        valueGetter: (row) => formatDate(row.submittedAt),
      },
      { field: "requestedByEmail", headerName: "Requested By" },
      ...(!isActiveTab
        ? [{ field: "rejectionReason", headerName: "Rejection Reason" }]
        : []),
    ];
    const filename = isActiveTab
      ? `active-hotels-${new Date().toISOString().split('T')[0]}`
      : `in-process-hotels-${new Date().toISOString().split('T')[0]}`;
    exportToCSV(hotels, exportColumns, filename);
  };

  const handleExportExcel = (hotels: HotelList[], isActiveTab: boolean) => {
    const exportColumns: ExportColumn[] = [
      { field: "hotelName", headerName: "Hotel Name" },
      { field: "hotelCode", headerName: "Hotel Code" },
      { field: "status", headerName: "Status" },
      ...(!isActiveTab
        ? [{ field: "currentStep", headerName: "Current Step", valueGetter: (row) => formatStep(row.currentStep) }]
        : []),
      {
        field: "submittedAt",
        headerName: "Submitted At",
        valueGetter: (row) => formatDate(row.submittedAt),
      },
      { field: "requestedByEmail", headerName: "Requested By" },
      ...(!isActiveTab
        ? [{ field: "rejectionReason", headerName: "Rejection Reason" }]
        : []),
    ];
    const filename = isActiveTab
      ? `active-hotels-${new Date().toISOString().split('T')[0]}`
      : `in-process-hotels-${new Date().toISOString().split('T')[0]}`;
    exportToExcel(hotels, exportColumns, filename);
  };

  const renderTable = (hotels: HotelList[], isActiveTab: boolean = false) => {
    if (hotels.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-16 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">
            No properties found
          </p>
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
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
        field: "status",
        headerName: "Status",
        flex: 0.7,
        minWidth: 120,
        renderCell: (params) => {
          const statusInfo = statusConfig[params.value || "DRAFT"];
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap",
                statusInfo.className
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
              <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
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
              <User className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
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
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-700 line-clamp-2 break-words">
                      {params.value}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                ),
            } as GridColDef,
            {
              field: "actions",
              headerName: "Actions",
              width: 120,
              flex: 0,
              sortable: false,
              filterable: false,
              align: "right",
              headerAlign: "right",
              renderCell: (params) =>
                !params.row.locked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(ROUTES.PROPERTIES.EDIT(params.row.hotelId))
                    }
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                ) : null,
            } as GridColDef,
          ]
        : []),
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
                fileName: `hotels-${new Date().toISOString().split('T')[0]}`,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Properties
          </h1>
          <p className="text-gray-600">
            Manage your property listings and information
          </p>
        </div>
        <Button
          onClick={handleAddProperty}
          variant="primary"
          className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Property</span>
        </Button>
      </div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between gap-4 mb-6">
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
          </TabsList>

          {/* Export Buttons - Show based on active tab */}
          {activeTab === "active" && activeHotels.length > 0 && (
            <ExportButton
              onExportCSV={() => handleExportCSV(activeHotels, true)}
              onExportExcel={() => handleExportExcel(activeHotels, true)}
            />
          )}

          {activeTab === "inprocess" && inProcessHotels.length > 0 && (
            <ExportButton
              onExportCSV={() => handleExportCSV(inProcessHotels, false)}
              onExportExcel={() => handleExportExcel(inProcessHotels, false)}
            />
          )}
        </div>

        {/* Active Properties Tab */}
        <TabsContent value="active" className="mt-0">
          {renderTable(activeHotels, true)}
        </TabsContent>

        {/* In Process Properties Tab */}
        <TabsContent value="inprocess" className="mt-0">
          {renderTable(inProcessHotels, false)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
