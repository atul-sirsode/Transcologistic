// Banks API Client
// Handles CRUD operations for banks

import { httpClient } from "./http-client";

export interface Bank {
  bank_id: number;
  code: string;
  bank_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface BankApiResponse {
  bank_id: number;
  code: string;
  name: string;
  enabled: number;
  created_at?: string;
  updated_at?: string;
}

function mapBankFromApi(apiBank: BankApiResponse): Bank {
  const mapped = {
    bank_id: apiBank.bank_id,
    code: apiBank.code,
    bank_name: apiBank.name,
    is_active: apiBank.enabled === 1,
    created_at: apiBank.created_at,
    updated_at: apiBank.updated_at,
  };
  return mapped;
}

// ── Banks API ────────────────────────────────────────────────────

export const banksApi = {
  list: async (): Promise<Bank[]> => {
    const response = await httpClient.get<BankApiResponse[]>("/api/banks");
    return response.map(mapBankFromApi);
  },

  create: async (bankName: string): Promise<Bank> => {
    const response = await httpClient.post<BankApiResponse>(
      "/api/banks/create",
      {
        name: bankName,
        enabled: 1,
      },
    );
    return mapBankFromApi(response);
  },

  update: async (bank_id: number, isActive: boolean): Promise<void> => {
    await httpClient.put<void>("/api/banks/update", {
      bank_id: bank_id,
      enabled: isActive ? 1 : 0,
    });
  },

  delete: async (bank_id: number): Promise<void> => {
    if (!bank_id || isNaN(Number(bank_id))) {
      throw new Error("Invalid bank ID provided");
    }

    const payload = { bank_id: Number(bank_id) };

    await httpClient.delete<void>("/api/banks/delete", payload);
  },
};
