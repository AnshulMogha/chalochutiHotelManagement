import { createBrowserRouter, type RouteObject } from "react-router";
import { lazy } from "react";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { PublicRoute } from "./auth/PublicRoute";
import { BasicInfoStep } from "@/features/properties/components/steps/BasicInfoStep";
import {
  AmenitiesStep,
  FinanceAndLegalStep,
  LocationStep,
  PhotosAndVideosStep,
  PoliciesStep,
  RoomsPage,
} from "@/features/properties/components/steps";

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
            path: "finance",
            element: <FinanceAndLegalStep />,
          },
        ],
      },
      {
        path: "property/information/basic-info",
        element: <BasicInformationPage />,
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
    path: "*",
    element: <NotFoundPage />,
  },
];

// Create router instance
export const router = createBrowserRouter(routes);
