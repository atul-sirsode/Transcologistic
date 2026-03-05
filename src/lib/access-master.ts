// Access Master - localStorage CRUD mirroring the relational schema

// ── Types ──────────────────────────────────────────────────────────

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

// ── Storage keys ───────────────────────────────────────────────────

const KEYS = {
  users: "am_users",
  roles: "am_roles",
  permissions: "am_permissions",
  rolePermissions: "am_role_permissions",
  userRoles: "am_user_roles",
  userPermissions: "am_user_permissions",
  securityFlags: "am_security_flags",
  autoInc: "am_auto_inc",
} as const;

// ── Auto-increment helper ──────────────────────────────────────────

function getAutoInc(): Record<string, number> {
  try {
    const s = localStorage.getItem(KEYS.autoInc);
    if (s) return JSON.parse(s);
  } catch {
    // Ignore parsing errors
  }
  return {};
}

function nextId(table: string): number {
  const inc = getAutoInc();
  const next = (inc[table] || 0) + 1;
  inc[table] = next;
  localStorage.setItem(KEYS.autoInc, JSON.stringify(inc));
  return next;
}

// ── Generic helpers ────────────────────────────────────────────────

function load<T>(key: string): T[] {
  try {
    const s = localStorage.getItem(key);
    if (s) return JSON.parse(s);
  } catch {
    // Ignore parsing errors
  }
  return [];
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

const now = () => new Date().toISOString();

// ── Seed defaults (run once) ───────────────────────────────────────

export function seedDefaults() {
  if (localStorage.getItem("am_seeded")) return;

  // Permissions
  const perms: AMPermission[] = [
    {
      permission_id: 1,
      perm_key: "menu.rc_verification",
      perm_name: "RC Verification",
      category: "Menu",
      description: null,
    },
    {
      permission_id: 2,
      perm_key: "menu.fast_tag",
      perm_name: "Fast Tag",
      category: "Menu",
      description: null,
    },
    {
      permission_id: 3,
      perm_key: "menu.user_master",
      perm_name: "User Master",
      category: "Menu",
      description: null,
    },
    {
      permission_id: 4,
      perm_key: "menu.settings",
      perm_name: "Settings",
      category: "Menu",
      description: null,
    },
  ];
  save(KEYS.permissions, perms);

  // Roles
  const roles: AMRole[] = [
    {
      role_id: 1,
      role_key: "admin",
      role_name: "Admin",
      is_system_role: true,
      created_at: now(),
      updated_at: now(),
    },
  ];
  save(KEYS.roles, roles);

  // Role-permissions: admin gets all
  const rp: AMRolePermission[] = perms.map((p) => ({
    role_id: 1,
    permission_id: p.permission_id,
    is_allowed: true,
    created_at: now(),
  }));
  save(KEYS.rolePermissions, rp);

  // Admin user
  const users: AMUser[] = [
    {
      user_id: 1,
      username: "admin",
      display_name: "Admin",
      email: "admin@example.com",
      password_hash: "<hashed>",
      is_active: true,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    },
  ];
  save(KEYS.users, users);

  // User-role
  save(KEYS.userRoles, [
    { user_id: 1, role_id: 1, assigned_at: now(), assigned_by: null },
  ]);

  // Security flags
  save(KEYS.securityFlags, [
    {
      user_id: 1,
      is_admin: true,
      bypass_otp: true,
      mfa_enrolled: false,
      updated_at: now(),
    },
  ]);

  // Set auto-inc
  const inc = { users: 1, roles: 1, permissions: 4 };
  localStorage.setItem(KEYS.autoInc, JSON.stringify(inc));
  localStorage.setItem("am_seeded", "1");
}

// ── CRUD: Users ────────────────────────────────────────────────────

export const amUsers = {
  list: () => load<AMUser>(KEYS.users).filter((u) => !u.deleted_at),
  get: (id: number) => load<AMUser>(KEYS.users).find((u) => u.user_id === id),
  create: (
    data: Pick<AMUser, "username" | "display_name" | "email" | "password_hash">,
  ): AMUser => {
    const users = load<AMUser>(KEYS.users);
    const u: AMUser = {
      ...data,
      user_id: nextId("users"),
      is_active: true,
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    users.push(u);
    save(KEYS.users, users);
    // Create security flags entry
    const flags = load<AMUserSecurityFlags>(KEYS.securityFlags);
    flags.push({
      user_id: u.user_id,
      is_admin: false,
      bypass_otp: false,
      is_guest: false,
      mfa_enrolled: false,
      updated_at: now(),
    });
    save(KEYS.securityFlags, flags);
    return u;
  },
  update: (id: number, patch: Partial<AMUser>) => {
    const users = load<AMUser>(KEYS.users);
    const idx = users.findIndex((u) => u.user_id === id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...patch, updated_at: now() };
      save(KEYS.users, users);
    }
  },
  remove: (id: number) => {
    const users = load<AMUser>(KEYS.users);
    const idx = users.findIndex((u) => u.user_id === id);
    if (idx >= 0) {
      users[idx].deleted_at = now();
      save(KEYS.users, users);
    }
    // Cascade
    save(
      KEYS.userRoles,
      load<AMUserRole>(KEYS.userRoles).filter((ur) => ur.user_id !== id),
    );
    save(
      KEYS.userPermissions,
      load<AMUserPermission>(KEYS.userPermissions).filter(
        (up) => up.user_id !== id,
      ),
    );
    save(
      KEYS.securityFlags,
      load<AMUserSecurityFlags>(KEYS.securityFlags).filter(
        (f) => f.user_id !== id,
      ),
    );
  },
};

// ── CRUD: Roles ────────────────────────────────────────────────────

export const amRoles = {
  list: () => load<AMRole>(KEYS.roles),
  create: (
    data: Pick<AMRole, "role_key" | "role_name" | "is_system_role">,
  ): AMRole => {
    const roles = load<AMRole>(KEYS.roles);
    const r: AMRole = {
      ...data,
      role_id: nextId("roles"),
      created_at: now(),
      updated_at: now(),
    };
    roles.push(r);
    save(KEYS.roles, roles);
    return r;
  },
  update: (id: number, patch: Partial<AMRole>) => {
    const roles = load<AMRole>(KEYS.roles);
    const idx = roles.findIndex((r) => r.role_id === id);
    if (idx >= 0) {
      roles[idx] = { ...roles[idx], ...patch, updated_at: now() };
      save(KEYS.roles, roles);
    }
  },
  remove: (id: number) => {
    save(
      KEYS.roles,
      load<AMRole>(KEYS.roles).filter((r) => r.role_id !== id),
    );
    save(
      KEYS.rolePermissions,
      load<AMRolePermission>(KEYS.rolePermissions).filter(
        (rp) => rp.role_id !== id,
      ),
    );
    save(
      KEYS.userRoles,
      load<AMUserRole>(KEYS.userRoles).filter((ur) => ur.role_id !== id),
    );
  },
};

// ── CRUD: Permissions ──────────────────────────────────────────────

export const amPermissions = {
  list: () => load<AMPermission>(KEYS.permissions),
  create: (
    data: Pick<
      AMPermission,
      "perm_key" | "perm_name" | "category" | "description"
    >,
  ): AMPermission => {
    const perms = load<AMPermission>(KEYS.permissions);
    const p: AMPermission = { ...data, permission_id: nextId("permissions") };
    perms.push(p);
    save(KEYS.permissions, perms);
    return p;
  },
  update: (id: number, patch: Partial<AMPermission>) => {
    const perms = load<AMPermission>(KEYS.permissions);
    const idx = perms.findIndex((p) => p.permission_id === id);
    if (idx >= 0) {
      perms[idx] = { ...perms[idx], ...patch };
      save(KEYS.permissions, perms);
    }
  },
  remove: (id: number) => {
    save(
      KEYS.permissions,
      load<AMPermission>(KEYS.permissions).filter(
        (p) => p.permission_id !== id,
      ),
    );
    save(
      KEYS.rolePermissions,
      load<AMRolePermission>(KEYS.rolePermissions).filter(
        (rp) => rp.permission_id !== id,
      ),
    );
    save(
      KEYS.userPermissions,
      load<AMUserPermission>(KEYS.userPermissions).filter(
        (up) => up.permission_id !== id,
      ),
    );
  },
};

// ── CRUD: Role-Permissions ─────────────────────────────────────────

export const amRolePermissions = {
  list: () => load<AMRolePermission>(KEYS.rolePermissions),
  forRole: (roleId: number) =>
    load<AMRolePermission>(KEYS.rolePermissions).filter(
      (rp) => rp.role_id === roleId,
    ),
  set: (roleId: number, permId: number, allowed: boolean) => {
    let rps = load<AMRolePermission>(KEYS.rolePermissions);
    const idx = rps.findIndex(
      (rp) => rp.role_id === roleId && rp.permission_id === permId,
    );
    if (idx >= 0) {
      if (allowed) rps[idx].is_allowed = true;
      else rps = rps.filter((_, i) => i !== idx);
    } else if (allowed) {
      rps.push({
        role_id: roleId,
        permission_id: permId,
        is_allowed: true,
        created_at: now(),
      });
    }
    save(KEYS.rolePermissions, rps);
  },
};

// ── CRUD: User-Roles ───────────────────────────────────────────────

export const amUserRoles = {
  list: () => load<AMUserRole>(KEYS.userRoles),
  forUser: (userId: number) =>
    load<AMUserRole>(KEYS.userRoles).filter((ur) => ur.user_id === userId),
  assign: (userId: number, roleId: number) => {
    const urs = load<AMUserRole>(KEYS.userRoles);
    if (!urs.find((ur) => ur.user_id === userId && ur.role_id === roleId)) {
      urs.push({
        user_id: userId,
        role_id: roleId,
        assigned_at: now(),
        assigned_by: null,
      });
      save(KEYS.userRoles, urs);
    }
  },
  unassign: (userId: number, roleId: number) => {
    save(
      KEYS.userRoles,
      load<AMUserRole>(KEYS.userRoles).filter(
        (ur) => !(ur.user_id === userId && ur.role_id === roleId),
      ),
    );
  },
};

// ── CRUD: User-Permissions (overrides) ─────────────────────────────

export const amUserPermissions = {
  list: () => load<AMUserPermission>(KEYS.userPermissions),
  forUser: (userId: number) =>
    load<AMUserPermission>(KEYS.userPermissions).filter(
      (up) => up.user_id === userId,
    ),
  set: (userId: number, permId: number, allowed: boolean, note?: string) => {
    const ups = load<AMUserPermission>(KEYS.userPermissions);
    const idx = ups.findIndex(
      (up) => up.user_id === userId && up.permission_id === permId,
    );
    if (idx >= 0) {
      ups[idx] = {
        ...ups[idx],
        is_allowed: allowed,
        note: note ?? ups[idx].note,
        updated_at: now(),
      };
    } else {
      ups.push({
        user_id: userId,
        permission_id: permId,
        is_allowed: allowed,
        note: note ?? null,
        updated_at: now(),
      });
    }
    save(KEYS.userPermissions, ups);
  },
  remove: (userId: number, permId: number) => {
    save(
      KEYS.userPermissions,
      load<AMUserPermission>(KEYS.userPermissions).filter(
        (up) => !(up.user_id === userId && up.permission_id === permId),
      ),
    );
  },
};

// ── CRUD: Security Flags ───────────────────────────────────────────

export const amSecurityFlags = {
  list: () => load<AMUserSecurityFlags>(KEYS.securityFlags),
  forUser: (userId: number) =>
    load<AMUserSecurityFlags>(KEYS.securityFlags).find(
      (f) => f.user_id === userId,
    ),
  set: (
    userId: number,
    patch: Partial<
      Pick<AMUserSecurityFlags, "is_admin" | "bypass_otp" | "mfa_enrolled">
    >,
  ) => {
    const flags = load<AMUserSecurityFlags>(KEYS.securityFlags);
    const idx = flags.findIndex((f) => f.user_id === userId);
    if (idx >= 0) {
      flags[idx] = { ...flags[idx], ...patch, updated_at: now() };
    } else {
      flags.push({
        user_id: userId,
        is_admin: false,
        bypass_otp: false,
        is_guest: false,
        mfa_enrolled: false,
        ...patch,
        updated_at: now(),
      });
    }
    save(KEYS.securityFlags, flags);
  },
};

// ── Computed: Effective permissions for a user ─────────────────────

export function getEffectivePermissions(userId: number) {
  const allPerms = amPermissions.list();
  const userRoles = amUserRoles.forUser(userId);
  const rolePerms = amRolePermissions.list();
  const userOverrides = amUserPermissions.forUser(userId);

  return allPerms.map((p) => {
    // Check user-level override first
    const override = userOverrides.find(
      (up) => up.permission_id === p.permission_id,
    );
    if (override)
      return { ...p, is_allowed: override.is_allowed, source: "user" as const };

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
