// Admin settings stored in localStorage

export interface UserAccess {
  username: string;
  password?: string; // for bypass users
  bypassOTP: boolean;
  allowedMenus: string[];
  isAdmin: boolean;
}

export interface AdminSettings {
  users: UserAccess[];
  banks: { id: string; name: string; enabled: boolean }[];
}

const SETTINGS_KEY = "admin_settings";

const DEFAULT_SETTINGS: AdminSettings = {
  users: [
    {
      username: "admin",
      password: "admin123",
      bypassOTP: true,
      allowedMenus: [
        "home",
        "rc-verification",
        "fast-tag",
        "fast-tag-upload",
        "fast-tag-reports",
        "manage-subscription",
        "user-master",
        "settings",
      ],
      isAdmin: true,
    },
  ],
  banks: [
    { id: "idfc", name: "IDFC First Bank | Blackbuck", enabled: true },
    { id: "idbi", name: "IDBI Bank | Park +", enabled: true },
    { id: "axis", name: "Axis Bank", enabled: true },
    { id: "icici", name: "ICICI Bank", enabled: true },
    { id: "hdfc", name: "HDFC Bank", enabled: true },
    { id: "sbi", name: "State Bank of India", enabled: true },
  ],
};

export function getAdminSettings(): AdminSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* empty */
  }
  // Initialize with defaults
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  return DEFAULT_SETTINGS;
}

export function saveAdminSettings(settings: AdminSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getBypassUser(username: string): UserAccess | undefined {
  const settings = getAdminSettings();
  return settings.users.find((u) => u.username === username && u.bypassOTP);
}

export function getUserAccess(username: string): UserAccess | undefined {
  const settings = getAdminSettings();
  return settings.users.find((u) => u.username === username);
}

export function getEnabledBanks() {
  const settings = getAdminSettings();
  return settings.banks.filter((b) => b.enabled);
}

export function getAllMenuItems() {
  return [
    { id: "rc-verification", label: "RC Verification" },
    { id: "fast-tag", label: "Fast Tag" },
    { id: "fast-tag-upload", label: "FastTag Upload" },
    { id: "fast-tag-reports", label: "FastTag Reports" },
    { id: "manage-subscription", label: "Manage Subscription" },
    { id: "user-master", label: "User Master" },
    { id: "access-master", label: "Access Master" },
    { id: "settings", label: "Settings" },
  ];
}
