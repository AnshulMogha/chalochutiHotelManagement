import { apiClient } from "@/services/api/client";
import type { ApiSuccessResponse } from "@/services/api/types";

export type ExportJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export type ReportExportFormat = "EXCEL" | "CSV" | "PDF";

export interface ExportJobPayload {
  jobId: string;
  status: ExportJobStatus;
  fileName?: string | null;
  errorMessage?: string | null;
  message?: string | null;
}

function unwrapPayload<T>(response: ApiSuccessResponse<T> | T): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as ApiSuccessResponse<T>).status === "SUCCESS"
  ) {
    return (response as ApiSuccessResponse<T>).data as T;
  }
  return response as T;
}

function normalizeExportJob(
  payload: Partial<ExportJobPayload & { jobId?: string | number }>,
): ExportJobPayload {
  return {
    jobId: payload.jobId != null ? String(payload.jobId) : "",
    status: payload.status ?? "QUEUED",
    fileName: payload.fileName ?? null,
    errorMessage: payload.errorMessage ?? payload.message ?? null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function extensionForFormat(format: ReportExportFormat): string {
  if (format === "PDF") return "pdf";
  if (format === "CSV") return "csv";
  return "xlsx";
}

export async function downloadReportExportFile(
  downloadUrl: string,
  fileName: string,
): Promise<void> {
  const blob = await apiClient.get<Blob>(downloadUrl, {
    responseType: "blob",
  });
  triggerBlobDownload(blob, fileName);
}

export async function pollReportExportJob(
  statusUrl: string,
  onStatus?: (status: ExportJobStatus) => void,
  options?: { intervalMs?: number; maxAttempts?: number },
): Promise<ExportJobPayload> {
  const intervalMs = options?.intervalMs ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 45;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await apiClient.get<
      ApiSuccessResponse<ExportJobPayload> | ExportJobPayload
    >(statusUrl);
    const job = normalizeExportJob(unwrapPayload(response));
    onStatus?.(job.status);

    if (job.status === "COMPLETED") return job;
    if (job.status === "FAILED") {
      throw new Error(job.errorMessage || "Export failed");
    }

    await sleep(intervalMs);
  }

  throw new Error("Export timed out. Please try again.");
}

export async function runReportExportJob(options: {
  startUrl: string;
  statusUrl: (jobId: string) => string;
  downloadUrl: (jobId: string) => string;
  defaultFileName: string;
  format: ReportExportFormat;
  onStatus?: (status: ExportJobStatus) => void;
}): Promise<void> {
  const startResponse = await apiClient.post<
    ApiSuccessResponse<ExportJobPayload> | ExportJobPayload
  >(options.startUrl);
  const started = normalizeExportJob(unwrapPayload(startResponse));
  if (!started.jobId) {
    throw new Error("Export job id missing from response");
  }

  options.onStatus?.(started.status);

  const completed = await pollReportExportJob(
    options.statusUrl(started.jobId),
    options.onStatus,
  );

  const fileName =
    completed.fileName?.trim() ||
    `${options.defaultFileName}.${extensionForFormat(options.format)}`;

  await downloadReportExportFile(
    options.downloadUrl(started.jobId),
    fileName,
  );
}
