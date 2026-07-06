import {
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarDensitySelector,
  GridToolbarColumnsButton,
} from "@mui/x-data-grid";

export function BookingTableToolbar() {
  return (
    <GridToolbarContainer
      sx={{
        gap: 0.75,
        minHeight: 44,
        px: 1.5,
        py: 0.75,
        background: "linear-gradient(to right, #f8fafc, #eef2ff)",
        borderBottom: "1px solid #e2e8f0",
        "& .MuiButton-root": {
          textTransform: "none",
          fontSize: "0.75rem",
          fontWeight: 600,
          minHeight: 32,
          borderRadius: "8px",
          color: "#334155",
          border: "1px solid #e2e8f0",
          backgroundColor: "#fff",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          px: 1.25,
          "&:hover": {
            backgroundColor: "#f8fafc",
            borderColor: "#c7d2fe",
            color: "#2f3d95",
          },
        },
        "& .MuiButton-startIcon": {
          color: "#2f3d95",
        },
      }}
    >
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
}
