import { FileSpreadsheet, FileText, FileType } from "lucide-react";
import { ToolbarMenu, type ToolbarMenuItem } from "./reportToolbar";

interface ExportButtonProps {
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF?: () => void;
  disabled?: boolean;
  className?: string;
  /** Kept so existing callers stay valid. The control is always the icon button. */
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
  iconOnly: _iconOnly = false,
  exporting = false,
  exportingLabel = "Exporting…",
}: ExportButtonProps) {
  void _iconOnly;
  const items: ToolbarMenuItem[] = [
    {
      id: "excel",
      label: "Excel",
      icon: FileSpreadsheet,
      onClick: onExportExcel,
    },
    {
      id: "csv",
      label: "CSV",
      icon: FileText,
      onClick: onExportCSV,
    },
  ];
  if (onExportPDF) {
    items.push({
      id: "pdf",
      label: "PDF",
      icon: FileType,
      onClick: onExportPDF,
    });
  }

  return (
    <ToolbarMenu
      tooltip={exporting ? exportingLabel : "Download"}
      busy={exporting}
      disabled={disabled}
      items={items}
      className={className}
    />
  );
}
