import {
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
} from "@mui/x-data-grid";

export function DataTableToolbar({
  showExport = true,
  showQuickFilter: _showQuickFilter,
  csvOptions,
  printOptions,
}: {
  showExport?: boolean;
  showQuickFilter?: boolean;
  csvOptions?: {
    fileName?: string;
    delimiter?: string;
    utf8WithBom?: boolean;
  };
  printOptions?: { disableToolbarButton?: boolean };
}) {
  return (
    <GridToolbarContainer className="gap-1! border-b border-slate-100 px-3! py-1.5!">
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      {showExport ? (
        <GridToolbarExport
          csvOptions={csvOptions}
          printOptions={printOptions}
        />
      ) : null}
    </GridToolbarContainer>
  );
}
