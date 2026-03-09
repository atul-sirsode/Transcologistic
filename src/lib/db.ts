/**
 * Database Abstraction Layer (Repository Pattern)
 *
 * This module provides a clean interface for database operations,
 * allowing easy switching between different database providers.
 * Currently uses MongoDB as the primary database provider.
 */

import { mongoFastTagRepo } from "@/services/mongodb-fasttag-repository";
import type {
  MongoFastTagDocument,
  MongoFastTagCreateInput,
  MongoFastTagTransaction,
} from "@/models/mongodb-fasttag";

// ─── Types ───────────────────────────────────────────────────────

export interface FastTagSessionData {
  formType: string;
  bank_id: string;
  bank_name: string;
  vehicle_number: string;
  customer_name?: string;
  customer_mobile?: string;
  truck_number?: string;
  truck_owner_name?: string;
  opening_balance: number;
  start_date?: string;
  end_date?: string;
  pdf_url?: string;
}

export interface FastTagSessionRecord extends FastTagSessionData {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface FastTagHistoryData {
  session_id: string;
  processing_time?: string;
  transaction_time?: string;
  nature: "Debit" | "Credit";
  amount: number;
  closing_balance: number;
  description?: string;
  txn_id?: string;
  bankName?: string;
}

export interface FastTagHistoryRecord extends FastTagHistoryData {
  id: string;
  created_at: string;
}

// ─── Repository Interface ────────────────────────────────────────

export interface IFastTagRepository {
  createSession(data: FastTagSessionData): Promise<FastTagSessionRecord>;
  updateSession(
    id: string,
    data: Partial<FastTagSessionData>,
  ): Promise<FastTagSessionRecord>;
  getSession(id: string): Promise<FastTagSessionRecord | null>;
  getSessions(): Promise<FastTagSessionRecord[]>;

  createHistoryEntries(
    vehicleNumber: string,
    entries: FastTagHistoryData[],
  ): Promise<FastTagHistoryRecord[]>;
  getHistoryBySession(sessionId: string): Promise<FastTagHistoryRecord[]>;
  deleteHistoryEntry(id: string): Promise<void>;
}

// ─── MongoDB Implementation ─────────────────────────────────────

class MongoFastTagRepository implements IFastTagRepository {
  async createSession(data: FastTagSessionData): Promise<FastTagSessionRecord> {
    const mongoInput: MongoFastTagCreateInput = {
      formType: "fasttag",
      vehicleNumber: data.vehicle_number,
      openingBalance: data.opening_balance,
      ownerName: data.truck_owner_name || data.customer_name,
      mobile: data.customer_mobile,
      carModel: data.truck_number,
      bank: data.bank_name || data.bank_id,
    };

    const doc = await mongoFastTagRepo.create(mongoInput);
    return this.mongoDocToSession(doc);
  }

  async updateSession(
    id: string,
    data: Partial<FastTagSessionData>,
  ): Promise<FastTagSessionRecord> {
    const doc = await mongoFastTagRepo.update(id, {
      ownerName: data.customer_name || data.truck_owner_name,
      mobile: data.customer_mobile,
      carModel: data.truck_number,
      bank: data.bank_name || data.bank_id,
      openingBalance: data.opening_balance,
    });
    return this.mongoDocToSession(doc);
  }

  async getSession(id: string): Promise<FastTagSessionRecord | null> {
    const doc = await mongoFastTagRepo.getById(id);
    return doc ? this.mongoDocToSession(doc) : null;
  }

  async getSessions(): Promise<FastTagSessionRecord[]> {
    const docs = await mongoFastTagRepo.getAll();
    return docs.map((doc) => this.mongoDocToSession(doc));
  }

  async createHistoryEntries(
    vehicleNumber: string,
    entries: FastTagHistoryData[],
  ): Promise<FastTagHistoryRecord[]> {
    // This would need to be implemented in the MongoDB repo
    // For now, return empty array as placeholder
    console.warn("createHistoryEntries not fully implemented for MongoDB");
    return [];
  }

  async getHistoryBySession(
    sessionId: string,
  ): Promise<FastTagHistoryRecord[]> {
    const doc = await mongoFastTagRepo.getById(sessionId);
    if (!doc) return [];

    return doc.transactions.map((txn) =>
      this.mongoTxnToHistory(txn, sessionId),
    );
  }

  async deleteHistoryEntry(id: string): Promise<void> {
    // This would need to be implemented in the MongoDB repo
    console.warn("deleteHistoryEntry not implemented for MongoDB");
  }

  private mongoDocToSession(doc: MongoFastTagDocument): FastTagSessionRecord {
    return {
      formType: doc.bank,
      id: doc._id,
      bank_id: doc.bank || "",
      bank_name: doc.bank || "",
      vehicle_number: doc.vehicleNumber,
      customer_name: doc.ownerName,
      customer_mobile: doc.mobile,
      truck_number: doc.carModel,
      truck_owner_name: doc.ownerName,
      opening_balance: doc.openingBalance,
      start_date: doc.createdAt,
      end_date: doc.updatedAt,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
      pdf_url: undefined,
    };
  }

  private mongoTxnToHistory(
    txn: MongoFastTagTransaction,
    sessionId: string,
  ): FastTagHistoryRecord {
    return {
      id: txn.id,
      session_id: sessionId,
      processing_time: txn.processingTime || null,
      transaction_time: txn.transactionTime || null,
      nature: txn.nature as "Debit" | "Credit",
      amount: parseFloat(txn.amount) || 0,
      closing_balance: txn.closingBalance || 0,
      description: txn.description || null,
      txn_id: txn.id,
      created_at: txn.transactionTime || new Date().toISOString(),
    };
  }
}

// ─── Export singleton ────────────────────────────────────────────
export const fastTagRepo: IFastTagRepository = new MongoFastTagRepository();
