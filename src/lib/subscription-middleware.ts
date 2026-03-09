import { useAuth } from "@/contexts/AuthContext";
import { subscriptionService } from "@/services/subscription-service";
import type { Subscription } from "@/models/subscription";
import { useCountdown } from "@/contexts/CountdownContext";

interface SubscriptionCheckResult {
  isValid: boolean;
  isExpired: boolean;
  daysRemaining: number;
  subscription: Subscription | null;
}

/**
 * Generic subscription middleware service
 * Handles subscription expiration logic across the application
 */
interface SubscriptionMiddlewareCallbacks {
  onCountdownStart?: (seconds: number, message: string) => void;
  onCountdownStop?: () => void;
}

class SubscriptionMiddleware {
  private static instance: SubscriptionMiddleware;
  private checkInterval: NodeJS.Timeout | null = null;
  private logoutCallback?: () => void;
  private callbacks?: SubscriptionMiddlewareCallbacks;
  private readonly CHECK_INTERVAL_MS = 10000; // 10 seconds
  private readonly LOGOUT_DELAY_MS = 10000; // 10 seconds after expiration

  // Cache to prevent redundant checks
  private lastCheckTime = 0;
  private lastCheckResult: SubscriptionCheckResult | null = null;
  private readonly CACHE_DURATION_MS = 3000; // 3 seconds cache

  private constructor() {}

  static getInstance(): SubscriptionMiddleware {
    if (!SubscriptionMiddleware.instance) {
      SubscriptionMiddleware.instance = new SubscriptionMiddleware();
    }
    return SubscriptionMiddleware.instance;
  }

  /**
   * Initialize the middleware with logout callback and countdown callbacks
   */
  initialize(
    logoutCallback: () => void,
    callbacks?: SubscriptionMiddlewareCallbacks,
  ) {
    this.logoutCallback = logoutCallback;
    this.callbacks = callbacks;
    this.startPeriodicCheck();
  }

  /**
   * Check user subscription status with caching
   */
  async checkSubscription(username: string): Promise<SubscriptionCheckResult> {
    const now = Date.now();

    // Return cached result if still valid
    if (
      this.lastCheckResult &&
      now - this.lastCheckTime < this.CACHE_DURATION_MS
    ) {
      return this.lastCheckResult;
    }

    try {
      const subscription = await subscriptionService.getSubscription(username);

      if (!subscription) {
        const result = {
          isValid: false,
          isExpired: true,
          daysRemaining: 0,
          subscription: null,
        };
        this.lastCheckResult = result;
        this.lastCheckTime = now;
        return result;
      }

      const daysRemaining = subscriptionService.getDaysRemaining(subscription);
      const isExpired = subscriptionService.isExpired(subscription);

      const result = {
        isValid: !isExpired,
        isExpired,
        daysRemaining,
        subscription,
      };

      this.lastCheckResult = result;
      this.lastCheckTime = now;
      return result;
    } catch (error) {
      console.error(
        "SubscriptionMiddleware: Error checking subscription:",
        error,
      );
      const result = {
        isValid: false,
        isExpired: true,
        daysRemaining: 0,
        subscription: null,
      };
      this.lastCheckResult = result;
      this.lastCheckTime = now;
      return result;
    }
  }

  /**
   * Handle subscription expiration with delayed logout and countdown
   */
  private handleSubscriptionExpired(username: string) {
    console.log(
      `SubscriptionMiddleware: Subscription expired for user ${username}`,
    );

    // Trigger countdown
    if (this.callbacks?.onCountdownStart) {
      const seconds = Math.floor(this.LOGOUT_DELAY_MS / 1000);
      this.callbacks.onCountdownStart(
        seconds,
        "Your subscription has expired. You will be logged out",
      );
    }

    // Schedule logout after delay
    setTimeout(() => {
      if (this.logoutCallback) {
        console.log(
          "SubscriptionMiddleware: Logging out user due to expired subscription",
        );
        this.logoutCallback();
      }
    }, this.LOGOUT_DELAY_MS);
  }

  /**
   * Start periodic subscription checks
   */
  private startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      // Get current username from session storage
      const username = sessionStorage.getItem("username");
      if (!username) return;

      const result = await this.checkSubscription(username);

      if (result.isExpired) {
        this.handleSubscriptionExpired(username);
        this.stopPeriodicCheck(); // Stop checking after expiration detected
      }
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop periodic subscription checks
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Cleanup method
   */
  destroy() {
    this.stopPeriodicCheck();
    this.logoutCallback = undefined;
    this.lastCheckResult = null;
    this.lastCheckTime = 0;
  }
}

export const subscriptionMiddleware = SubscriptionMiddleware.getInstance();

/**
 * Hook for components to check subscription status
 */
export function useSubscriptionCheck() {
  const { username, logout } = useAuth();

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

    return result;
  };

  return { checkSubscription };
}
