import { Suspense, useState, useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { LoadingSpinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks";
import { canViewPath } from "@/lib/permissions";

export default function MainLayout() {
  const { user } = useAuth();
  const location = useLocation();
  // Default: sidebar open on desktop, closed on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // On desktop, keep sidebar state as is
      } else {
        // On mobile, close sidebar
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  if (!canViewPath(user, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      <div
        className={cn(
          "flex h-screen min-w-0 flex-col transition-[margin] duration-300",
          isSidebarOpen ? "lg:ml-64" : "lg:ml-20",
        )}
      >
        <Topbar onSidebarToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center">
                <LoadingSpinner />
              </div>
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
