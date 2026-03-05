import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RouteProtection } from "@/components/RouteProtection";
import { ROUTE_PERMISSIONS } from "@/utils/route-permissions";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import FastTag from "@/pages/FastTag";
import Settings from "@/pages/Settings";
import UserMaster from "@/pages/UserMaster";
import AccessMaster from "@/pages/AccessMaster";
import NotFound from "@/pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";
import Home from "@/pages/Home";
import FastTagHistory from "@/pages/FastTagHistory";
import FastTagUpload from "@/pages/FastTagUpload";
import FastTagReports from "@/pages/FastTagReports";
import ManageSubscription from "@/pages/ManageSubscription";

const queryClient = new QueryClient();

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <RouteProtection requiredPermission={ROUTE_PERMISSIONS["/"]}>
              <Home />
            </RouteProtection>
          ) : (
            <PublicRoute>
              <Login />
            </PublicRoute>
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          <RouteProtection requiredPermission={ROUTE_PERMISSIONS["/"]}>
            <Home />
          </RouteProtection>
        }
      />
      <Route
        path="/fast-tag"
        element={
          <RouteProtection requiredPermission={ROUTE_PERMISSIONS["/fast-tag"]}>
            <FastTag />
          </RouteProtection>
        }
      />
      <Route
        path="/user-master"
        element={
          <RouteProtection
            requiredPermission={ROUTE_PERMISSIONS["/user-master"]}
          >
            <UserMaster />
          </RouteProtection>
        }
      />
      <Route
        path="/access-master"
        element={
          <RouteProtection
            requiredPermission={ROUTE_PERMISSIONS["/access-master"]}
          >
            <AccessMaster />
          </RouteProtection>
        }
      />
      <Route
        path="/settings"
        element={
          <RouteProtection requiredPermission={ROUTE_PERMISSIONS["/settings"]}>
            <Settings />
          </RouteProtection>
        }
      />
      <Route
        path="/fast-tag-upload"
        element={
          <RouteProtection
            requiredPermission={ROUTE_PERMISSIONS["/fast-tag-upload"]}
          >
            <FastTagUpload />
          </RouteProtection>
        }
      />
      <Route
        path="/fast-tag-history"
        element={
          <RouteProtection
            requiredPermission={ROUTE_PERMISSIONS["/fast-tag-history"]}
          >
            <FastTagHistory />
          </RouteProtection>
        }
      />
      <Route
        path="/fast-tag-reports"
        element={
          <RouteProtection
            requiredPermission={ROUTE_PERMISSIONS["/fast-tag-reports"]}
          >
            <FastTagReports />
          </RouteProtection>
        }
      />
      <Route
        path="/manage-subscription"
        element={
          <RouteProtection
            requiredPermission={ROUTE_PERMISSIONS["/manage-subscription"]}
          >
            <ManageSubscription />
          </RouteProtection>
        }
      />
      <Route
        path="/rc-verification"
        element={
          <RouteProtection
            requiredPermission={ROUTE_PERMISSIONS["/rc-verification"]}
          >
            <Index />
          </RouteProtection>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
