# Code Refactoring Guide

This document outlines the refactoring changes made to improve code scalability and readability.

## 🎯 Refactoring Goals

1. **Eliminate Code Duplication** - Extract common patterns into reusable components
2. **Improve Maintainability** - Centralize constants and utilities
3. **Better Type Safety** - Create shared types and interfaces
4. **Role-Based Architecture** - Prepare for role-based UI features
5. **Consistent Styling** - Unified table and component styling

## 📁 New Structure

### 1. Reusable Components

#### `src/components/ui/DataTable.tsx`
- **Purpose**: Wrapper component for Material-UI DataGrid with consistent styling
- **Features**:
  - Pre-configured theme color (#2f3d95)
  - Auto-height based on content
  - Built-in toolbar with export options
  - Consistent header, row, and cell styling
  - No horizontal scrollbar

**Usage:**
```tsx
import { DataTable } from "@/components/ui";

<DataTable
  rows={data}
  columns={columns}
  getRowId={(row) => row.id}
  showToolbar={true}
  exportFileName="users"
/>
```

#### `src/components/ui/badges/`
- **StatusBadge**: Reusable status indicator component
- **RoleBadge**: Reusable role display component

**Usage:**
```tsx
import { StatusBadge, RoleBadge } from "@/components/ui";

<StatusBadge status="ACTIVE" />
<RoleBadge roles={["HOTEL_OWNER"]} />
```

### 2. Constants & Utilities

#### `src/constants/roles.ts`
- Centralized role definitions
- Role labels and colors
- Permission checking utilities

**Features:**
- `ROLES` - Role constants
- `ROLE_LABELS` - Human-readable labels
- `ROLE_COLORS` - Color schemes for badges
- `hasRole()` - Check if user has specific role
- `isSuperAdmin()` - Check if user is super admin
- `hasAnyRole()` - Check if user has any of specified roles

#### `src/constants/status.ts`
- Account status definitions
- Status labels and configurations
- Status badge styling

### 3. Custom Hooks

#### `src/hooks/useTableExport.ts`
- Reusable export functionality for tables
- Handles CSV and Excel exports

**Usage:**
```tsx
import { useTableExport } from "@/hooks";

const { handleExportCSV, handleExportExcel } = useTableExport(
  users,
  exportColumns,
  { fileName: "users" }
);
```

## 🔄 Migration Guide

### Before (Old Pattern):
```tsx
// Duplicated DataGrid styling in every page
<Box sx={{ height: 600, ... }}>
  <DataGrid
    sx={{
      // 100+ lines of styling
    }}
  />
</Box>
```

### After (New Pattern):
```tsx
// Clean, reusable component
<DataTable
  rows={data}
  columns={columns}
  getRowId={(row) => row.id}
/>
```

### Before (Old Pattern):
```tsx
// Inline role checking
const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;
```

### After (New Pattern):
```tsx
import { isSuperAdmin } from "@/constants/roles";

const isAdmin = isSuperAdmin(user?.roles);
```

## 📋 Next Steps

1. **Refactor Existing Pages** - Update all pages to use new components
2. **Extract Common Column Definitions** - Create column builders
3. **Create Shared Types** - Centralize common interfaces
4. **Add Role-Based Routing** - Implement permission-based navigation
5. **Create Page Layout Components** - Standardize page headers and layouts

## 🎨 Benefits

1. **Reduced Code Duplication**: ~200 lines of styling code removed per table
2. **Easier Maintenance**: Theme changes in one place
3. **Better Type Safety**: Centralized types and constants
4. **Scalability**: Easy to add new roles and permissions
5. **Consistency**: All tables look and behave the same

## 📝 Files Created

- `src/components/ui/DataTable.tsx` - Reusable table component
- `src/components/ui/badges/StatusBadge.tsx` - Status badge component
- `src/components/ui/badges/RoleBadge.tsx` - Role badge component
- `src/constants/roles.ts` - Role constants and utilities
- `src/constants/status.ts` - Status constants
- `src/hooks/useTableExport.ts` - Export hook

## 🔧 Files to Refactor

- `src/features/admin/pages/UsersPage.tsx`
- `src/features/admin/pages/HotelReviewListPage.tsx`
- `src/features/properties/pages/MyPropertiesPage.tsx`
- `src/features/properties/components/steps/RoomsSteps/RoomList.tsx`
- `src/components/layout/Sidebar.tsx` - Use role constants

