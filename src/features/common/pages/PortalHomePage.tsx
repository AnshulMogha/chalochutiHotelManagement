import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui";
import SuperAdminDashboardPage from "@/features/admin/pages/SuperAdminDashboardPage";

export default function PortalHomePage() {
  const { user, isUserProfileLoading } = useAuth();

  if (isUserProfileLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <SuperAdminDashboardPage />;
}
