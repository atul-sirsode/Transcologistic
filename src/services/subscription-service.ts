import type { Subscription, SubscriptionInput } from "@/models/subscription";
import { httpClient } from "@/lib/http-client";

export interface ActiveUser {
  email: string;
  display_name: string;
  username: string;
}

interface ApiResponse<T> {
  data: T;
}

interface WrappedUserResponse {
  data: ActiveUser[];
}

class SubscriptionService {
  private basePath = "/api/user-subscriptions";

  async getActiveUsers(): Promise<ActiveUser[]> {
    try {
      const raw = await httpClient.get<ActiveUser[]>(
        "/api/users/get-all-active-users",
      );

      // Handle wrapped responses
      if (raw && "data" in raw && Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw)) return raw;
      return [];
    } catch {
      return [];
    }
  }

  async getSubscription(username: string): Promise<Subscription | null> {
    try {
      return await httpClient.get<Subscription>(
        `${this.basePath}/${encodeURIComponent(username)}`,
      );
    } catch {
      return null;
    }
  }

  async saveSubscription(input: SubscriptionInput): Promise<Subscription> {
    return httpClient.post<Subscription>(this.basePath, input);
  }

  async updateSubscription(
    id: string,
    input: SubscriptionInput,
  ): Promise<Subscription> {
    return httpClient.put<Subscription>(`${this.basePath}/${id}`, input);
  }

  async deleteSubscription(id: string): Promise<void> {
    await httpClient.delete<void>(`${this.basePath}/${id}`);
  }

  async getAllSubscriptions(page = 1, limit = 10): Promise<Subscription[]> {
    try {
      const raw = await httpClient.get<{
        subscriptions: Subscription[];
      }>(`/api/user-subscriptions?page=${page}&limit=${limit}`);

      if (raw && Array.isArray(raw.subscriptions)) {
        return raw.subscriptions;
      }

      return [];
    } catch {
      return [];
    }
  }

  isExpired(sub: Subscription): boolean {
    return new Date(sub.end_date) < new Date();
  }

  getDaysRemaining(sub: Subscription): number {
    const diff = new Date(sub.end_date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  shouldShowWarning(sub: Subscription, warningDays = 7): boolean {
    const days = this.getDaysRemaining(sub);
    return days > 0 && days <= warningDays;
  }
}

export const subscriptionService = new SubscriptionService();
