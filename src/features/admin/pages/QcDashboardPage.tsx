import { Navigate, useNavigate } from "react-router";
import { ClipboardCheck, LayoutDashboard } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from "@/components/ui";
import { ROUTES } from "@/constants";
import { isReviewerPortalRole } from "@/constants/roles";
import { useAuth } from "@/hooks/useAuth";

export default function QcDashboardPage() {
  const navigate = useNavigate();
  const { user, isUserProfileLoading } = useAuth();

  if (isUserProfileLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isReviewerPortalRole(user?.roles)) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2f3d95] text-white shadow-md">
          <LayoutDashboard className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            QC dashboard
          </h1>
          <p className="mt-1 text-gray-600">
            Review submitted hotels and approve or reject them from the final
            step of each application.
          </p>
        </div>
      </div>

      <Card variant="outlined" className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-gray-50/80">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Hotel review queue
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4 text-sm text-gray-600">
            Open the hotel review queue to see pending, approved, and rejected
            submissions for your role.
          </p>
          <Button
            type="button"
            variant="primary"
            className="gap-2"
            onClick={() => navigate(ROUTES.ADMIN.HOTEL_REVIEW)}
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden />
            Go to hotel review
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
