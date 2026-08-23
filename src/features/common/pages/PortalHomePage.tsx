import { Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui";
import SuperAdminDashboardPage from "@/features/admin/pages/SuperAdminDashboardPage";
import {
  isAuditorRole,
  isFinanceManagerRole,
  isHelpdeskAgentRole,
  isHotelBdRole,
  isSalesManagerRole,
} from "@/constants/roles";
import { ROUTES } from "@/constants";

export default function PortalHomePage() {
  const { user, isUserProfileLoading } = useAuth();

  if (isUserProfileLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isHelpdeskAgentRole(user?.roles)) {
    return <Navigate to={ROUTES.HELPDESK.TICKETS} replace />;
  }

  if (isAuditorRole(user?.roles)) {
    return <Navigate to={ROUTES.REPORTS.HOTEL_BOOKING_FINANCIAL_MIS} replace />;
  }

  if (isFinanceManagerRole(user?.roles)) {
    return <Navigate to={ROUTES.SETTLEMENT.WORKBENCH} replace />;
  }

  if (isHotelBdRole(user?.roles)) {
    return <Navigate to={ROUTES.REPORTS.HOTEL_BD_DASHBOARD} replace />;
  }

  if (isSalesManagerRole(user?.roles)) {
    return <Navigate to={ROUTES.REPORTS.SALES_MANAGER_DASHBOARD} replace />;
  }

  return <SuperAdminDashboardPage />;
}
