import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface RouteProtectionProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function RouteProtection({
  children,
  requiredPermission,
}: RouteProtectionProps) {
  const { isAuthenticated, userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        navigate("/login", { state: { from: location.pathname } });
        return;
      }

      // If no specific permission required, allow access
      if (!requiredPermission) {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // Check user permissions
      if (!userId) {
        navigate("/login");
        return;
      }

      try {
        const { getUserMenuRights } = await import("@/lib/user-security-api");
        const userPermissions = await getUserMenuRights(userId);
        const permitted = userPermissions.includes(requiredPermission);

        if (!permitted) {
          // User doesn't have permission, redirect to dashboard or home
          navigate("/", { replace: true });
          return;
        }

        setHasPermission(true);
      } catch (error) {
        console.error("Error checking permissions:", error);
        // On error, deny access for security
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [isAuthenticated, userId, requiredPermission, navigate, location]);

  // Show loading spinner while checking permissions
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If permission check failed, don't render children
  if (hasPermission === false) {
    return null;
  }

  // Render children if permission check passed
  return <>{children}</>;
}

// Higher-order component for route protection
export function withRouteProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: string,
) {
  return function ProtectedComponent(props: P) {
    return (
      <RouteProtection requiredPermission={requiredPermission}>
        <Component {...props} />
      </RouteProtection>
    );
  };
}
