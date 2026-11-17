import { useEffect } from "react";
import { ROUTES } from "@/constants";

/** Sends Package Finance MIS to the package portal report. */
export default function PackageFinanceMisRedirect() {
  useEffect(() => {
    window.location.replace(ROUTES.ADMIN.PACKAGE_BOOKING_FINANCIAL_MIS);
  }, []);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
      Opening Package Finance MIS…
    </div>
  );
}
