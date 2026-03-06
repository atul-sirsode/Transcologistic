// Route permission mapping
export const ROUTE_PERMISSIONS = {
  "/rc-verification": "rc-verification",
  "/fast-tag": "fast-tag",
  "/user-master": "user-master",
  "/access-master": "access-master",
  "/settings": "settings",
  "/fast-tag-history": "fast-tag-history",
  "/fast-tag-upload": "fast-tag-upload",
  "/fast-tag-reports": "fast-tag-reports",
  "/manage-subscription": "manage-subscription",
} as const;

// Public routes that don't require authentication
export const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/home",
] as const;

// Helper function to get required permission for a route
export function getRequiredPermission(route: string): string | undefined {
  return ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS];
}

// Helper function to check if route is public
export function isPublicRoute(route: string): boolean {
  return PUBLIC_ROUTES.includes(route as (typeof PUBLIC_ROUTES)[number]);
}

// Helper function to check if user has permission for route
export async function hasRoutePermission(
  route: string,
  userId: number,
): Promise<boolean> {
  // Public routes are always accessible
  if (isPublicRoute(route)) {
    return true;
  }

  const requiredPermission = getRequiredPermission(route);
  if (!requiredPermission) {
    // Route doesn't have specific permission requirement, allow access
    return true;
  }

  try {
    const { getUserMenuRights } = await import("@/lib/user-security-api");
    const userPermissions = await getUserMenuRights(userId);
    return userPermissions.includes(requiredPermission);
  } catch (error) {
    console.error("Error checking route permission:", error);
    return false; // Deny access on error for security
  }
}
