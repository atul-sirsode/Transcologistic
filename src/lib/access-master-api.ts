// Access Master API Client
// Replaces localStorage operations with actual API calls

import {
  AMUser,
  AMRole,
  AMPermission,
  AMRolePermission,
  AMUserRole,
  AMUserPermission,
  AMUserSecurityFlags,
} from "./access-master";
import { httpClient } from "./http-client";

// ── Users API ────────────────────────────────────────────────────

export const usersApi = {
  list: async (): Promise<AMUser[]> => {
    return httpClient.get<AMUser[]>("/api/users/get-all-active-users");
  },

  get: async (id: number): Promise<AMUser | null> => {
    try {
      return await httpClient.post<AMUser>("/api/users/get-user-info", {
        user_id: id,
      });
    } catch {
      return null;
    }
  },

  create: async (
    data: Pick<AMUser, "username" | "display_name" | "email" | "password_hash">,
  ): Promise<AMUser> => {
    return httpClient.post<AMUser>("/api/users/create", data);
  },

  update: async (id: number, patch: Partial<AMUser>): Promise<void> => {
    await httpClient.put<void>("/api/users/update", {
      user_id: id,
      ...patch,
    });
  },

  remove: async (id: number): Promise<void> => {
    await httpClient.delete<void>("/api/users/delete", {
      user_id: id,
    });
  },
};

// ── Roles API ────────────────────────────────────────────────────

export const rolesApi = {
  list: async (): Promise<AMRole[]> => {
    return httpClient.get<AMRole[]>("/api/roles");
  },

  create: async (
    data: Pick<AMRole, "role_key" | "role_name" | "is_system_role">,
  ): Promise<AMRole> => {
    return httpClient.post<AMRole>("/api/roles/create", data);
  },

  update: async (id: number, patch: Partial<AMRole>): Promise<void> => {
    await httpClient.put<void>("/api/roles/update", {
      role_id: id,
      ...patch,
    });
  },

  remove: async (id: number): Promise<void> => {
    await httpClient.delete<void>("/api/roles/delete", {
      role_id: id,
    });
  },
};

// ── Permissions API ──────────────────────────────────────────────

export const permissionsApi = {
  list: async (): Promise<AMPermission[]> => {
    return httpClient.get<AMPermission[]>("/api/permissions");
  },

  create: async (
    data: Pick<
      AMPermission,
      "perm_key" | "perm_name" | "category" | "description"
    >,
  ): Promise<AMPermission> => {
    return httpClient.post<AMPermission>("/api/permissions/create", data);
  },

  update: async (id: number, patch: Partial<AMPermission>): Promise<void> => {
    await httpClient.put<void>("/api/permissions/update", {
      permission_id: id,
      ...patch,
    });
  },

  remove: async (id: number): Promise<void> => {
    await httpClient.delete<void>("/api/permissions/delete", {
      permission_id: id,
    });
  },
};

// ── Role-Permissions API ─────────────────────────────────────────

export const rolePermissionsApi = {
  list: async (): Promise<AMRolePermission[]> => {
    return httpClient.get<AMRolePermission[]>("/api/role-permissions");
  },

  forRole: async (roleId: number): Promise<AMRolePermission[]> => {
    const all = await rolePermissionsApi.list();
    return all.filter((rp) => rp.role_id === roleId);
  },

  set: async (
    roleId: number,
    permId: number,
    allowed: boolean,
  ): Promise<void> => {
    try {
      // Always use UPDATE endpoint to toggle is_allowed field
      // The database maintains rows with is_allowed = 0 or 1
      await httpClient.put<void>("/api/role-permissions/update", {
        role_id: roleId,
        permission_id: permId,
        is_allowed: allowed,
      });
    } catch (error) {
      console.error(`Failed to ${allowed ? "grant" : "revoke"} permission:`, {
        roleId,
        permId,
        allowed,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  },
};

// ── User-Roles API ───────────────────────────────────────────────

export const userRolesApi = {
  list: async (): Promise<AMUserRole[]> => {
    return httpClient.get<AMUserRole[]>("/api/user-roles");
  },

  forUser: async (userId: number): Promise<AMUserRole[]> => {
    const all = await userRolesApi.list();
    return all.filter((ur) => ur.user_id === userId);
  },

  assign: async (userId: number, roleId: number): Promise<void> => {
    await httpClient.post<void>("/api/user-roles/create", {
      user_id: userId,
      role_id: roleId,
      assigned_at: new Date().toISOString(),
      assigned_by: null,
    });
  },

  unassign: async (userId: number, roleId: number): Promise<void> => {
    await httpClient.delete<void>("/api/user-roles/delete", {
      user_id: userId,
      role_id: roleId,
    });
  },
};

// ── User-Permissions API ───────────────────────────────────────────

export const userPermissionsApi = {
  list: async (): Promise<AMUserPermission[]> => {
    return httpClient.get<AMUserPermission[]>("/api/user-permissions");
  },

  forUser: async (userId: number): Promise<AMUserPermission[]> => {
    const all = await userPermissionsApi.list();
    return all.filter((up) => up.user_id === userId);
  },

  set: async (
    userId: number,
    permId: number,
    allowed: boolean,
    note?: string,
  ): Promise<void> => {
    if (allowed) {
      await httpClient.post<void>("/api/user-permissions/create", {
        user_id: userId,
        permission_id: permId,
        is_allowed: true,
        note: note || null,
        updated_at: new Date().toISOString(),
      });
    } else {
      await httpClient.delete<void>("/api/user-permissions/delete", {
        user_id: userId,
        permission_id: permId,
      });
    }
  },

  remove: async (userId: number, permId: number): Promise<void> => {
    await httpClient.delete<void>("/api/user-permissions/delete", {
      user_id: userId,
      permission_id: permId,
    });
  },
};

// ── User Security Flags API ───────────────────────────────────────

export const userSecurityFlagsApi = {
  list: async (): Promise<AMUserSecurityFlags[]> => {
    return httpClient.get<AMUserSecurityFlags[]>("/api/user-security-flags");
  },

  forUser: async (userId: number): Promise<AMUserSecurityFlags | null> => {
    try {
      const all = await userSecurityFlagsApi.list();
      return all.find((f) => f.user_id === userId) || null;
    } catch {
      return null;
    }
  },

  set: async (
    userId: number,
    patch: Partial<
      Pick<AMUserSecurityFlags, "is_admin" | "bypass_otp" | "mfa_enrolled">
    >,
  ): Promise<void> => {
    const existing = await userSecurityFlagsApi.forUser(userId);

    if (existing) {
      await httpClient.put<void>("/api/user-security-flags/update", {
        user_id: userId,
        ...patch,
        updated_at: new Date().toISOString(),
      });
    } else {
      await httpClient.post<void>("/api/user-security-flags/create", {
        user_id: userId,
        is_admin: false,
        bypass_otp: false,
        mfa_enrolled: false,
        ...patch,
        updated_at: new Date().toISOString(),
      });
    }
  },
};

// ── Effective Permissions (computed) ─────────────────────────────

export async function getEffectivePermissions(
  userId: number,
): Promise<
  (AMPermission & { is_allowed: boolean; source: "user" | "role" })[]
> {
  const [allPerms, userRoles, rolePerms, userOverrides] = await Promise.all([
    permissionsApi.list(),
    userRolesApi.forUser(userId),
    rolePermissionsApi.list(),
    userPermissionsApi.forUser(userId),
  ]);

  return allPerms.map((p) => {
    // Check user-level override first
    const override = userOverrides.find(
      (up) => up.permission_id === p.permission_id,
    );
    if (override) {
      return { ...p, is_allowed: override.is_allowed, source: "user" as const };
    }

    // Check role-level
    const allowed = userRoles.some((ur) =>
      rolePerms.some(
        (rp) =>
          rp.role_id === ur.role_id &&
          rp.permission_id === p.permission_id &&
          rp.is_allowed,
      ),
    );
    return { ...p, is_allowed: allowed, source: "role" as const };
  });
}

// ── Seed defaults (API version) ───────────────────────────────────

export async function seedDefaultsApi() {
  try {
    // Check if data already exists
    const existingUsers = await usersApi.list();
    if (existingUsers.length > 0) {
      return; // Already seeded
    }

    // Create permissions
    const perms = await Promise.all([
      permissionsApi.create({
        perm_key: "menu.rc_verification",
        perm_name: "RC Verification",
        category: "Menu",
        description: null,
      }),
      permissionsApi.create({
        perm_key: "menu.fast_tag",
        perm_name: "Fast Tag",
        category: "Menu",
        description: null,
      }),
      permissionsApi.create({
        perm_key: "menu.user_master",
        perm_name: "User Master",
        category: "Menu",
        description: null,
      }),
      permissionsApi.create({
        perm_key: "menu.settings",
        perm_name: "Settings",
        category: "Menu",
        description: null,
      }),
    ]);

    // Create admin role
    const adminRole = await rolesApi.create({
      role_key: "admin",
      role_name: "Admin",
      is_system_role: true,
    });

    // Assign all permissions to admin role
    await Promise.all(
      perms.map((p) =>
        rolePermissionsApi.set(adminRole.role_id, p.permission_id, true),
      ),
    );

    // Create admin user
    const adminUser = await usersApi.create({
      username: "admin",
      display_name: "Admin",
      email: "admin@example.com",
      password_hash: "<hashed>",
    });

    // Assign admin role to admin user
    await userRolesApi.assign(adminUser.user_id, adminRole.role_id);

    // Set admin security flags
    await userSecurityFlagsApi.set(adminUser.user_id, {
      is_admin: true,
      bypass_otp: true,
      mfa_enrolled: false,
    });
  } catch (error) {
    console.error("Failed to seed defaults:", error);
    throw error;
  }
}
