import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionService } from "@/services/subscription-service";

export function useSubscriptionExpired(): boolean {
  const { username } = useAuth();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!username) return;
    subscriptionService.getSubscription(username).then((sub) => {
      if (sub) {
        setExpired(subscriptionService.isExpired(sub));
      }
    });
  }, [username]);

  return expired;
}
