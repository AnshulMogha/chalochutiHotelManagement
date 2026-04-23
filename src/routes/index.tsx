import { createBrowserRouter, type RouteObject } from "react-router";
import { lazy, type ComponentType } from "react";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { PublicRoute } from "./auth/PublicRoute";
import { BasicInfoStep } from "@/features/properties/components/steps/BasicInfoStep";
import {
  AmenitiesStep,
  DocumentsStep,
  FinanceAndLegalStep,
  LocationStep,
  PhotosAndVideosStep,
  PoliciesStep,
  RoomsPage,
} from "@/features/properties/components/steps";
import Layout from "@/features/inventory/Layout";
import RouteErrorPage from "@/features/common/pages/RouteErrorPage";

function lazyWithChunkRetry<TModule extends { default: ComponentType<unknown> }>(
  importer: () => Promise<TModule>,
) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      const err = error as Error;
      const shouldRetry =
        typeof window !== "undefined" &&
        /Failed to fetch dynamically imported module|Importing a module script failed/i.test(
          err?.message || "",
        );
      const retryKey = "chunk-reload-attempted";
      if (shouldRetry && !sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, "1");
        window.location.reload();
      }
      throw error;
    }
  });
}

// Lazy load layouts
const MainLayout = lazy(() => import("../components/layout/MainLayout"));
const AuthLayout = lazy(() => import("../components/layout/AuthLayout"));

// Lazy load pages
const HomePage = lazy(() => import("../features/home/pages/HomePage"));
const MyPropertiesPage = lazy(
  () => import("../features/properties/pages/MyPropertiesPage"),
);
const PortalHomePage = lazy(
  () => import("../features/common/pages/PortalHomePage"),
);
const SuperAdminDashboardPage = lazy(
  () => import("../features/admin/pages/SuperAdminDashboardPage"),
);
const CreatePropertyPage = lazy(
  () => import("../features/properties/pages/CreatePropertyPage"),
);
const NotFoundPage = lazy(
  () => import("../features/common/pages/NotFoundPage"),
);

// Lazy load auth pages
const OtpVerificationPage = lazy(
  () => import("../features/auth/pages/OtpVerificationPage"),
);
const SuperAdminLoginPage = lazy(
  () => import("../features/auth/pages/SuperAdminLoginPage"),
);
const ForgotPasswordPage = lazy(
  () => import("../features/auth/pages/ForgotPasswordPage"),
);
const ForgotPasswordOtpPage = lazy(
  () => import("../features/auth/pages/ForgotPasswordOtpPage"),
);
const ResetPasswordPage = lazy(
  () => import("../features/auth/pages/ResetPasswordPage"),
);
const ChangePasswordPage = lazy(
  () => import("../features/auth/pages/ChangePasswordPage"),
);

// Lazy load admin pages
const HotelReviewListPage = lazyWithChunkRetry(
  () => import("../features/admin/pages/HotelReviewListPage"),
);
const HotelReviewDetailPage = lazyWithChunkRetry(
  () => import("../features/admin/pages/HotelReviewDetailPage"),
);
const UsersPage = lazy(() => import("../features/admin/pages/UsersPage"));
const UserFormPage = lazy(() => import("../features/admin/pages/UserFormPage"));
const UserDetailsPage = lazy(
  () => import("../features/admin/pages/UserDetailsPage"),
);
const UserHotelAssignmentsPage = lazy(
  () => import("../features/admin/pages/UserHotelAssignmentsPage"),
);
const BasicInformationPage = lazy(
  () => import("../features/properties/pages/BasicInformationPage"),
);
const RoomsAndRatePlansPage = lazy(
  () => import("../features/properties/pages/RoomsAndRatePlansPage"),
);
const BulkUpdateRatesPage = lazy(
  () => import("../features/inventory/pages/BulkUpdateRatesPage"),
);
const BulkUpdateRestrictionsPage = lazy(
  () => import("../features/inventory/pages/BulkUpdateRestrictionsPage"),
);
const BulkUpdateInventoryPage = lazy(
  () => import("../features/inventory/pages/BulkUpdateInventoryPage"),
);
const AddSingleDerivedRatePage = lazy(
  () => import("../features/inventory/pages/AddSingleDerivedRatePage"),
);
const PhotosAndVideosPage = lazy(
  () => import("../features/properties/pages/PhotosAndVideosPage"),
);
const AmenitiesAndRestaurantsPage = lazy(
  () => import("../features/properties/pages/AmenitiesAndRestaurantsPage"),
);
const PolicyAndRulesPage = lazy(
  () => import("../features/properties/pages/PolicyAndRulesPage"),
);
const FinancePage = lazy(
  () => import("../features/properties/pages/FinancePage"),
);
const DocumentPage = lazy(
  () => import("../features/properties/pages/DocumentPage"),
);
const MyTeamPage = lazy(() => import("../features/team/pages/MyTeamPage"));
const PromotionsPage = lazy(
  () => import("../features/promotions/pages/PromotionsPage"),
);
const CreatePromotionPage = lazy(
  () => import("../features/promotions/pages/CreatePromotionPage"),
);
const EditPromotionPage = lazy(
  () => import("../features/promotions/pages/EditPromotionPage"),
);
const SpecialAudiencePromotionsPage = lazy(
  () => import("../features/promotions/pages/SpecialAudiencePromotionsPage"),
);
const CommissionAndTaxPage = lazy(
  () => import("../features/admin/pages/CommissionAndTaxPage"),
);
const DocumentReviewPage = lazy(
  () => import("../features/admin/pages/DocumentReviewPage"),
);
const TravelPartnersPage = lazy(
  () => import("../features/admin/pages/TravelPartnersPage"),
);
const PricingQuotePage = lazy(
  () => import("../features/pricing/pages/PricingQuotePage"),
);
const BookingListPage = lazy(
  () => import("../features/bookings/pages/BookingListPage"),
);
const BookingDetailPage = lazy(
  () => import("../features/bookings/pages/BookingDetailPage"),
);
const MyProfilePage = lazy(
  () => import("../features/user/pages/MyProfilePage"),
);

// Route configuration

export const routes: RouteObject[] = [
  {
    path: "/",
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <PortalHomePage />,
      },
      {
        path: "qc/dashboard",
        element: <SuperAdminDashboardPage />,
      },
      {
        path: "home",
        element: <HomePage />,
      },
      {
        path: "my-property",
        element: <MyPropertiesPage />,
      },
      {
        path: "properties/hotel",
        element: <CreatePropertyPage />,
        children: [
          // {
          //   index: true,
          //   element: <Navigate to="basic-info" />,
          // },
          {
            path: "basic_info",
            element: <BasicInfoStep />,
          },
          {
            path: "location",
            element: <LocationStep />,
          },
          {
            path: "amenities",
            element: <AmenitiesStep />,
          },
          {
            path: "rooms",
            element: <RoomsPage />,
          },
          {
            path: "media",
            element: <PhotosAndVideosStep />,
          },
          {
            path: "policies",
            element: <PoliciesStep />,
          },
          {
            path: "documents",
            element: <DocumentsStep />,
          },
          {
            path: "finance",
            element: <FinanceAndLegalStep />,
          },
        ],
      },
      {
        path: "admin/hotels/review",
        element: <HotelReviewListPage />,
      },
      {
        path: "admin/users/:userId/hotels",
        element: <UserHotelAssignmentsPage />,
      },
      {
        path: "admin/users/create",
        element: <UserFormPage />,
      },
      {
        path: "admin/users/:userId/edit",
        element: <UserFormPage />,
      },
      {
        path: "admin/users/:userId",
        element: <UserDetailsPage />,
      },
      {
        path: "admin/users",
        element: <UsersPage />,
      },
      {
        path: "admin/commission-tax",
        element: <CommissionAndTaxPage />,
      },
      {
        path: "admin/document-review",
        element: <DocumentReviewPage />,
      },
      {
        path: "admin/travel-partners",
        element: <TravelPartnersPage />,
      },
      {
        path: "admin/hotels/review/:hotelId",
        element: <HotelReviewDetailPage />,
        children: [
          {
            path: "basic_info",
            element: <BasicInfoStep />,
          },
          {
            path: "location",
            element: <LocationStep />,
          },
          {
            path: "amenities",
            element: <AmenitiesStep />,
          },
          {
            path: "rooms",
            element: <RoomsPage />,
          },
          {
            path: "media",
            element: <PhotosAndVideosStep />,
          },
          {
            path: "policies",
            element: <PoliciesStep />,
          },
          {
            path: "documents",
            element: <DocumentsStep />,
          },
          {
            path: "finance",
            element: <FinanceAndLegalStep />,
          },
        ],
      },
      {
        path: "property/information/basic-info",
        element: <BasicInformationPage />,
      },
      {
        path: "property/information/rooms-rateplans",
        element: <RoomsAndRatePlansPage />,
      },
      {
        path: "property/information/photos-videos",
        element: <PhotosAndVideosPage />,
      },
      {
        path: "property/information/amenities-restaurants",
        element: <AmenitiesAndRestaurantsPage />,
      },
      {
        path: "property/information/policy-rules",
        element: <PolicyAndRulesPage />,
      },
      {
        path: "property/information/finance",
        element: <FinancePage />,
      },
      {
        path: "property/information/document",
        element: <DocumentPage />,
      },
      {
        path: "inventory/room-types",
        element: <Layout />,
      },
      {
        path: "inventory/rate-plans",
        element: <Layout />,
      },
      {
        path: "hotel/rates/add-single-derived",
        element: <AddSingleDerivedRatePage />,
      },
      {
        path: "inventory/bulk-update",
        element: <BulkUpdateInventoryPage />,
      },
      {
        path: "rates/bulk-update",
        element: <BulkUpdateRatesPage />,
      },
      {
        path: "restrictions/bulk-update",
        element: <BulkUpdateRestrictionsPage />,
      },
      {
        path: "team/users/:userId/hotels",
        element: <UserHotelAssignmentsPage />,
      },
      {
        path: "team",
        element: <MyTeamPage />,
      },
      {
        path: "promotions",
        element: <PromotionsPage />,
      },
      {
        path: "promotions/edit/:promotionId",
        element: <EditPromotionPage />,
      },
      {
        path: "promotions/create/:type",
        element: <CreatePromotionPage />,
      },
      {
        path: "promotions/special-audience",
        element: <SpecialAudiencePromotionsPage />,
      },
      {
        path: "promotions/special-audience/create/:type",
        element: <CreatePromotionPage />,
      },
      {
        path: "bookings",
        element: <BookingListPage />,
      },
      {
        path: "bookings/:id",
        element: <BookingDetailPage />,
      },
      {
        path: "profile",
        element: <MyProfilePage />,
      },
    ],
  },
  {
    path: "/auth",
    errorElement: <RouteErrorPage />,
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: (
          <PublicRoute>
            <SuperAdminLoginPage />
          </PublicRoute>
        ),
      },
      {
        path: "verify-otp",
        element: (
          <PublicRoute>
            <OtpVerificationPage />
          </PublicRoute>
        ),
      },
      {
        path: "change-password",
        element: (
          <PublicRoute>
            <ChangePasswordPage />
          </PublicRoute>
        ),
      },
      {
        path: "forgot-password",
        element: (
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        ),
      },
      {
        path: "forgot-password/verify-otp",
        element: (
          <PublicRoute>
            <ForgotPasswordOtpPage />
          </PublicRoute>
        ),
      },
      {
        path: "forgot-password/reset",
        element: (
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        ),
      },
    ],
  },
  {
    path: "/pricing/quote",
    errorElement: <RouteErrorPage />,
    element: <PricingQuotePage />,
  },
  {
    path: "*",
    errorElement: <RouteErrorPage />,
    element: <NotFoundPage />,
  },
];

// Create router instance
const rawBasename = import.meta.env.BASE_URL;
// Vite's BASE_URL often includes a trailing slash (e.g. "/chalochutti/").
// React Router's basename works best without it to avoid "//" when navigating
// to absolute paths like "/auth/login".
const basename = rawBasename === "/" ? "/" : rawBasename.replace(/\/+$/, "");

export const router = createBrowserRouter(routes, {
  basename,
});
