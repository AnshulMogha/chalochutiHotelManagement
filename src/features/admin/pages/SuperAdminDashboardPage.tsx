import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { canViewModule } from "@/lib/permissions";
import { hasAnyRole, ROLES } from "@/constants";
import { isReviewerPortalRole, isZonalManagerSalesRole } from "@/constants/roles";
import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Handshake,
  Hotel,
  Info,
  LayoutDashboard,
  Megaphone,
  Users,
} from "lucide-react";

const DASHBOARD_LINKS = [
  {
    title: "Hotel Review",
    description: "Review and approve hotel onboarding requests.",
    path: ROUTES.ADMIN.HOTEL_REVIEW,
    icon: ClipboardCheck,
    color: "from-blue-500 to-indigo-600",
    key: "HOTEL_REVIEW",
  },
  {
    title: "Users",
    description: "Create and manage user accounts and permissions.",
    path: ROUTES.ADMIN.USERS,
    icon: Users,
    color: "from-violet-500 to-purple-600",
    key: "USERS",
  },
  {
    title: "Commission & Tax",
    description: "Configure commission slabs, taxes, and service fees.",
    path: ROUTES.ADMIN.COMMISSION_AND_TAX,
    icon: CreditCard,
    color: "from-emerald-500 to-green-600",
    key: "COMMISSION_TAX",
  },
  {
    title: "Document Review",
    description: "Verify and moderate uploaded finance documents.",
    path: ROUTES.ADMIN.DOCUMENT_REVIEW,
    icon: FileText,
    color: "from-amber-500 to-orange-600",
    key: "DOCUMENT_REVIEW",
  },
  {
    title: "Travel Partners",
    description: "Track and manage travel partner onboarding.",
    path: ROUTES.ADMIN.TRAVEL_PARTNERS,
    icon: Handshake,
    color: "from-cyan-500 to-sky-600",
    key: "TRAVEL_PARTNERS",
  },
  {
    title: "My Properties",
    description: "View and manage all your assigned properties.",
    path: ROUTES.PROPERTIES.MY_PROPERTY,
    icon: Hotel,
    color: "from-blue-500 to-indigo-600",
    key: "MY_PROPERTIES",
  },
  {
    title: "Basic Information",
    description: "Update property profile and primary details.",
    path: ROUTES.PROPERTY_INFO.BASIC_INFO,
    icon: Info,
    color: "from-teal-500 to-emerald-600",
    key: "PROPERTY_BASIC_INFO",
  },
  {
    title: "Rooms & Rate Plans",
    description: "Manage room configurations and rate plans.",
    path: ROUTES.PROPERTY_INFO.ROOMS_RATEPLANS,
    icon: Building2,
    color: "from-violet-500 to-purple-600",
    key: "PROPERTY_ROOMS_RATEPLANS",
  },
  {
    title: "Photos and Videos",
    description: "Maintain hotel and room media assets.",
    path: ROUTES.PROPERTY_INFO.PHOTOS_VIDEOS,
    icon: Info,
    color: "from-cyan-500 to-sky-600",
    key: "PROPERTY_PHOTOS_VIDEOS",
  },
  {
    title: "Amenities and Restaurants",
    description: "Maintain amenities and food service details.",
    path: ROUTES.PROPERTY_INFO.AMENITIES_RESTAURANTS,
    icon: Info,
    color: "from-emerald-500 to-green-600",
    key: "PROPERTY_AMENITIES_RESTAURANTS",
  },
  {
    title: "Policy and Rules",
    description: "Configure property policies and payment rules.",
    path: ROUTES.PROPERTY_INFO.POLICY_RULES,
    icon: FileText,
    color: "from-amber-500 to-orange-600",
    key: "PROPERTY_POLICY_RULES",
  },
  {
    title: "Finance",
    description: "Manage financial and legal details.",
    path: ROUTES.PROPERTY_INFO.FINANCE,
    icon: CreditCard,
    color: "from-emerald-500 to-green-600",
    key: "PROPERTY_FINANCE",
  },
  {
    title: "Rate & Inventory",
    description: "Manage room inventory and rate plans.",
    path: ROUTES.ROOM_INVENTORY.LIST,
    icon: BarChart3,
    color: "from-rose-500 to-pink-600",
    key: "RATES_INVENTORY",
  },
  {
    title: "Bookings",
    description: "Access booking list and booking details.",
    path: ROUTES.BOOKINGS.LIST,
    icon: BookOpen,
    color: "from-fuchsia-500 to-purple-600",
    key: "BOOKINGS",
  },
  {
    title: "Promotions",
    description: "Create and monitor campaign promotions.",
    path: ROUTES.PROMOTIONS.LIST,
    icon: Megaphone,
    color: "from-indigo-500 to-blue-600",
    key: "OFFERS",
  },
  {
    title: "My Team",
    description: "Manage your hotel team and access.",
    path: ROUTES.TEAM.LIST,
    icon: Users,
    color: "from-slate-500 to-gray-700",
    key: "MY_TEAM",
  },
  {
    title: "Analytics",
    description: "View insights and platform-level performance trends.",
    path: ROUTES.ANALYTICS.DASHBOARD,
    icon: LayoutDashboard,
    color: "from-slate-600 to-gray-700",
    key: "ANALYTICS",
  },
];

export default function SuperAdminDashboardPage() {
  const { user } = useAuth();
  const userRoles = user?.roles;
  const isSuperAdmin = hasAnyRole(userRoles, [ROLES.SUPER_ADMIN]);
  const isReviewer = isReviewerPortalRole(userRoles);
  const isOnboardingReviewer = !!userRoles?.includes("ONBOARDING_REVIEWER");
  const isZonalSales = isZonalManagerSalesRole(userRoles);

  const visibleCards = DASHBOARD_LINKS.filter((item) => {
    if (isSuperAdmin) return true;
    if (isZonalSales) return item.key === "TRAVEL_PARTNERS";
    if (isReviewer) return item.key === "HOTEL_REVIEW";
    if (isOnboardingReviewer) {
      return item.key === "HOTEL_REVIEW" || item.key === "DOCUMENT_REVIEW";
    }

    if (
      [
        "HOTEL_REVIEW",
        "USERS",
        "COMMISSION_TAX",
        "DOCUMENT_REVIEW",
        "TRAVEL_PARTNERS",
      ].includes(item.key)
    ) {
      return false;
    }

    if (item.key === "MY_PROPERTIES") return true;
    return canViewModule(user, item.key as Parameters<typeof canViewModule>[1]);
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Quick access to all major sections based on your role.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.path}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-linear-to-br ${item.color} text-white flex items-center justify-center mb-4`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                {item.title}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
