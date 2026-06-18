// src/routes/AdminRoutes.tsx
// atau tambahkan ke routes/index.tsx

import { lazy, Suspense } from "react";

// Lazy load admin components
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const CatalogListAdmin = lazy(() => import("@/pages/admin/CatalogListAdmin"));
const CatalogFormAdmin = lazy(() => import("@/pages/admin/CatalogFormAdmin"));

// Loading fallback
const LoadingPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <p className="text-muted-foreground">Loading...</p>
  </div>
);

// Protected route wrapper (check auth)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // TODO: Check if user is authenticated and has admin role
  return <>{children}</>;
};

export const adminRoutes = [
  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingPage />}>
          <AdminDashboard />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // Catalogs
  {
    path: "/admin/catalogs",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingPage />}>
          <CatalogListAdmin />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // Create new catalog
  {
    path: "/admin/catalogs/create",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingPage />}>
          <CatalogFormAdmin />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // Edit existing catalog
  {
    path: "/admin/catalogs/:id/edit",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingPage />}>
          <CatalogFormAdmin />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // TODO: Add more admin routes as needed:
  // - /admin/items (CRUD for items)
  // - /admin/projects (CRUD for projects)
  // - /admin/users (manage users & permissions)
  // - /admin/analytics (view stats & analytics)
];

// Usage in main routes file:
/*
import { createBrowserRouter } from "react-router-dom";
import { adminRoutes } from "@/routes/AdminRoutes";

const router = createBrowserRouter([
  // Public routes
  { path: "/", element: <HomePage /> },
  { path: "/catalog/:category", element: <CatalogPage /> },
  { path: "/catalog/:category/:slug", element: <CatalogDetail /> },
  
  // Admin routes
  ...adminRoutes,

  // 404
  { path: "*", element: <NotFound /> },
]);

export default router;
*/