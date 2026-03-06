import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionMiddleware } from "@/lib/subscription-middleware";
import { useCountdown } from "@/contexts/CountdownContext";
import { useNavigate } from "react-router-dom";

interface SubscriptionProtectionProps {
  children: React.ReactNode;
}

/**
 * Component that protects routes based on subscription status
 * Redirects to login if subscription is expired
 */
export function SubscriptionProtection({
  children,
}: SubscriptionProtectionProps) {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const { startCountdown, stopCountdown } = useCountdown();
  const [isChecking, setIsChecking] = useState(true);
  const [isValid, setIsValid] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!username || initialized) {
      if (!username) {
        setIsChecking(false);
        setIsValid(false);
      }
      return;
    }

    const checkSubscriptionStatus = async () => {
      try {
        const result = await subscriptionMiddleware.checkSubscription(username);

        // Initialize middleware with logout callback and countdown callbacks only once
        if (!initialized) {
          subscriptionMiddleware.initialize(logout, {
            onCountdownStart: startCountdown,
            onCountdownStop: stopCountdown,
          });
          setInitialized(true);
        }

        if (result.isExpired) {
          setIsValid(false);
          // The middleware will handle the countdown and delayed logout
        } else {
          setIsValid(true);
          // Stop any active countdown when subscription is valid
          stopCountdown();
        }
      } catch (error) {
        console.error(
          "SubscriptionProtection: Error checking subscription:",
          error,
        );
        setIsValid(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkSubscriptionStatus();
  }, [username, logout, navigate, initialized, startCountdown, stopCountdown]);

  // Show loading while checking subscription
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not valid
  if (!isValid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-lg font-semibold mb-2">Subscription Expired</h2>
          <p className="text-muted-foreground mb-4">
            Your subscription has expired. You will be redirected to the login
            page shortly.
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
