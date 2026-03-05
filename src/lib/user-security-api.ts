const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || "http://localhost:3000";
import { httpClient } from "./http-client";

export interface UserSecurityResponse {
  status: boolean;
  message: string;
  data?: UserSecurityData;
  statuscode?: number;
}

export interface UserPermission {
  user_id: number;
  permission_id: number;
  is_allowed: number; // 1 or 0
  note?: string;
  updated_at: string;
  user_email: string;
  permission_name: string;
  permission_key: string;
}

export interface UserSecurityData {
  user_id: number;
  username: string;
  display_name: string;
  email?: string;
  partner_id?: string;
  is_admin: boolean;
  bypass_otp: boolean;
  mfa_enrolled: boolean;
  permissions: UserPermission[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Get user security flags and menu rights
 * Calls /api/user-permissions/{userId} endpoint
 */
export async function getUserSecurityWithMenuRights(
  userId: number,
): Promise<UserSecurityData | null> {
  try {
    const data = await httpClient.get<UserPermission[]>(
      `/api/user-permissions/${userId}`,
    );

    // Handle the API response structure - httpClient returns the array directly
    if (data && Array.isArray(data)) {
      // Transform the permissions array into our expected format
      const permissions = data as UserPermission[];
      const firstPermission = permissions[0]; // Get user info from first permission

      if (firstPermission) {
        const securityData: UserSecurityData = {
          user_id: firstPermission.user_id,
          username: firstPermission.user_email.split("@")[0], // Extract username from email
          display_name: firstPermission.user_email.split("@")[0],
          email: firstPermission.user_email,
          permissions: permissions,
          is_admin: false, // Default value, can be updated based on permissions
          bypass_otp: false, // Default value, can be updated based on permissions
          mfa_enrolled: false, // Default value, can be updated based on permissions
        };
        return securityData;
      }
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch user permissions:", error);
    return null;
  }
}

/**
 * Get user menu rights based on permissions
 * Returns array of menu items the user can access
 */
export async function getUserMenuRights(userId: number): Promise<string[]> {
  try {
    const securityData = await getUserSecurityWithMenuRights(userId);

    if (!securityData || !securityData.permissions) {
      console.warn("No permissions found for user");
      return [];
    }

    // Filter allowed permissions and use permission_key directly as menu ID
    const accessibleMenus = securityData.permissions
      .filter((permission) => permission.is_allowed === 1) // Only include allowed permissions
      .map((permission) => permission.permission_key) // Use permission_key directly as menu ID
      .filter(
        (menuId): menuId is string => menuId !== null && menuId !== undefined,
      ); // Filter out null/undefined values

    return accessibleMenus;
  } catch (error) {
    console.error("Failed to get user menu rights:", error);
    return [];
  }
}

/**
 * Check if user has specific menu access
 */
export async function hasMenuAccess(
  userId: number,
  menuId: string,
): Promise<boolean> {
  try {
    const menuRights = await getUserMenuRights(userId);
    return menuRights.includes(menuId);
  } catch (error) {
    console.error(`Failed to check menu access for ${menuId}:`, error);
    return false;
  }
}

/**
 * Get user permissions
 * Calls /api/user-permissions/{userId} endpoint
 */
export async function getUserPermissions(
  userId: number,
): Promise<UserSecurityData | null> {
  return getUserSecurityWithMenuRights(userId);
}

/**
 * Get user security flags only (for backwards compatibility)
 * Calls /api/user-permissions/{userId} endpoint
 */
export async function getUserSecurityFlags(
  userId: number,
): Promise<UserSecurityData | null> {
  return getUserSecurityWithMenuRights(userId);
}
