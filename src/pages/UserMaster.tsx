import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Trash2, Shield, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { getAdminSettings, saveAdminSettings, AdminSettings, UserAccess, getAllMenuItems } from '@/lib/admin-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export default function UserMaster() {
  const [settings, setSettings] = useState<AdminSettings>(getAdminSettings());
  const { toast } = useToast();
  const menuItems = getAllMenuItems();

  const [newUsername, setNewUsername] = useState('');

  const save = (updated: AdminSettings) => {
    setSettings(updated);
    saveAdminSettings(updated);
    toast({ title: 'User settings saved' });
  };

  const addUser = () => {
    if (!newUsername.trim()) return;
    if (settings.users.find(u => u.username === newUsername.trim())) {
      toast({ title: 'User already exists', variant: 'destructive' });
      return;
    }
    const updated = {
      ...settings,
      users: [
        ...settings.users,
        {
          username: newUsername.trim(),
          bypassOTP: false,
          allowedMenus: ['rc-verification'],
          isAdmin: false,
        } as UserAccess,
      ],
    };
    save(updated);
    setNewUsername('');
  };

  const removeUser = (username: string) => {
    save({ ...settings, users: settings.users.filter(u => u.username !== username) });
  };

  const updateUser = (username: string, patch: Partial<UserAccess>) => {
    save({
      ...settings,
      users: settings.users.map(u => (u.username === username ? { ...u, ...patch } : u)),
    });
  };

  const toggleUserMenu = (username: string, menuId: string) => {
    const user = settings.users.find(u => u.username === username);
    if (!user) return;
    const menus = user.allowedMenus.includes(menuId)
      ? user.allowedMenus.filter(m => m !== menuId)
      : [...user.allowedMenus, menuId];
    updateUser(username, { allowedMenus: menus });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Master</h1>
              <p className="text-sm text-muted-foreground">Manage user access, OTP bypass, and menu permissions</p>
            </div>
          </div>
        </motion.div>

        {/* Add User */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add New User</CardTitle>
              <CardDescription>Enter a username to manage their access and menu permissions. No password required.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-foreground">Username</Label>
                  <Input
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="Enter username"
                    onKeyDown={e => e.key === 'Enter' && addUser()}
                  />
                </div>
                <Button onClick={addUser} className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" /> Add User
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* User List */}
        <div className="space-y-4">
          {settings.users.map((user, index) => (
            <motion.div
              key={user.username}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.03 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      {/* User header */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          {user.isAdmin ? (
                            <ShieldCheck className="w-4 h-4 text-primary" />
                          ) : (
                            <Shield className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground text-base">{user.username}</span>
                          {user.isAdmin && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Toggles */}
                      <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={user.bypassOTP}
                            onCheckedChange={(v) => updateUser(user.username, { bypassOTP: v })}
                          />
                          <Label className="text-sm text-foreground">Bypass OTP</Label>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={user.isAdmin}
                            onCheckedChange={(v) => updateUser(user.username, { isAdmin: v })}
                          />
                          <Label className="text-sm text-foreground">Admin Access</Label>
                        </div>
                      </div>

                      {/* Menu Access */}
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">Menu Access</Label>
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          {menuItems.map((menu) => (
                            <label key={menu.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                              <Checkbox
                                checked={user.allowedMenus.includes(menu.id)}
                                onCheckedChange={() => toggleUserMenu(user.username, menu.id)}
                              />
                              {menu.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUser(user.username)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {settings.users.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground mb-1">No Users</p>
              <p className="text-sm">Add a user above to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
