import { type ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks";
import { Button, LoadingSpinner } from "@/components/ui";
import { ShieldX } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isUserProfileLoading, user, logout } =
    useAuth();
  const ACCESS_DENIED_ROLES = [
    "PACKAGE_CREATOR",
    "PACKAGE_BD",
    "SALES_MANAGER",
    "TRANSPORT_BD",
  ];
  const isBlockedPortalRole = !!user?.roles?.some((role) =>
    ACCESS_DENIED_ROLES.includes(role),
  );

  if (isLoading || (isAuthenticated && isUserProfileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (isBlockedPortalRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldX className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            Your role does not have access to this portal.
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={async () => {
              await logout();
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
