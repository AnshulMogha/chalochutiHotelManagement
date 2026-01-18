import { Suspense, useState, useEffect } from "react";
import { Outlet } from "react-router";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { LoadingSpinner } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function MainLayout() {
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Topbar onSidebarToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
        <main
          className={cn(
            "flex-1 overflow-y-auto bg-gray-50 transition-all duration-300",
            isSidebarOpen ? "lg:ml-[calc(16rem+1.5rem)]" : "lg:ml-[calc(5rem+1.5rem)]"
          )}
        >
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
