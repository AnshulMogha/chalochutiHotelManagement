import { Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui";
import SuperAdminDashboardPage from "@/features/admin/pages/SuperAdminDashboardPage";
import { isHotelBdRole } from "@/constants/roles";
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

  if (isHotelBdRole(user?.roles)) {
    return <Navigate to={ROUTES.REPORTS.HOTEL_BD_DASHBOARD} replace />;
  }

  return <SuperAdminDashboardPage />;
}
