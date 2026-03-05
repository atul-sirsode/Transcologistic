/**
 * MongoDB FastTag Models
 * TypeScript types matching the MongoDB/Mongoose schema for FastTag operations.
 * These mirror the user's existing Mongoose "User" model structure.
 */

// ─── Transaction (embedded document) ─────────────────────────────

export interface MongoFastTagTransaction {
  id: string;
  nature: string; // 'Debit' | 'Credit'
  amount: string; // stored as string in MongoDB
  closingBalance?: number;
  description: string;
  processingTime?: string;
  transactionTime: string;
}

// ─── Main Document ───────────────────────────────────────────────

export interface MongoFastTagDocument {
  _id: string; // MongoDB ObjectId as string
  formType: string; // e.g. 'fasttag'
  vehicleNumber: string;
  openingBalance: number;
  ownerName?: string;
  mobile?: string;
  carModel?: string;
  bank?: string;
  transactions: MongoFastTagTransaction[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// ─── Input types (for create/update) ─────────────────────────────

export interface MongoFastTagCreateInput {
  formType: string;
  vehicleNumber: string;
  openingBalance: number;
  ownerName?: string;
  mobile?: string;
  carModel?: string;
  bank?: string;
  transactions?: MongoFastTagTransaction[];
}

export interface MongoFastTagUpdateInput {
  ownerName?: string;
  mobile?: string;
  carModel?: string;
  bank?: string;
  openingBalance?: number;
  transactions?: MongoFastTagTransaction[];
}

// ─── Filter for queries ──────────────────────────────────────────

export interface MongoFastTagFilter {
  bank?: string;
  vehicleNumber?: string;
  formType?: string;
  startDate?: string; // ISO date
  endDate?: string; // ISO date
}

// ─── Paginated response ──────────────────────────────────────────

export interface MongoFastTagPaginatedResponse {
  data: MongoFastTagDocument[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}
