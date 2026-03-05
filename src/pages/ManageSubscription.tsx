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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Save, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getAdminSettings } from "@/lib/admin-settings";
import { subscriptionService } from "@/services/subscription-service";
import type { Subscription } from "@/models/subscription";

export default function ManageSubscription() {
  const { toast } = useToast();
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [validityDays, setValidityDays] = useState("30");
  const [saving, setSaving] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settings = getAdminSettings();
    setUsers(settings.users.map((u) => u.username));
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getAllSubscriptions();
      // Ensure data is an array before setting it
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  // When user is selected, load their existing subscription
  useEffect(() => {
    if (!selectedUser) return;
    const existing = subscriptions.find((s) => s.username === selectedUser);
    if (existing) {
      setStartDate(new Date(existing.start_date));
      setValidityDays(String(existing.validity_days));
    } else {
      setStartDate(undefined);
      setValidityDays("30");
    }
  }, [selectedUser, subscriptions]);

  const handleSave = async () => {
    if (!selectedUser || !startDate || !validityDays) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await subscriptionService.saveSubscription({
        username: selectedUser,
        start_date: format(startDate, "yyyy-MM-dd"),
        validity_days: parseInt(validityDays),
      });
      toast({ title: "Subscription saved successfully" });
      await loadSubscriptions();
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "An unknown error occurred";
      toast({
        title: "Error saving subscription",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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
                <Users className="w-4 h-4" /> Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Subscription"}
              </Button>
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
              ) : !Array.isArray(subscriptions) ||
                subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subscriptions found
                </p>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => {
                    const daysLeft = subscriptionService.getDaysRemaining(sub);
                    const expired = daysLeft < 0;
                    const warning = daysLeft >= 0 && daysLeft <= 7;
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                      >
                        <div>
                          <p className="font-medium text-sm">{sub.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {sub.start_date} → {sub.end_date} (
                            {sub.validity_days}d)
                          </p>
                        </div>
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
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
