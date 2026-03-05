import { getMongoApiBaseUrl } from "@/config/db-provider";
import type { Subscription, SubscriptionInput } from "@/models/subscription";

// ─── Repository Interface ────────────────────────────────────────
export interface ISubscriptionRepository {
  upsert(data: SubscriptionInput): Promise<Subscription>;
  getByUsername(username: string): Promise<Subscription | null>;
  getAll(): Promise<Subscription[]>;
}

// ─── MongoDB REST API Implementation ─────────────────────────────
interface UserSubscriptionsResponse {
  status: boolean;
  message: string;
  data: {
    subscriptions: Subscription[];
    total: number;
    page: number;
    limit: number;
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getMongoApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error (${res.status}): ${body}`);
  }
  return res.json();
}

class MongoSubscriptionRepository implements ISubscriptionRepository {
  async upsert(data: SubscriptionInput): Promise<Subscription> {
    return apiFetch<Subscription>("/user-subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getByUsername(username: string): Promise<Subscription | null> {
    try {
      return await apiFetch<Subscription>(
        `/user-subscriptions/${encodeURIComponent(username)}`,
      );
    } catch {
      return null;
    }
  }

  async getAll(): Promise<Subscription[]> {
    try {
      const response = await apiFetch<UserSubscriptionsResponse>(
        "/user-subscriptions",
      );
      // Extract subscriptions array from nested response structure
      const subscriptions = response?.data?.subscriptions || [];
      return Array.isArray(subscriptions) ? subscriptions : [];
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
      return [];
    }
  }
}

// ─── Service Layer ───────────────────────────────────────────────
export class SubscriptionService {
  constructor(
    private repo: ISubscriptionRepository = new MongoSubscriptionRepository(),
  ) {}

  async saveSubscription(input: SubscriptionInput): Promise<Subscription> {
    return this.repo.upsert(input);
  }

  async getSubscription(username: string): Promise<Subscription | null> {
    return this.repo.getByUsername(username);
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return this.repo.getAll();
  }

  getDaysRemaining(subscription: Subscription): number {
    const end = new Date(subscription.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  shouldShowWarning(subscription: Subscription): boolean {
    const days = this.getDaysRemaining(subscription);
    return days >= 0 && days <= 7;
  }

  isExpired(subscription: Subscription): boolean {
    return this.getDaysRemaining(subscription) < 0;
  }
}

export const subscriptionService = new SubscriptionService();
