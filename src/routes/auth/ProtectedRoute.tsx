import { type ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks";
import { LoadingSpinner } from "@/components/ui";
import { isSuperAdmin } from "@/constants/roles";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={isSuperAdmin(user?.roles) ? "/auth/super-admin/login" : "/auth/login"}
        replace
      />
    );
  }

  return <>{children}</>;
}
