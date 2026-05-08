import { Link, useLocation } from "react-router";
import { ROUTES } from "@/constants";
import { ArrowLeft, Clock3, Rocket, Sparkles } from "lucide-react";

const TITLE_BY_PATH: Record<string, string> = {
  [ROUTES.MORE.LIST]: "More",
  [ROUTES.ANALYTICS.DASHBOARD]: "Analytics",
  [ROUTES.RATINGS_REVIEWS.LIST]: "Ratings & Reviews",
};

export default function ComingSoonPage() {
  const location = useLocation();
  const sectionTitle = TITLE_BY_PATH[location.pathname] || "This section";

  return (
    <div className="relative min-h-[72vh] overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-cyan-100/50 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-3xl">
        <div className="rounded-3xl border border-white/70 bg-white/90 p-7 shadow-[0_20px_60px_rgba(2,6,23,0.08)] backdrop-blur sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
            <Rocket className="h-8 w-8" />
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              PRODUCT UPDATE
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {sectionTitle} is coming soon
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
              We are building this section right now. You will get a faster,
              cleaner experience here very soon.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
              <Clock3 className="h-4 w-4 text-blue-600" />
              Under active development
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Release in upcoming updates
            </div>
          </div>

          <div className="mt-9 flex items-center justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
