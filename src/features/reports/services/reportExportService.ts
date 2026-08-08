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

function normalizeExportStatus(value: unknown): ExportJobStatus {
  const normalized = String(value || "QUEUED")
    .trim()
    .toUpperCase();
  if (normalized === "COMPLETED" || normalized === "DONE" || normalized === "SUCCESS") {
    return "COMPLETED";
  }
  if (normalized === "FAILED" || normalized === "ERROR" || normalized === "CANCELLED") {
    return "FAILED";
  }
  if (
    normalized === "RUNNING" ||
    normalized === "PROCESSING" ||
    normalized === "IN_PROGRESS"
  ) {
    return "RUNNING";
  }
  return "QUEUED";
}

function normalizeExportJob(
  payload: Partial<ExportJobPayload & { jobId?: string | number }>,
): ExportJobPayload {
  return {
    jobId: payload.jobId != null ? String(payload.jobId) : "",
    status: normalizeExportStatus(payload.status),
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

/**
 * Poll export job status every `intervalMs` (default 5s).
 * Stops immediately on FAILED. Aborts after `maxWaitMs` (default 1 min)
 * while still QUEUED / RUNNING (processing).
 */
export async function pollReportExportJob(
  statusUrl: string,
  onStatus?: (status: ExportJobStatus) => void,
  options?: { intervalMs?: number; maxWaitMs?: number },
): Promise<ExportJobPayload> {
  const intervalMs = options?.intervalMs ?? 5000;
  const maxWaitMs = options?.maxWaitMs ?? 60_000;
  const startedAt = Date.now();

  while (true) {
    const response = await apiClient.get<
      ApiSuccessResponse<ExportJobPayload> | ExportJobPayload
    >(statusUrl);
    const job = normalizeExportJob(unwrapPayload(response));
    onStatus?.(job.status);

    if (job.status === "COMPLETED") return job;
    if (job.status === "FAILED") {
      throw new Error(job.errorMessage || "Export failed");
    }

    if (Date.now() - startedAt >= maxWaitMs) {
      throw new Error("Export timed out after 1 minute. Please try again.");
    }

    await sleep(intervalMs);
  }
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

  if (started.status === "FAILED") {
    throw new Error(started.errorMessage || "Export failed");
  }

  const completed =
    started.status === "COMPLETED"
      ? started
      : await pollReportExportJob(
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
