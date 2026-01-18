import { Link } from "react-router";
import { Button } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">
        Page Not Found
      </h2>
      <p className="text-gray-600 mb-8">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}

