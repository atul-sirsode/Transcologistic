import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionMiddleware } from "@/lib/subscription-middleware";
import { useCountdown } from "@/contexts/CountdownContext";
import type { Subscription } from "@/models/subscription";

interface SubscriptionCheckResult {
  isValid: boolean;
  isExpired: boolean;
  daysRemaining: number;
  subscription: Subscription | null;
}

/**
 * Hook for components to check subscription status with countdown timer
 */
export function useSubscriptionWithCountdown() {
  const { username, logout } = useAuth();
  const { startCountdown, stopCountdown, resetCountdown } = useCountdown();

  const checkSubscription = async (): Promise<SubscriptionCheckResult> => {
    if (!username) {
      return {
        isValid: false,
        isExpired: true,
        daysRemaining: 0,
        subscription: null,
      };
    }

    const result = await subscriptionMiddleware.checkSubscription(username);

    // Initialize middleware on first check if not already done
    subscriptionMiddleware.initialize(logout);

    // Handle countdown for expired subscriptions
    if (result.isExpired) {
      startCountdown(
        Math.floor(subscriptionMiddleware["LOGOUT_DELAY_MS"] / 1000),
        "Your subscription has expired. You will be logged out",
      );
    } else {
      stopCountdown();
    }

    return result;
  };

  return { checkSubscription };
}
