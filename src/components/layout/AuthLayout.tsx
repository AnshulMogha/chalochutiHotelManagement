import { Suspense } from "react";
import { Outlet } from "react-router";
import { LoadingSpinner } from "@/components/ui";

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient circles */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        ></div>
        
        {/* Decorative dots */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full opacity-30"></div>
        <div className="absolute top-40 right-32 w-3 h-3 bg-purple-400 rounded-full opacity-30"></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-indigo-400 rounded-full opacity-30"></div>
        <div className="absolute bottom-20 right-20 w-3 h-3 bg-blue-400 rounded-full opacity-30"></div>
      </div>

      {/* Content */}
      <div className="relative w-full max-w-md z-10">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </div>

    </div>
  );
}

