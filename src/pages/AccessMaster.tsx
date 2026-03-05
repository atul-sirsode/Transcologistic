import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Plus, Trash2, Pencil, Eye, X, Check } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  seedDefaults,
  amUsers,
  amRoles,
  amPermissions,
  amRolePermissions,
  amUserRoles,
  amUserPermissions,
  amSecurityFlags,
  getEffectivePermissionsForUser,
  AMUser,
  AMRole,
  AMPermission,
  AMRolePermission,
  AMUserPermission,
  AMUserRole,
  AMUserSecurityFlags,
} from "@/lib/access-master-api-wrapper";

export default function AccessMaster() {
  const { toast } = useToast();
  const [tab, setTab] = useState("users");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Commented out automatic seeding to prevent recursive API calls
  // const initialize = useCallback(async () => {
  //   setIsLoading(true);
  //   try {
  //     await seedDefaults();
  //   } catch (error) {
  //     toast({ title: 'Failed to initialize', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [toast]);

  // useEffect(() => {
  //   initialize();
  // }, [initialize]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Access Master
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage users, roles, permissions, and security flags
              </p>
            </div>
          </div>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="role-perms">Role↔Perm</TabsTrigger>
            <TabsTrigger value="user-roles">User↔Role</TabsTrigger>
            <TabsTrigger value="user-perms">User↔Perm</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab
              key={refreshKey}
              onRefresh={refresh}
              toast={toast}
              isActive={tab === "users"}
            />
          </TabsContent>
          <TabsContent value="roles">
            <RolesTab
              key={refreshKey}
              onRefresh={refresh}
              toast={toast}
              isActive={tab === "roles"}
            />
          </TabsContent>
          <TabsContent value="permissions">
            <PermissionsTab
              key={refreshKey}
              onRefresh={refresh}
              toast={toast}
              isActive={tab === "permissions"}
            />
          </TabsContent>
          <TabsContent value="role-perms">
            <RolePermsTab
              key={refreshKey}
              onRefresh={refresh}
              toast={toast}
              isActive={tab === "role-perms"}
            />
          </TabsContent>
          <TabsContent value="user-roles">
            <UserRolesTab
              key={refreshKey}
              onRefresh={refresh}
              toast={toast}
              isActive={tab === "user-roles"}
            />
          </TabsContent>
          <TabsContent value="user-perms">
            <UserPermsTab
              key={refreshKey}
              onRefresh={refresh}
              toast={toast}
              isActive={tab === "user-perms"}
            />
          </TabsContent>
          <TabsContent value="security">
            <SecurityTab
              key={refreshKey}
              onRefresh={refresh}
              toast={toast}
              isActive={tab === "security"}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ── Shared props ───────────────────────────────────────────────────

interface TabProps {
  onRefresh: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  isActive: boolean;
}

// ── Users Tab ──────────────────────────────────────────────────────

function UsersTab({ onRefresh, toast, isActive }: TabProps) {
  const [users, setUsers] = useState<AMUser[]>([]);
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    email: "",
    password_hash: "",
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersList = await amUsers.list();
      setUsers(usersList);
      setHasLoaded(true);
    } catch (error) {
      toast({
        title: "Failed to load users",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const handleAdd = async () => {
    if (!form.username.trim() || !form.display_name.trim()) {
      toast({
        title: "Username and display name required",
        variant: "destructive",
      });
      return;
    }
    if (users.find((u) => u.username === form.username.trim())) {
      toast({ title: "Username already exists", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await amUsers.create({
        ...form,
        email: form.email || null,
        password_hash: form.password_hash || "<hashed>",
      });
      setForm({ username: "", display_name: "", email: "", password_hash: "" });
      toast({ title: "User created" });
      await reload();
    } catch (error) {
      toast({
        title: "Failed to create user",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (editId == null) return;
    setIsLoading(true);
    try {
      await amUsers.update(editId, {
        username: form.username,
        display_name: form.display_name,
        email: form.email || null,
      });
      setEditId(null);
      setForm({ username: "", display_name: "", email: "", password_hash: "" });
      toast({ title: "User updated" });
      await reload();
    } catch (error) {
      toast({
        title: "Failed to update user",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (u: AMUser) => {
    setEditId(u.user_id);
    setForm({
      username: u.username,
      display_name: u.display_name,
      email: u.email || "",
      password_hash: "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Users</CardTitle>
        <CardDescription>Manage user accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <Label>Username</Label>
            <Input
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              placeholder="username"
            />
          </div>
          <div className="space-y-1">
            <Label>Display Name</Label>
            <Input
              value={form.display_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, display_name: e.target.value }))
              }
              placeholder="Display Name"
            />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password_hash}
              onChange={(e) =>
                setForm((f) => ({ ...f, password_hash: e.target.value }))
              }
              placeholder="••••••"
            />
          </div>
          <Button
            onClick={editId != null ? handleUpdate : handleAdd}
            className="gap-2"
            disabled={isLoading}
          >
            {editId != null ? (
              <>
                <Check className="w-4 h-4" /> Update
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add
              </>
            )}
          </Button>
        </div>
        {editId != null && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditId(null);
              setForm({
                username: "",
                display_name: "",
                email: "",
                password_hash: "",
              });
            }}
          >
            <X className="w-4 h-4 mr-1" /> Cancel Edit
          </Button>
        )}

        {/* Table */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  ID
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Username
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Display Name
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Email
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Active
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.user_id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-3 py-2 text-foreground">{u.user_id}</td>
                  <td className="px-3 py-2 text-foreground font-medium">
                    {u.username}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {u.display_name}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {u.email || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={u.is_active}
                      onCheckedChange={async (v) => {
                        try {
                          await amUsers.update(u.user_id, { is_active: v });
                          toast({
                            title: `User ${v ? "activated" : "deactivated"}`,
                          });
                          await reload();
                        } catch (error) {
                          toast({
                            title: "Failed to update status",
                            description:
                              error instanceof Error
                                ? error.message
                                : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={isLoading}
                    />
                  </td>
                  <td className="px-3 py-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(u)}
                      disabled={isLoading}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={async () => {
                        try {
                          await amUsers.remove(u.user_id);
                          toast({ title: "User removed" });
                          await reload();
                        } catch (error) {
                          toast({
                            title: "Failed to remove user",
                            description:
                              error instanceof Error
                                ? error.message
                                : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Roles Tab ──────────────────────────────────────────────────────

function RolesTab({ onRefresh, toast, isActive }: TabProps) {
  const [roles, setRoles] = useState<AMRole[]>([]);
  const [form, setForm] = useState({
    role_key: "",
    role_name: "",
    is_system_role: false,
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const rolesList = await amRoles.list();
      setRoles(rolesList);
      setHasLoaded(true);
    } catch (error) {
      toast({
        title: "Failed to load roles",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const handleAdd = async () => {
    if (!form.role_key.trim() || !form.role_name.trim()) {
      toast({ title: "Role key and name required", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await amRoles.create(form);
      setForm({ role_key: "", role_name: "", is_system_role: false });
      toast({ title: "Role created" });
      await reload();
    } catch (error) {
      toast({
        title: "Failed to create role",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (editId == null) return;
    setIsLoading(true);
    try {
      await amRoles.update(editId, form);
      setEditId(null);
      setForm({ role_key: "", role_name: "", is_system_role: false });
      toast({ title: "Role updated" });
      await reload();
    } catch (error) {
      toast({
        title: "Failed to update role",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Roles</CardTitle>
        <CardDescription>
          Define roles like admin, auditor, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label>Role Key</Label>
            <Input
              value={form.role_key}
              onChange={(e) =>
                setForm((f) => ({ ...f, role_key: e.target.value }))
              }
              placeholder="admin"
            />
          </div>
          <div className="space-y-1">
            <Label>Role Name</Label>
            <Input
              value={form.role_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, role_name: e.target.value }))
              }
              placeholder="Admin"
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch
              checked={form.is_system_role}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, is_system_role: v }))
              }
            />
            <Label>System Role</Label>
          </div>
          <Button
            onClick={editId != null ? handleUpdate : handleAdd}
            className="gap-2"
            disabled={isLoading}
          >
            {editId != null ? (
              <>
                <Check className="w-4 h-4" /> Update
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add
              </>
            )}
          </Button>
        </div>
        {editId != null && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditId(null);
              setForm({ role_key: "", role_name: "", is_system_role: false });
            }}
          >
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        )}

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  ID
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Key
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  System
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr
                  key={r.role_id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-3 py-2 text-foreground">{r.role_id}</td>
                  <td className="px-3 py-2 text-foreground font-mono text-xs">
                    {r.role_key}
                  </td>
                  <td className="px-3 py-2 text-foreground">{r.role_name}</td>
                  <td className="px-3 py-2">
                    {r.is_system_role ? (
                      <Badge variant="secondary">System</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditId(r.role_id);
                        setForm({
                          role_key: r.role_key,
                          role_name: r.role_name,
                          is_system_role: r.is_system_role,
                        });
                      }}
                      disabled={isLoading}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={async () => {
                        try {
                          await amRoles.remove(r.role_id);
                          toast({ title: "Role removed" });
                          await reload();
                        } catch (error) {
                          toast({
                            title: "Failed to remove role",
                            description:
                              error instanceof Error
                                ? error.message
                                : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Permissions Tab ────────────────────────────────────────────────

function PermissionsTab({ onRefresh, toast, isActive }: TabProps) {
  const [perms, setPerms] = useState<AMPermission[]>([]);
  const [form, setForm] = useState({
    perm_key: "",
    perm_name: "",
    category: "",
    description: "",
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const permsList = await amPermissions.list();
      setPerms(permsList);
      setHasLoaded(true);
    } catch (error) {
      toast({
        title: "Failed to load permissions",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const handleAdd = async () => {
    if (!form.perm_key.trim() || !form.perm_name.trim()) {
      toast({ title: "Key and name required", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await amPermissions.create({
        ...form,
        category: form.category || null,
        description: form.description || null,
      });
      setForm({ perm_key: "", perm_name: "", category: "", description: "" });
      toast({ title: "Permission created" });
      await reload();
    } catch (error) {
      toast({
        title: "Failed to create permission",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (editId == null) return;
    setIsLoading(true);
    try {
      await amPermissions.update(editId, {
        ...form,
        category: form.category || null,
        description: form.description || null,
      });
      setEditId(null);
      setForm({ perm_key: "", perm_name: "", category: "", description: "" });
      toast({ title: "Permission updated" });
      await reload();
    } catch (error) {
      toast({
        title: "Failed to update permission",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Permissions</CardTitle>
        <CardDescription>Menu items and granular rights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <Label>Perm Key</Label>
            <Input
              value={form.perm_key}
              onChange={(e) =>
                setForm((f) => ({ ...f, perm_key: e.target.value }))
              }
              placeholder="menu.fast_tag"
            />
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.perm_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, perm_name: e.target.value }))
              }
              placeholder="Fast Tag"
            />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="Menu"
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional"
            />
          </div>
          <Button
            onClick={editId != null ? handleUpdate : handleAdd}
            className="gap-2"
            disabled={isLoading}
          >
            {editId != null ? (
              <>
                <Check className="w-4 h-4" /> Update
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add
              </>
            )}
          </Button>
        </div>
        {editId != null && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditId(null);
              setForm({
                perm_key: "",
                perm_name: "",
                category: "",
                description: "",
              });
            }}
          >
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        )}

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  ID
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Key
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Category
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {perms.map((p) => (
                <tr
                  key={p.permission_id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-3 py-2 text-foreground">
                    {p.permission_id}
                  </td>
                  <td className="px-3 py-2 text-foreground font-mono text-xs">
                    {p.perm_key}
                  </td>
                  <td className="px-3 py-2 text-foreground">{p.perm_name}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{p.category || "—"}</Badge>
                  </td>
                  <td className="px-3 py-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditId(p.permission_id);
                        setForm({
                          perm_key: p.perm_key,
                          perm_name: p.perm_name,
                          category: p.category || "",
                          description: p.description || "",
                        });
                      }}
                      disabled={isLoading}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={async () => {
                        try {
                          await amPermissions.remove(p.permission_id);
                          toast({ title: "Removed" });
                          await reload();
                        } catch (error) {
                          toast({
                            title: "Failed to remove permission",
                            description:
                              error instanceof Error
                                ? error.message
                                : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Role ↔ Permissions Tab (matrix) ────────────────────────────────

function RolePermsTab({ onRefresh, toast, isActive }: TabProps) {
  const [roles, setRoles] = useState<AMRole[]>([]);
  const [perms, setPerms] = useState<AMPermission[]>([]);
  const [rps, setRps] = useState<AMRolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesList, permsList, rpsList] = await Promise.all([
        amRoles.list(),
        amPermissions.list(),
        amRolePermissions.list(),
      ]);
      setRoles(rolesList);
      setPerms(permsList);
      setRps(rpsList);
      setHasLoaded(true);
    } catch (error) {
      toast({
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const isAllowed = (roleId: number, permId: number) =>
    rps.some(
      (rp) =>
        rp.role_id === roleId && rp.permission_id === permId && rp.is_allowed,
    );

  const toggle = async (roleId: number, permId: number) => {
    if (isLoading) return;
    const currentlyAllowed = isAllowed(roleId, permId);
    const newAllowed = !currentlyAllowed;

    setIsLoading(true);
    try {
      await amRolePermissions.set(roleId, permId, newAllowed);
      await loadData();
      toast({ title: `Permission ${newAllowed ? "granted" : "revoked"}` });
    } catch (error) {
      toast({
        title: "Failed to update permission",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Role ↔ Permission Matrix</CardTitle>
        <CardDescription>
          Toggle which permissions each role has
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Role
                </th>
                {perms.map((p) => (
                  <th
                    key={p.permission_id}
                    className="px-3 py-2 text-center font-medium text-muted-foreground"
                  >
                    {p.perm_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr
                  key={r.role_id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-3 py-2 text-foreground font-medium">
                    {r.role_name}
                  </td>
                  {perms.map((p) => (
                    <td key={p.permission_id} className="px-3 py-2 text-center">
                      <Checkbox
                        checked={isAllowed(r.role_id, p.permission_id)}
                        onCheckedChange={() =>
                          toggle(r.role_id, p.permission_id)
                        }
                        disabled={isLoading}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── User ↔ Role Tab ────────────────────────────────────────────────

function UserRolesTab({ onRefresh, toast, isActive }: TabProps) {
  const [users, setUsers] = useState<AMUser[]>([]);
  const [roles, setRoles] = useState<AMRole[]>([]);
  const [urs, setUrs] = useState<AMUserRole[]>([]);
  const [selUser, setSelUser] = useState("");
  const [selRole, setSelRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersList, rolesList, ursList] = await Promise.all([
        amUsers.list(),
        amRoles.list(),
        amUserRoles.list(),
      ]);
      setUsers(usersList);
      setRoles(rolesList);
      setUrs(ursList);
      setHasLoaded(true);
    } catch (error) {
      toast({
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const assign = async () => {
    if (!selUser || !selRole) {
      toast({ title: "Select user and role", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await amUserRoles.assign(Number(selUser), Number(selRole));
      toast({ title: "Role assigned" });
      await loadData();
    } catch (error) {
      toast({
        title: "Failed to assign role",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">User ↔ Role Assignments</CardTitle>
        <CardDescription>Assign roles to users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1 min-w-[180px]">
            <Label>User</Label>
            <Select value={selUser} onValueChange={setSelUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.user_id} value={String(u.user_id)}>
                    {u.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[180px]">
            <Label>Role</Label>
            <Select value={selRole} onValueChange={setSelRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.role_id} value={String(r.role_id)}>
                    {r.role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={assign} className="gap-2" disabled={isLoading}>
            <Plus className="w-4 h-4" /> Assign
          </Button>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  User
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Assigned At
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {urs.map((ur) => {
                const user = users.find((u) => u.user_id === ur.user_id);
                const role = roles.find((r) => r.role_id === ur.role_id);
                return (
                  <tr
                    key={`${ur.user_id}-${ur.role_id}`}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 text-foreground">
                      {user?.username || ur.user_id}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {role?.role_name || ur.role_id}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {new Date(ur.assigned_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={async () => {
                          try {
                            await amUserRoles.unassign(ur.user_id, ur.role_id);
                            toast({ title: "Unassigned" });
                            await loadData();
                          } catch (error) {
                            toast({
                              title: "Failed to unassign role",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Unknown error",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {urs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No assignments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── User ↔ Permission Overrides Tab ────────────────────────────────

function UserPermsTab({ onRefresh, toast, isActive }: TabProps) {
  const [users, setUsers] = useState<AMUser[]>([]);
  const [perms, setPerms] = useState<AMPermission[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [ups, setUps] = useState<AMUserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersList, permsList, upsList] = await Promise.all([
        amUsers.list(),
        amPermissions.list(),
        amUserPermissions.list(),
      ]);
      setUsers(usersList);
      setPerms(permsList);
      setUps(upsList);
      setHasLoaded(true);
    } catch (error) {
      toast({
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const userId = selectedUser ? Number(selectedUser) : null;
  const userOverrides = userId ? ups.filter((up) => up.user_id === userId) : [];
  const [effectivePerms, setEffectivePerms] = useState<
    (AMPermission & { is_allowed: boolean; source: "user" | "role" })[]
  >([]);

  useEffect(() => {
    if (userId) {
      getEffectivePermissionsForUser(userId)
        .then(setEffectivePerms)
        .catch((error) => {
          toast({
            title: "Failed to load effective permissions",
            description:
              error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
        });
    }
  }, [userId, toast]);

  const toggleOverride = async (permId: number) => {
    if (!userId || isLoading) return;
    const existing = userOverrides.find((up) => up.permission_id === permId);
    setIsLoading(true);
    try {
      if (existing) {
        if (existing.is_allowed) {
          await amUserPermissions.set(userId, permId, false);
        } else {
          await amUserPermissions.remove(userId, permId);
        }
      } else {
        await amUserPermissions.set(userId, permId, true);
      }
      toast({ title: "Override updated" });
      await loadData();
    } catch (error) {
      toast({
        title: "Failed to update override",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">User Permission Overrides</CardTitle>
        <CardDescription>
          Override role-based permissions for individual users. Shows effective
          access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-1">
          <Label>Select User</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Choose user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.user_id} value={String(u.user_id)}>
                  {u.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {userId && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Permission
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                    Role Access
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                    Override
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                    Effective
                  </th>
                </tr>
              </thead>
              <tbody>
                {effectivePerms.map((ep) => {
                  const override = userOverrides.find(
                    (up) => up.permission_id === ep.permission_id,
                  );
                  return (
                    <tr
                      key={ep.permission_id}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 text-foreground">
                        {ep.perm_name}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{ep.category || "—"}</Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {ep.source === "role" ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-200">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleOverride(ep.permission_id)}
                          disabled={isLoading}
                        >
                          {override
                            ? override.is_allowed
                              ? "✓ Allow"
                              : "✗ Deny"
                            : "— None"}
                        </Button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {ep.is_allowed ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-200">
                            Allowed
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Denied</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Security Flags Tab ─────────────────────────────────────────────

function SecurityTab({ onRefresh, toast, isActive }: TabProps) {
  const [users, setUsers] = useState<AMUser[]>([]);
  const [flags, setFlags] = useState<AMUserSecurityFlags[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersList, flagsList] = await Promise.all([
        amUsers.list(),
        amSecurityFlags.list(),
      ]);
      setUsers(usersList);
      setFlags(flagsList);
      setHasLoaded(true);
    } catch (error) {
      toast({
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const getFlag = (userId: number) =>
    flags.find((f) => f.user_id === userId) || {
      is_admin: false,
      bypass_otp: false,
      is_guest: false,
      mfa_enrolled: false,
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Security Flags</CardTitle>
        <CardDescription>
          Admin access, OTP bypass, and MFA enrollment per user
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  User
                </th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                  Admin Access
                </th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                  Bypass OTP
                </th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                  Guest Access
                </th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                  MFA Enrolled
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const f = getFlag(u.user_id);
                return (
                  <tr
                    key={u.user_id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 text-foreground font-medium">
                      {u.username}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={f.is_admin}
                        onCheckedChange={async (v) => {
                          setIsLoading(true);
                          try {
                            await amSecurityFlags.set(u.user_id, {
                              is_admin: v,
                            });
                            toast({ title: "Updated" });
                            await loadData();
                          } catch (error) {
                            toast({
                              title: "Failed to update security flags",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Unknown error",
                              variant: "destructive",
                            });
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={f.bypass_otp}
                        onCheckedChange={async (v) => {
                          setIsLoading(true);
                          try {
                            await amSecurityFlags.set(u.user_id, {
                              bypass_otp: v,
                            });
                            toast({ title: "Updated" });
                            await loadData();
                          } catch (error) {
                            toast({
                              title: "Failed to update security flags",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Unknown error",
                              variant: "destructive",
                            });
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={f.is_guest}
                        onCheckedChange={async (v) => {
                          setIsLoading(true);
                          try {
                            await amSecurityFlags.set(u.user_id, {
                              is_guest: v,
                            });
                            toast({ title: "Updated" });
                            await loadData();
                          } catch (error) {
                            toast({
                              title: "Failed to update security flags",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Unknown error",
                              variant: "destructive",
                            });
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={f.mfa_enrolled}
                        onCheckedChange={async (v) => {
                          setIsLoading(true);
                          try {
                            await amSecurityFlags.set(u.user_id, {
                              mfa_enrolled: v,
                            });
                            toast({ title: "Updated" });
                            await loadData();
                          } catch (error) {
                            toast({
                              title: "Failed to update security flags",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Unknown error",
                              variant: "destructive",
                            });
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      />
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
