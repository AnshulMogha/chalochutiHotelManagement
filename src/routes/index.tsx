import { createBrowserRouter, type RouteObject } from "react-router";
import { lazy } from "react";
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

// Lazy load layouts
const MainLayout = lazy(() => import("../components/layout/MainLayout"));
const AuthLayout = lazy(() => import("../components/layout/AuthLayout"));

// Lazy load pages
const HomePage = lazy(() => import("../features/home/pages/HomePage"));
const MyPropertiesPage = lazy(
  () => import("../features/properties/pages/MyPropertiesPage")
);
const CreatePropertyPage = lazy(
  () => import("../features/properties/pages/CreatePropertyPage")
);
const NotFoundPage = lazy(
  () => import("../features/common/pages/NotFoundPage")
);

// Lazy load auth pages
const EmailEntryPage = lazy(
  () => import("../features/auth/pages/EmailEntryPage")
);
const OtpVerificationPage = lazy(
  () => import("../features/auth/pages/OtpVerificationPage")
);
const SuperAdminLoginPage = lazy(
  () => import("../features/auth/pages/SuperAdminLoginPage")
);

// Lazy load admin pages
const HotelReviewListPage = lazy(
  () => import("../features/admin/pages/HotelReviewListPage")
);
const HotelReviewDetailPage = lazy(
  () => import("../features/admin/pages/HotelReviewDetailPage")
);
const UsersPage = lazy(() => import("../features/admin/pages/UsersPage"));
const BasicInformationPage = lazy(
  () => import("../features/properties/pages/BasicInformationPage")
);
const RoomsAndRatePlansPage = lazy(
  () => import("../features/properties/pages/RoomsAndRatePlansPage")
);
const BulkUpdateRatesPage = lazy(
  () => import("../features/inventory/pages/BulkUpdateRatesPage")
);
const BulkUpdateRestrictionsPage = lazy(
  () => import("../features/inventory/pages/BulkUpdateRestrictionsPage")
);
const PhotosAndVideosPage = lazy(
  () => import("../features/properties/pages/PhotosAndVideosPage")
);
const AmenitiesAndRestaurantsPage = lazy(
  () => import("../features/properties/pages/AmenitiesAndRestaurantsPage")
);
const PolicyAndRulesPage = lazy(
  () => import("../features/properties/pages/PolicyAndRulesPage")
);
const FinancePage = lazy(
  () => import("../features/properties/pages/FinancePage")
);
const DocumentPage = lazy(
  () => import("../features/properties/pages/DocumentPage")
);
const MyTeamPage = lazy(
  () => import("../features/team/pages/MyTeamPage")
);
const PromotionsPage = lazy(
  () => import("../features/promotions/pages/PromotionsPage")
);
const CreatePromotionPage = lazy(
  () => import("../features/promotions/pages/CreatePromotionPage")
);
const EditPromotionPage = lazy(
  () => import("../features/promotions/pages/EditPromotionPage")
);
const SpecialAudiencePromotionsPage = lazy(
  () => import("../features/promotions/pages/SpecialAudiencePromotionsPage")
);
const CommissionAndTaxPage = lazy(
  () => import("../features/admin/pages/CommissionAndTaxPage")
);
const DocumentReviewPage = lazy(
  () => import("../features/admin/pages/DocumentReviewPage")
);
const PricingQuotePage = lazy(
  () => import("../features/pricing/pages/PricingQuotePage")
);

// Route configuration

export const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <MyPropertiesPage />,
      },
      {
        path: "home",
        element: <HomePage />,
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
        element: <Layout/>,
      },
      {
        path: "inventory/rate-plans",
        element: <Layout/>,
      },
      {
        path: "rates/bulk-update",
        element: <BulkUpdateRatesPage/>,
      },
      {
        path: "restrictions/bulk-update",
        element: <BulkUpdateRestrictionsPage />,
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
    ],
  },
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: (
          <PublicRoute>
            <EmailEntryPage />
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
        path: "super-admin/login",
        element: (
          <PublicRoute>
            <SuperAdminLoginPage />
          </PublicRoute>
        ),
      },
    ],
  },
  {
    path: "/pricing/quote",
    element: <PricingQuotePage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

// Create router instance
const rawBasename = import.meta.env.BASE_URL;
// Vite's BASE_URL often includes a trailing slash (e.g. "/chalochutti/").
// React Router's basename works best without it to avoid "//" when navigating
// to absolute paths like "/auth/login".
const basename =
  rawBasename === "/" ? "/" : rawBasename.replace(/\/+$/, "");

export const router = createBrowserRouter(routes, {
  basename,
});
