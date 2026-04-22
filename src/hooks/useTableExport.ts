import { useCallback } from "react";
import { exportToCSV, exportToExcel, type ExportColumn } from "@/utils/export";

interface UseTableExportOptions {
  fileName: string;
}

export function useTableExport<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  options: UseTableExportOptions
) {
  const handleExportCSV = useCallback(() => {
    exportToCSV(data, columns, options.fileName);
  }, [data, columns, options.fileName]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(data, columns, options.fileName);
  }, [data, columns, options.fileName]);

  return {
    handleExportCSV,
    handleExportExcel,
  };
}

