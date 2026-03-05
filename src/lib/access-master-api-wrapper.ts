// Access Master - API-based CRUD operations
// This version replaces localStorage with actual API calls

// ── Types (re-exported from original) ──────────────────────────────────

export interface AMUser {
  user_id: number;
  username: string;
  display_name: string;
  email: string | null;
  password_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AMRole {
  role_id: number;
  role_key: string;
  role_name: string;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface AMPermission {
  permission_id: number;
  perm_key: string;
  perm_name: string;
  category: string | null;
  description: string | null;
}

export interface AMRolePermission {
  role_id: number;
  permission_id: number;
  is_allowed: boolean;
  created_at: string;
}

export interface AMUserRole {
  user_id: number;
  role_id: number;
  assigned_at: string;
  assigned_by: number | null;
}

export interface AMUserPermission {
  user_id: number;
  permission_id: number;
  is_allowed: boolean;
  note: string | null;
  updated_at: string;
}

export interface AMUserSecurityFlags {
  user_id: number;
  is_admin: boolean;
  bypass_otp: boolean;
  is_guest: boolean;
  mfa_enrolled: boolean;
  updated_at: string;
}

// ── Import API functions ───────────────────────────────────────────────

import {
  usersApi,
  rolesApi,
  permissionsApi,
  rolePermissionsApi,
  userRolesApi,
  userPermissionsApi,
  userSecurityFlagsApi,
  getEffectivePermissions,
  seedDefaultsApi,
} from "./access-master-api";

// ── Seed defaults (API version) ───────────────────────────────────────

export function seedDefaults() {
  return seedDefaultsApi();
}

// ── CRUD: Users ────────────────────────────────────────────────────

export const amUsers = {
  list: () => usersApi.list(),
  get: (id: number) => usersApi.get(id),
  create: (
    data: Pick<AMUser, "username" | "display_name" | "email" | "password_hash">,
  ): Promise<AMUser> => {
    return usersApi.create(data);
  },
  update: (id: number, patch: Partial<AMUser>) => {
    return usersApi.update(id, patch);
  },
  remove: (id: number) => {
    return usersApi.remove(id);
  },
};

// ── CRUD: Roles ────────────────────────────────────────────────────

export const amRoles = {
  list: () => rolesApi.list(),
  create: (
    data: Pick<AMRole, "role_key" | "role_name" | "is_system_role">,
  ): Promise<AMRole> => {
    return rolesApi.create(data);
  },
  update: (id: number, patch: Partial<AMRole>) => {
    return rolesApi.update(id, patch);
  },
  remove: (id: number) => {
    return rolesApi.remove(id);
  },
};

// ── CRUD: Permissions ──────────────────────────────────────────────

export const amPermissions = {
  list: () => permissionsApi.list(),
  create: (
    data: Pick<
      AMPermission,
      "perm_key" | "perm_name" | "category" | "description"
    >,
  ): Promise<AMPermission> => {
    return permissionsApi.create(data);
  },
  update: (id: number, patch: Partial<AMPermission>) => {
    return permissionsApi.update(id, patch);
  },
  remove: (id: number) => {
    return permissionsApi.remove(id);
  },
};

// ── CRUD: Role-Permissions ─────────────────────────────────────────

export const amRolePermissions = {
  list: () => rolePermissionsApi.list(),
  forRole: (roleId: number) => rolePermissionsApi.forRole(roleId),
  set: (roleId: number, permId: number, allowed: boolean) => {
    return rolePermissionsApi.set(roleId, permId, allowed);
  },
};

// ── CRUD: User-Roles ───────────────────────────────────────────────

export const amUserRoles = {
  list: () => userRolesApi.list(),
  forUser: (userId: number) => userRolesApi.forUser(userId),
  assign: (userId: number, roleId: number) => {
    return userRolesApi.assign(userId, roleId);
  },
  unassign: (userId: number, roleId: number) => {
    return userRolesApi.unassign(userId, roleId);
  },
};

// ── CRUD: User-Permissions (overrides) ─────────────────────────────

export const amUserPermissions = {
  list: () => userPermissionsApi.list(),
  forUser: (userId: number) => userPermissionsApi.forUser(userId),
  set: (userId: number, permId: number, allowed: boolean, note?: string) => {
    return userPermissionsApi.set(userId, permId, allowed, note);
  },
  remove: (userId: number, permId: number) => {
    return userPermissionsApi.remove(userId, permId);
  },
};

// ── CRUD: Security Flags ───────────────────────────────────────────

export const amSecurityFlags = {
  list: () => userSecurityFlagsApi.list(),
  forUser: (userId: number) => userSecurityFlagsApi.forUser(userId),
  set: (
    userId: number,
    patch: Partial<
      Pick<
        AMUserSecurityFlags,
        "is_admin" | "bypass_otp" | "is_guest" | "mfa_enrolled"
      >
    >,
  ) => {
    return userSecurityFlagsApi.set(userId, patch);
  },
};

// ── Computed: Effective permissions for a user ─────────────────────

export function getEffectivePermissionsForUser(userId: number) {
  return getEffectivePermissions(userId);
}
