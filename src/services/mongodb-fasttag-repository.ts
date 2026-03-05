/**
 * MongoDB FastTag Repository
 *
 * Calls an external REST API proxy that connects to MongoDB.
 * Implements the same IFastTagRepository interface so it can be
 * swapped in place of the Supabase implementation.
 */

import { getMongoApiBaseUrl } from "@/config/db-provider";
import type {
  MongoFastTagDocument,
  MongoFastTagCreateInput,
  MongoFastTagUpdateInput,
  MongoFastTagFilter,
  MongoFastTagTransaction,
  MongoFastTagPaginatedResponse,
} from "@/models/mongodb-fasttag";

// ─── Repository Interface ────────────────────────────────────────

export interface IMongoFastTagRepository {
  create(data: MongoFastTagCreateInput): Promise<MongoFastTagDocument>;
  update(
    id: string,
    data: MongoFastTagUpdateInput,
  ): Promise<MongoFastTagDocument>;
  getById(id: string): Promise<MongoFastTagDocument | null>;
  getAll(filter?: MongoFastTagFilter): Promise<MongoFastTagDocument[]>;
  delete(id: string): Promise<void>;
  addTransaction(
    vehicleNumber: string,
    txn: MongoFastTagTransaction,
  ): Promise<MongoFastTagTransaction>;
  removeTransaction(
    documentId: string,
    txnId: string,
  ): Promise<MongoFastTagDocument>;
  updateTransaction(
    documentId: string,
    txnId: string,
    txn: Partial<MongoFastTagTransaction>,
  ): Promise<MongoFastTagDocument>;
  getByFormTypeAndDateRange(
    formType: string,
    startDate: string,
    endDate: string,
    page: number,
    limit: number,
  ): Promise<MongoFastTagPaginatedResponse>;
}

// ─── API Response Types ────────────────────────────────────────

interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

// Raw API response structure for paginated endpoint
interface RawPaginatedResponse {
  fasttags: MongoFastTagDocument[];
  total: number;
  page: number;
  limit: number;
}

// ─── REST API Implementation ─────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getMongoApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MongoDB API error (${res.status}): ${body}`);
  }
  const response = await res.json();

  // Check if response has the wrapped structure { status, message, data }
  if (
    response &&
    typeof response === "object" &&
    "status" in response &&
    "data" in response
  ) {
    return (response as ApiResponse<T>).data;
  }

  // Return raw response if it's not wrapped
  return response;
}

export class MongoFastTagRepository implements IMongoFastTagRepository {
  private basePath = "/fasttag";

  async create(data: MongoFastTagCreateInput): Promise<MongoFastTagDocument> {
    return await apiFetch<MongoFastTagDocument>(this.basePath, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async update(
    id: string,
    data: MongoFastTagUpdateInput,
  ): Promise<MongoFastTagDocument> {
    return await apiFetch<MongoFastTagDocument>(`${this.basePath}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getById(id: string): Promise<MongoFastTagDocument | null> {
    try {
      return await apiFetch<MongoFastTagDocument>(`${this.basePath}/${id}`);
    } catch {
      return null;
    }
  }

  async getAll(filter?: MongoFastTagFilter): Promise<MongoFastTagDocument[]> {
    const params = new URLSearchParams();
    if (filter?.bank) params.set("formType", filter.bank);
    if (filter?.vehicleNumber)
      params.set("vehicleNumber", filter.vehicleNumber);
    if (filter?.formType) params.set("formType", filter.formType);
    if (filter?.startDate) params.set("startDate", filter.startDate);
    if (filter?.endDate) params.set("endDate", filter.endDate);

    const qs = params.toString();
    const raw = await apiFetch<
      MongoFastTagDocument[] | { fasttags: MongoFastTagDocument[] }
    >(`${this.basePath}${qs ? `?${qs}` : ""}`);

    // Handle both response formats: direct array or wrapped object
    if (Array.isArray(raw)) {
      return raw;
    }
    if (
      raw &&
      typeof raw === "object" &&
      "fasttags" in raw &&
      Array.isArray(raw.fasttags)
    ) {
      return raw.fasttags;
    }
    return [];
  }

  async delete(id: string): Promise<void> {
    await apiFetch<void>(`${this.basePath}/${id}`, { method: "DELETE" });
  }

  async addTransaction(
    vehicleNumber: string,
    txn: MongoFastTagTransaction,
  ): Promise<MongoFastTagTransaction> {
    return await apiFetch<MongoFastTagTransaction>(
      `${this.basePath}/${vehicleNumber}/transactions`,
      {
        method: "POST",
        body: JSON.stringify(txn),
      },
    );
  }

  async removeTransaction(
    documentId: string,
    txnId: string,
  ): Promise<MongoFastTagDocument> {
    return await apiFetch<MongoFastTagDocument>(
      `${this.basePath}/${documentId}/transactions/${txnId}`,
      {
        method: "DELETE",
      },
    );
  }

  async updateTransaction(
    documentId: string,
    txnId: string,
    txn: Partial<MongoFastTagTransaction>,
  ): Promise<MongoFastTagDocument> {
    return await apiFetch<MongoFastTagDocument>(
      `${this.basePath}/${documentId}/transactions/${txnId}`,
      {
        method: "PUT",
        body: JSON.stringify(txn),
      },
    );
  }

  async getByFormTypeAndDateRange(
    formType: string,
    startDate: string,
    endDate: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<MongoFastTagPaginatedResponse> {
    const raw = await apiFetch<RawPaginatedResponse>(
      `${this.basePath}/formType/${formType}/daterange?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=${limit}`,
    );

    return {
      data: Array.isArray(raw?.fasttags) ? raw.fasttags : [],
      totalRecords: raw?.total ?? 0,
      totalPages: Math.ceil((raw?.total ?? 0) / (raw?.limit ?? limit)),
      currentPage: raw?.page ?? page,
    };
  }
}

// ─── Singleton ───────────────────────────────────────────────────
export const mongoFastTagRepo = new MongoFastTagRepository();
