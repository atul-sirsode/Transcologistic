export interface Subscription {
  id: string;
  username: string;
  start_date: string; // DATE string YYYY-MM-DD
  validity_days: number;
  end_date: string; // computed by DB trigger
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInput {
  username: string;
  start_date: string;
  validity_days: number;
}
