import { DataGrid, type DataGridProps, GridToolbar } from "@mui/x-data-grid";
import { Box } from "@mui/material";

export interface DataTableProps extends Omit<DataGridProps, "sx"> {
  className?: string;
  showToolbar?: boolean;
  exportFileName?: string;
}

const THEME_COLOR = "#2f3d95";

const defaultSx = {
  border: "none",
  borderRadius: "12px",
  "& .MuiDataGrid-root": {
    border: "none",
  },
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: `${THEME_COLOR} !important`,
    color: "white !important",
    fontSize: "0.875rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    minHeight: "56px !important",
    "& .MuiDataGrid-columnHeaderTitleContainer": {
      backgroundColor: `${THEME_COLOR} !important`,
    },
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
    backgroundColor: `${THEME_COLOR} !important`,
    color: "white !important",
    display: "flex",
    alignItems: "center",
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
    backgroundColor: `${THEME_COLOR} !important`,
  },
  "& .MuiDataGrid-columnHeaders .MuiDataGrid-filler": {
    backgroundColor: `${THEME_COLOR} !important`,
  },
};

export function DataTable({
  className = "",
  showToolbar = true,
  exportFileName,
  slots,
  slotProps,
  ...props
}: DataTableProps) {
  const defaultSlots = showToolbar
    ? {
        toolbar: GridToolbar,
        ...slots,
      }
    : slots;

  const defaultSlotProps = showToolbar
    ? {
        toolbar: {
          showQuickFilter: true,
          quickFilterProps: { debounceMs: 500 },
          csvOptions: {
            fileName: exportFileName || `export-${new Date().toISOString().split("T")[0]}`,
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
          ...slotProps?.toolbar,
        },
        ...slotProps,
      }
    : slotProps;

  return (
    <Box
      sx={{
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
      }}
      className={`bg-white border border-gray-200 shadow-md ${className}`}
    >
      <DataGrid
        {...props}
        autoHeight
        slots={defaultSlots}
        slotProps={defaultSlotProps}
        sx={defaultSx}
      />
    </Box>
  );
}

