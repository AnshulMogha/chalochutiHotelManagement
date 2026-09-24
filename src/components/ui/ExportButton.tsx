import { Download, FileSpreadsheet, FileText, FileType, Loader2 } from "lucide-react";
import { Button } from "./Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface ExportButtonProps {
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF?: () => void;
  disabled?: boolean;
  className?: string;
  /** Show only the download icon (no "Export" label). */
  iconOnly?: boolean;
  /** When true, shows a spinner and disables the menu. */
  exporting?: boolean;
  exportingLabel?: string;
}

export function ExportButton({
  onExportCSV,
  onExportExcel,
  onExportPDF,
  disabled = false,
  className = "",
  iconOnly = false,
  exporting = false,
  exportingLabel = "Exporting…",
}: ExportButtonProps) {
  const isDisabled = disabled || exporting;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isDisabled}
          aria-label={exporting ? exportingLabel : "Export"}
          title={exporting ? exportingLabel : "Export"}
          className={`${iconOnly ? "px-2.5" : "gap-2"} ${className}`}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {iconOnly ? null : exporting ? exportingLabel : "Export"}
        </Button>
      </DropdownMenuTrigger>
      {!exporting ? (
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={onExportExcel}
            disabled={isDisabled}
            className="flex cursor-pointer items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            <span>Export as Excel</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onExportCSV}
            disabled={isDisabled}
            className="flex cursor-pointer items-center gap-2"
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Export as CSV</span>
          </DropdownMenuItem>
          {onExportPDF ? (
            <DropdownMenuItem
              onClick={onExportPDF}
              disabled={isDisabled}
              className="flex cursor-pointer items-center gap-2"
            >
              <FileType className="h-4 w-4 text-rose-600" />
              <span>Export as PDF</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}
