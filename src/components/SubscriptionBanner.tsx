import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionService } from "@/services/subscription-service";
import type { Subscription } from "@/models/subscription";

export function SubscriptionBanner() {
  const { username } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!username) return;
    subscriptionService.getSubscription(username).then(setSub);
  }, [username]);

  if (!sub || dismissed) return null;

  const daysLeft = subscriptionService.getDaysRemaining(sub);
  const expired = subscriptionService.isExpired(sub);
  const warning = subscriptionService.shouldShowWarning(sub);

  if (!expired && !warning) return null;

  return (
    <Alert variant="destructive" className="mb-4 relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {expired ? "Subscription Expired" : "Subscription Expiring Soon"}
      </AlertTitle>
      <AlertDescription>
        {expired
          ? "Your subscription has expired. Please subscribe to continue using the app."
          : `Your subscription ends within ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Subscribe to continue using the app.`}
      </AlertDescription>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-destructive hover:opacity-70"
      >
        <X className="w-4 h-4" />
      </button>
    </Alert>
  );
}
