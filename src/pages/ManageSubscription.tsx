import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Save, Users, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { subscriptionService } from "@/services/subscription-service";
import type { Subscription } from "@/models/subscription";
import type { ActiveUser } from "@/services/subscription-service";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManageSubscription() {
  const { toast } = useToast();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [validityDays, setValidityDays] = useState("30");
  const [saving, setSaving] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadSubscriptions();
  }, []);

  const loadUsers = async () => {
    const users = await subscriptionService.getActiveUsers();
    setActiveUsers(users);
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getAllSubscriptions();
      console.log("subs data", data);
      setSubscriptions(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // When user is selected, load their existing subscription
  useEffect(() => {
    if (!selectedUser || editingId) return;
    const existing = subscriptions.find((s) => s.username === selectedUser);
    if (existing) {
      setStartDate(new Date(existing.start_date));
      setValidityDays(String(existing.validity_days));
    } else {
      setStartDate(undefined);
      setValidityDays("30");
    }
  }, [selectedUser, subscriptions, editingId]);

  const resetForm = () => {
    setSelectedUser("");
    setStartDate(undefined);
    setValidityDays("30");
    setEditingId(null);
  };

  const handleEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setSelectedUser(sub.username);
    setStartDate(new Date(sub.start_date));
    setValidityDays(String(sub.validity_days));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await subscriptionService.deleteSubscription(deleteTarget.id);
      toast({ title: "Subscription deleted successfully" });
      await loadSubscriptions();
      if (editingId === deleteTarget.id) resetForm();
    } catch (e: unknown) {
      toast({
        title: "Error deleting subscription",
        description:
          e instanceof Error ? e.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = async () => {
    if (!selectedUser || !startDate || !validityDays) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const input = {
        username: selectedUser,
        start_date: format(startDate, "yyyy-MM-dd"),
        validity_days: parseInt(validityDays),
      };
      if (editingId) {
        await subscriptionService.updateSubscription(editingId, input);
        toast({ title: "Subscription updated successfully" });
      } else {
        await subscriptionService.saveSubscription(input);
        toast({ title: "Subscription saved successfully" });
      }
      resetForm();
      await loadSubscriptions();
    } catch (e: unknown) {
      const error = e as Error;
      toast({
        title: "Error saving subscription",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const userOptions = activeUsers.map((u) => ({
    label: u.username || u.email,
    value: u.email,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Manage Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign and manage user subscriptions
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />{" "}
                {editingId ? "Edit Subscription" : "Subscription Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <SearchableSelect
                  value={selectedUser}
                  onValueChange={setSelectedUser}
                  placeholder="Choose a user..."
                  disabled={!!editingId}
                  options={userOptions}
                />
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Subscription Validity (days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>

              {startDate && validityDays && (
                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">End Date:</span>{" "}
                    <span className="font-medium">
                      {format(
                        new Date(
                          startDate.getTime() +
                            parseInt(validityDays || "0") * 86400000,
                        ),
                        "PPP",
                      )}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Subscription"
                      : "Save Subscription"}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subscriptions found
                </p>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => {
                    const daysLeft = subscriptionService.getDaysRemaining(sub);
                    const expired = subscriptionService.isExpired(sub);
                    const warning = daysLeft > 0 && daysLeft <= 7;
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {sub.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sub.start_date} → {sub.end_date} (
                            {sub.validity_days}d)
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={
                              expired
                                ? "destructive"
                                : warning
                                  ? "secondary"
                                  : "default"
                            }
                          >
                            {expired ? "Expired" : `${daysLeft}d left`}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(sub)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(sub)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the subscription for{" "}
              <strong>{deleteTarget?.username}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
