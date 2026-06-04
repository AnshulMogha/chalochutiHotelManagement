import { type ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks";
import { Button, LoadingSpinner } from "@/components/ui";
import { ShieldX } from "lucide-react";
import {
  hasBlockedPortalRole,
  hasNoAssignedPortalRole,
  isPortalAccessDenied,
} from "@/constants/roles";

interface ProtectedRouteProps {
  children: ReactNode;
}

function AccessDeniedScreen({
  message,
  onLogout,
}: {
  message: string;
  onLogout: () => void | Promise<void>;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <ShieldX className="w-6 h-6 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <Button type="button" variant="primary" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isUserProfileLoading, user, logout } =
    useAuth();

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

  if (isPortalAccessDenied(user?.roles)) {
    const message = hasNoAssignedPortalRole(user?.roles)
      ? "No role is assigned to your account. Please contact your administrator."
      : hasBlockedPortalRole(user?.roles)
        ? "Your role does not have access to this portal."
        : "You do not have access to this portal.";
    return (
      <AccessDeniedScreen
        message={message}
        onLogout={async () => {
          await logout();
        }}
      />
    );
  }

  return <>{children}</>;
}
