# 📁 Project Structure Quick Reference

## Complete Folder Structure

```
src/
├── 📂 components/          # Reusable UI Components
│   ├── 📂 ui/             # Base UI Components
│   │   ├── Button.tsx     ✅ Reusable button with variants
│   │   ├── Input.tsx      ✅ Form input with validation
│   │   ├── Card.tsx       ✅ Card component with variants
│   │   ├── LoadingSpinner.tsx ✅ Loading indicator
│   │   └── index.ts       ✅ Barrel export
│   │
│   └── 📂 layout/         # Layout Components
│       ├── MainLayout.tsx  ✅ Main app layout
│       ├── AuthLayout.tsx  ✅ Auth pages layout
│       ├── Header.tsx      ✅ App header
│       └── Footer.tsx      ✅ App footer
│
├── 📂 features/           # Feature-Based Modules
│   ├── 📂 home/          # Home Feature
│   │   └── 📂 pages/
│   │       └── HomePage.tsx
│   │
│   ├── 📂 hotels/        # Hotels Feature (Example)
│   │   ├── 📂 components/
│   │   │   └── HotelCard.tsx
│   │   ├── 📂 hooks/
│   │   │   └── useHotels.ts
│   │   ├── 📂 services/
│   │   │   └── hotelService.ts
│   │   └── types.ts
│   │
│   └── 📂 common/         # Shared Features
│       └── 📂 pages/
│           └── NotFoundPage.tsx
│
├── 📂 hooks/              # Shared Custom Hooks
│   ├── useApi.ts         ✅ API call hook
│   └── index.ts          ✅ Barrel export
│
├── 📂 services/           # API & Business Logic
│   └── 📂 api/
│       ├── client.ts      ✅ API client with error handling
│       └── 📂 types/
│           └── index.ts   ✅ Common API types
│
├── 📂 routes/             # Route Configuration
│   └── index.tsx         ✅ Router setup with lazy loading
│
├── 📂 utils/              # Utility Functions
│   ├── format.ts         ✅ Date, currency, phone formatting
│   ├── validation.ts     ✅ Validation helpers
│   └── index.ts          ✅ Barrel export
│
├── 📂 constants/          # App Constants
│   └── index.ts          ✅ Routes, API endpoints, etc.
│
├── 📂 context/            # React Context (for future state management)
│
├── 📂 lib/                # Third-party Configurations
│   └── utils.ts          ✅ Tailwind merge utility
│
├── App.tsx                ✅ Main app component
└── main.tsx               ✅ Entry point
```

## 🎯 Key Features

### ✅ **Reusability**
- All UI components are in `components/ui/` and exported via `index.ts`
- Shared hooks in `hooks/` directory
- Utility functions organized by purpose

### ✅ **Scalability**
- Feature-based organization makes it easy to add new features
- Each feature is self-contained (components, hooks, services, types)
- Clear separation of concerns

### ✅ **Maintainability**
- Consistent naming conventions
- TypeScript types close to usage
- Barrel exports for clean imports
- Path aliases (`@/`) for absolute imports

### ✅ **Performance**
- Lazy loading for routes
- Code splitting by feature
- Suspense boundaries for loading states

## 🚀 How to Add a New Feature

1. Create feature directory:
```bash
src/features/bookings/
├── components/
├── hooks/
├── pages/
├── services/
└── types.ts
```

2. Add route in `src/routes/index.tsx`:
```tsx
const BookingsPage = lazy(() => import("@/features/bookings/pages/BookingsPage"));

{
  path: "bookings",
  element: <BookingsPage />,
}
```

3. Create service in `src/features/bookings/services/bookingService.ts`

4. Create hooks in `src/features/bookings/hooks/useBookings.ts`

5. Create components in `src/features/bookings/components/`

## 📦 Import Examples

```tsx
// UI Components
import { Button, Input, Card } from "@/components/ui";

// Layout Components
import { Header, Footer } from "@/components/layout";

// Hooks
import { useApi } from "@/hooks";

// Utils
import { formatDate, formatCurrency } from "@/utils";
import { isValidEmail } from "@/utils/validation";

// Constants
import { ROUTES, API_ENDPOINTS } from "@/constants";

// Services
import { apiClient } from "@/services/api/client";

// Feature-specific
import { HotelCard } from "@/features/hotels/components/HotelCard";
import { useHotels } from "@/features/hotels/hooks/useHotels";
```

## 🔧 Configuration

- **Path Alias**: `@/` → `./src/` (configured in `tsconfig.json` and `vite.config.ts`)
- **TypeScript**: Strict mode enabled
- **Routing**: React Router v7 with data router
- **Styling**: Tailwind CSS v4

## 📝 Best Practices

1. ✅ Always export components from `index.ts` files
2. ✅ Use TypeScript for type safety
3. ✅ Keep feature code self-contained
4. ✅ Use absolute imports with `@/` alias
5. ✅ Lazy load routes for code splitting
6. ✅ Extract reusable logic into hooks
7. ✅ Use the API client for all HTTP requests
8. ✅ Define types close to where they're used

