import { isRouteErrorResponse, useRouteError, useNavigate } from "react-router";
import { Button } from "@/components/ui";

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || "Something went wrong while loading this page.";
  }
  if (error instanceof Error) {
    return error.message || "Something went wrong while loading this page.";
  }
  return "Something went wrong while loading this page.";
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message = getErrorMessage(error);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Unable to open page</h1>
        <p className="mt-3 text-sm text-gray-600">
          The page failed to load. This can happen after a new deployment when browser
          cache still points to an older JS chunk.
        </p>
        <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 break-words">
          {message}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" variant="primary" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/", { replace: true })}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
