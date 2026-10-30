import { Link } from "react-router";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { canViewModule } from "@/lib/permissions";
import { hasAnyRole, ROLES } from "@/constants";
import {
  isReviewerPortalRole,
  isSalesManagerRole,
  canViewHotelBdPipeline,
  canViewHotelBdReports,
  isZonalManagerSalesRole,
} from "@/constants/roles";
import {
  BarChart3,
  BedDouble,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileText,
  Handshake,
  Hotel,
  Image as ImageIcon,
  IndianRupee,
  Info,
  Percent,
  Sparkles,
  UserRoundCog,
  GitBranch,
  LayoutDashboard,
  Users,
  UtensilsCrossed,
} from "lucide-react";

const DASHBOARD_LINKS = [
  {
    title: "Dashboard",
    path: ROUTES.REPORTS.HOTEL_BD_DASHBOARD,
    icon: LayoutDashboard,
    color: "from-blue-500 to-indigo-600",
    key: "HOTEL_BD_DASHBOARD",
  },
  {
    title: "Onboarding Pipeline",
    path: ROUTES.REPORTS.HOTEL_BD_PIPELINE,
    icon: GitBranch,
    color: "from-violet-500 to-purple-600",
    key: "HOTEL_BD_PIPELINE",
  },
  {
    title: "Hotel Review",
    path: ROUTES.ADMIN.HOTEL_REVIEW,
    icon: ClipboardCheck,
    color: "from-blue-500 to-indigo-600",
    key: "HOTEL_REVIEW",
  },
  {
    title: "Users",
    path: ROUTES.ADMIN.USERS,
    icon: Users,
    color: "from-violet-500 to-purple-600",
    key: "USERS",
  },
  {
    title: "Commission & Tax",
    path: ROUTES.ADMIN.COMMISSION_AND_TAX,
    icon: Percent,
    color: "from-emerald-500 to-green-600",
    key: "COMMISSION_TAX",
  },
  // {
  //   title: "Document Review",
  //   path: ROUTES.ADMIN.DOCUMENT_REVIEW,
  //   icon: FileText,
  //   color: "from-amber-500 to-orange-600",
  //   key: "DOCUMENT_REVIEW",
  // },
  {
    title: "Travel Partners",
    path: ROUTES.ADMIN.TRAVEL_PARTNERS,
    icon: Handshake,
    color: "from-cyan-500 to-sky-600",
    key: "TRAVEL_PARTNERS",
  },
  {
    title: "Agents",
    path: ROUTES.AGENTS.LIST,
    icon: UserRoundCog,
    color: "from-emerald-500 to-teal-600",
    key: "AGENTS",
  },
  {
    title: "My Properties",
    path: ROUTES.PROPERTIES.MY_PROPERTY,
    icon: Hotel,
    color: "from-blue-500 to-indigo-600",
    key: "MY_PROPERTIES",
  },
  {
    title: "Basic Information",
    path: ROUTES.PROPERTY_INFO.BASIC_INFO,
    icon: Info,
    color: "from-teal-500 to-emerald-600",
    key: "PROPERTY_BASIC_INFO",
  },
  {
    title: "Rooms & Rate Plans",
    path: ROUTES.PROPERTY_INFO.ROOMS_RATEPLANS,
    icon: BedDouble,
    color: "from-violet-500 to-purple-600",
    key: "PROPERTY_ROOMS_RATEPLANS",
  },
  {
    title: "Photos and Videos",
    path: ROUTES.PROPERTY_INFO.PHOTOS_VIDEOS,
    icon: ImageIcon,
    color: "from-cyan-500 to-sky-600",
    key: "PROPERTY_PHOTOS_VIDEOS",
  },
  {
    title: "Amenities",
    path: ROUTES.PROPERTY_INFO.AMENITIES_RESTAURANTS,
    icon: UtensilsCrossed,
    color: "from-emerald-500 to-green-600",
    key: "PROPERTY_AMENITIES_RESTAURANTS",
  },
  {
    title: "Policy and Rules",
    path: ROUTES.PROPERTY_INFO.POLICY_RULES,
    icon: FileText,
    color: "from-amber-500 to-orange-600",
    key: "PROPERTY_POLICY_RULES",
  },
  {
    title: "Finance",
    path: ROUTES.PROPERTY_INFO.FINANCE,
    icon: CreditCard,
    color: "from-emerald-500 to-green-600",
    key: "PROPERTY_FINANCE",
  },
  {
    title: "Rate & Inventory",
    path: ROUTES.ROOM_INVENTORY.LIST,
    icon: IndianRupee,
    color: "from-rose-500 to-pink-600",
    key: "RATES_INVENTORY",
  },
  {
    title: "Bookings",
    path: ROUTES.BOOKINGS.LIST,
    icon: BookOpen,
    color: "from-fuchsia-500 to-purple-600",
    key: "BOOKINGS",
  },
  {
    title: "Promotions",
    path: ROUTES.PROMOTIONS.LIST,
    icon: Sparkles,
    color: "from-indigo-500 to-blue-600",
    key: "OFFERS",
  },
  {
    title: "My Team",
    path: ROUTES.TEAM.LIST,
    icon: Users,
    color: "from-slate-500 to-gray-700",
    key: "MY_TEAM",
  },
  {
    title: "Analytics",
    path: ROUTES.ANALYTICS.DASHBOARD,
    icon: BarChart3,
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
  const isSalesManager = isSalesManagerRole(userRoles);

  const visibleCards = DASHBOARD_LINKS.filter((item) => {
    // Hotel BD users are redirected to the portfolio dashboard.
    if (item.key === "HOTEL_BD_DASHBOARD") {
      return canViewHotelBdReports(userRoles);
    }
    if (item.key === "HOTEL_BD_PIPELINE") {
      return canViewHotelBdPipeline(userRoles);
    }
    if (isSuperAdmin) {
      return item.key !== "AGENTS" && item.key !== "MY_TEAM";
    }
    if (isZonalSales) return item.key === "TRAVEL_PARTNERS";
    if (isSalesManager) return item.key === "AGENTS";
    if (isReviewer) {
      return (
        item.key === "HOTEL_REVIEW" ||
        item.key === "HOTEL_BD_DASHBOARD" ||
        item.key === "HOTEL_BD_PIPELINE"
      );
    }
    if (isOnboardingReviewer) {
      return item.key === "HOTEL_REVIEW";
      // || item.key === "DOCUMENT_REVIEW";
    }

    if (
      [
        "HOTEL_REVIEW",
        "USERS",
        "COMMISSION_TAX",
        "DOCUMENT_REVIEW",
        "TRAVEL_PARTNERS",
        "AGENTS",
      ].includes(item.key)
    ) {
      return false;
    }

    if (item.key === "MY_PROPERTIES") return true;
    return canViewModule(user, item.key as Parameters<typeof canViewModule>[1]);
  });

  return (
    <div className="container mx-auto px-4 py-5">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.path}
              className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br ${item.color} text-white`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="min-w-0 truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                {item.title}
              </h2>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
