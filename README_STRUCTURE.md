# Project Structure Documentation

This document outlines the scalable folder structure designed for efficient code organization and reusability.

## 📁 Folder Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/            # Base UI components (Button, Input, Card, etc.)
│   └── layout/        # Layout components (Header, Footer, MainLayout, etc.)
│
├── features/          # Feature-based modules (self-contained)
│   ├── home/          # Home feature
│   │   ├── components/ # Feature-specific components
│   │   ├── hooks/     # Feature-specific hooks
│   │   ├── pages/     # Feature pages
│   │   └── services/  # Feature-specific services
│   ├── hotels/        # Hotels feature
│   ├── bookings/      # Bookings feature
│   └── common/        # Shared features (404, etc.)
│
├── hooks/             # Shared custom React hooks
├── services/          # API services and business logic
│   ├── api/          # API client and types
│   └── types/        # Service types
│
├── routes/            # Route configuration
├── utils/             # Utility functions
├── constants/         # App-wide constants
├── context/           # React Context providers
├── types/             # Global TypeScript types
└── lib/               # Third-party library configurations
```

## 🎯 Design Principles

### 1. **Feature-Based Organization**
Each feature is self-contained with its own:
- Components
- Hooks
- Pages
- Services
- Types

This makes it easy to:
- Find related code
- Move/remove features
- Scale independently

### 2. **Component Hierarchy**
- **UI Components** (`components/ui/`): Base, reusable components (Button, Input, Card)
- **Layout Components** (`components/layout/`): Page structure components
- **Feature Components** (`features/*/components/`): Feature-specific components

### 3. **Separation of Concerns**
- **Services**: API calls and business logic
- **Hooks**: Reusable stateful logic
- **Utils**: Pure utility functions
- **Types**: TypeScript definitions

## 📝 Usage Examples

### Adding a New Feature

1. Create feature folder:
```bash
src/features/hotels/
├── components/
│   └── HotelCard.tsx
├── hooks/
│   └── useHotels.ts
├── pages/
│   ├── HotelsListPage.tsx
│   └── HotelDetailPage.tsx
├── services/
│   └── hotelService.ts
└── types.ts
```

2. Add routes in `src/routes/index.tsx`:
```tsx
const HotelsListPage = lazy(() => import("../features/hotels/pages/HotelsListPage"));

{
  path: "hotels",
  element: <HotelsListPage />,
}
```

### Using Shared Components

```tsx
import { Button, Input, Card } from "@/components/ui";

function MyComponent() {
  return (
    <Card>
      <Input label="Name" />
      <Button variant="primary">Submit</Button>
    </Card>
  );
}
```

### Creating API Services

```tsx
// src/services/api/hotels.ts
import { apiClient } from "./client";
import { Hotel } from "./types";

export const hotelService = {
  getAll: () => apiClient.get<Hotel[]>("/hotels"),
  getById: (id: string) => apiClient.get<Hotel>(`/hotels/${id}`),
  create: (data: Partial<Hotel>) => apiClient.post<Hotel>("/hotels", data),
};
```

### Using Custom Hooks

```tsx
import { useApi } from "@/hooks";
import { hotelService } from "@/services/api/hotels";

function HotelsList() {
  const { data, loading, error } = useApi(hotelService.getAll, { immediate: true });

  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{/* Render hotels */}</div>;
}
```

## 🔄 Best Practices

1. **Import Paths**: Use absolute imports with `@/` alias (configure in `tsconfig.json`)
2. **Component Exports**: Always export from `index.ts` files for cleaner imports
3. **Type Safety**: Define types close to where they're used, share common types in `services/api/types`
4. **Lazy Loading**: Use React.lazy() for route-based code splitting
5. **Reusability**: Extract common patterns into hooks or utilities
6. **Naming**: Use PascalCase for components, camelCase for functions/hooks

## 🚀 Scaling Guidelines

- **New Features**: Create in `features/` following the established pattern
- **Shared Logic**: Move to `hooks/` or `utils/` when used by 2+ features
- **UI Components**: Add to `components/ui/` if reusable across features
- **Constants**: Add to `constants/index.ts` or create feature-specific constants
- **Types**: Keep feature types local, share common types in `services/api/types`

