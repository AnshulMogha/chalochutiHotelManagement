import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Hotel Onboard
        </h1>
        <p className="text-gray-600">
          Manage your hotel bookings efficiently
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Hotels</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage your hotel listings and information</p>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p>View and manage all bookings</p>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Track your performance and insights</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

