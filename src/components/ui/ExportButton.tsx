import { Download, FileSpreadsheet, FileText } from "lucide-react";
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
  disabled?: boolean;
  className?: string;
  /** Show only the download icon (no "Export" label). */
  iconOnly?: boolean;
}

export function ExportButton({
  onExportCSV,
  onExportExcel,
  disabled = false,
  className = "",
  iconOnly = false,
}: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          aria-label="Export"
          title="Export"
          className={`${iconOnly ? "px-2.5" : "gap-2"} ${className}`}
        >
          <Download className="w-4 h-4" />
          {iconOnly ? null : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={onExportExcel}
          disabled={disabled}
          className="flex items-center gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          <span>Export as Excel</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onExportCSV}
          disabled={disabled}
          className="flex items-center gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

