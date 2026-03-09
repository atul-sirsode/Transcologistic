// Auto Adjust Amount Service
// Handles CRUD operations for auto adjust amount settings

import { httpClient } from "@/lib/http-client";

export interface AutoAdjustAmount {
  id?: number;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AutoAdjustAmountResponse {
  status: boolean;
  message?: string;
  data?: AutoAdjustAmount;
  error?: string;
}

class AutoAdjustAmountService {
  private readonly endpoint = "/api/auto-adjust-amount";

  /**
   * Get the current auto adjust amount
   */
  async getAmount(): Promise<AutoAdjustAmount | null> {
    try {
      const response = await httpClient.get<AutoAdjustAmountResponse>(
        `${this.endpoint}/1`,
      );

      // HTTP client returns data directly, handle both wrapped and unwrapped responses
      if (response && typeof response === "object") {
        // If response has data property, use it; otherwise assume response is the data itself
        return (
          "data" in response ? response.data : response
        ) as AutoAdjustAmount;
      }

      return null;
    } catch (error) {
      console.error("Failed to fetch auto adjust amount:", error);
      return null;
    }
  }

  /**
   * Update the auto adjust amount
   */
  async updateAmount(amount: number): Promise<boolean> {
    try {
      const response = await httpClient.put<AutoAdjustAmountResponse>(
        `${this.endpoint}/1`,
        { amount },
      );
      console.log("response", response);

      // HTTP client returns data directly, check if we got the updated amount back
      if (response && typeof response === "object") {
        // If response has amount field, it means the update was successful
        return "amount" in response || "status" in response;
      }

      return false;
    } catch (error) {
      console.error("Failed to update auto adjust amount:", error);
      return false;
    }
  }

  /**
   * Validate the auto adjust amount
   */
  validateAmount(amount: string | number): {
    isValid: boolean;
    error?: string;
  } {
    const numAmount = typeof amount === "string" ? Number(amount) : amount;

    if (!amount || isNaN(numAmount)) {
      return {
        isValid: false,
        error: "Amount must be a valid number",
      };
    }

    if (numAmount < 2000) {
      return {
        isValid: false,
        error: "Amount must be equal to or greater than 2000",
      };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const autoAdjustAmountService = new AutoAdjustAmountService();

// Export the service class for potential dependency injection
export { AutoAdjustAmountService };
