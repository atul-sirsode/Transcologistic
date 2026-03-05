/**
 * Unified FastTag Service
 *
 * Uses MongoDB repository via REST API for all FastTag operations.
 */

import { mongoFastTagRepo } from "@/services/mongodb-fasttag-repository";
import type {
  FastTagSessionData,
  FastTagSessionRecord,
  FastTagHistoryData,
  FastTagHistoryRecord,
} from "@/lib/db";
import type {
  MongoFastTagDocument,
  MongoFastTagCreateInput,
  MongoFastTagTransaction,
  MongoFastTagFilter,
  MongoFastTagPaginatedResponse,
} from "@/models/mongodb-fasttag";

// ─── Adapter helpers: Mongo ↔ App shape ─────────────────────────

function mongoDocToSession(doc: MongoFastTagDocument): FastTagSessionRecord {
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

function mongoTxnToHistory(
  txn: MongoFastTagTransaction,
  sessionId: string,
): FastTagHistoryRecord {
  return {
    id: txn.id,
    session_id: sessionId,
    processing_time: txn.processingTime || undefined,
    transaction_time: txn.transactionTime || undefined,
    nature: txn.nature as "Debit" | "Credit",
    amount: parseFloat(txn.amount) || 0,
    closing_balance: txn.closingBalance || 0,
    description: txn.description || undefined,
    txn_id: txn.id,
    created_at: txn.transactionTime || new Date().toISOString(),
  };
}

function sessionDataToMongoInput(
  data: FastTagSessionData,
): MongoFastTagCreateInput {
  return {
    formType: "fasttag",
    vehicleNumber: data.vehicle_number,
    openingBalance: data.opening_balance,
    ownerName: data.truck_owner_name || data.customer_name,
    mobile: data.customer_mobile,
    carModel: data.truck_number,
    bank: data.bank_name || data.bank_id,
  };
}

function historyDataToMongoTxn(
  entry: FastTagHistoryData,
): MongoFastTagTransaction {
  return {
    id: entry.txn_id || crypto.randomUUID(),
    nature: entry.nature,
    amount: String(entry.amount),
    closingBalance: entry.closing_balance,
    description: entry.description || "",
    processingTime: entry.processing_time || undefined,
    transactionTime: entry.transaction_time || new Date().toISOString(),
  };
}

// ─── Service ─────────────────────────────────────────────────────

export class FastTagService {
  // ── Session operations ──

  async createSession(
    data: FastTagSessionData,
  ): Promise<FastTagSessionRecord | null> {
    const doc = await mongoFastTagRepo.create(sessionDataToMongoInput(data));
    if (!doc) return null; // 409 - already exists
    return mongoDocToSession(doc);
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
    return mongoDocToSession(doc);
  }

  async getSession(id: string): Promise<FastTagSessionRecord | null> {
    const doc = await mongoFastTagRepo.getById(id);
    return doc ? mongoDocToSession(doc) : null;
  }

  async getSessions(
    filter?: MongoFastTagFilter,
  ): Promise<FastTagSessionRecord[]> {
    const docs = await mongoFastTagRepo.getAll(filter);
    return docs.map(mongoDocToSession);
  }

  /** Returns session + transactions in one call (no extra API round-trip) */
  async getSessionWithHistory(filter: MongoFastTagFilter): Promise<{
    session: FastTagSessionRecord;
    history: FastTagHistoryRecord[];
  } | null> {
    const docs = await mongoFastTagRepo.getAll(filter);
    if (!docs.length) return null;
    const doc = docs[0];
    return {
      session: mongoDocToSession(doc),
      history: (doc.transactions || []).map((txn) =>
        mongoTxnToHistory(txn, doc._id),
      ),
    };
  }

  // ── Transaction / History operations ──

  async createHistoryEntries(
    vehicleNumber: string,
    entries: FastTagHistoryData[],
  ): Promise<FastTagHistoryRecord[]> {
    const results: FastTagHistoryRecord[] = [];
    for (const entry of entries) {
      const doc = await mongoFastTagRepo.addTransaction(
        vehicleNumber,
        historyDataToMongoTxn(entry),
      );
      console.log("doc", doc);

      // doc is the transaction itself, not a document with transactions array
      if (doc) {
        results.push(mongoTxnToHistory(doc, vehicleNumber));
      } else {
        console.error("No transaction returned:", doc);
        throw new Error("Failed to retrieve transaction data after saving");
      }
    }
    return results;
  }

  async getHistoryBySession(
    sessionId: string,
  ): Promise<FastTagHistoryRecord[]> {
    const doc = await mongoFastTagRepo.getById(sessionId);
    if (!doc) return [];
    return doc.transactions.map((txn) => mongoTxnToHistory(txn, sessionId));
  }

  async deleteHistoryEntry(sessionId: string, entryId: string): Promise<void> {
    await mongoFastTagRepo.removeTransaction(sessionId, entryId);
  }

  async updateHistoryEntry(
    sessionId: string,
    entryId: string,
    data: FastTagHistoryData,
  ): Promise<void> {
    await mongoFastTagRepo.updateTransaction(sessionId, entryId, {
      nature: data.nature,
      amount: String(data.amount),
      closingBalance: data.closing_balance,
      description: data.description || "",
      transactionTime: data.transaction_time || new Date().toISOString(),
    });
  }

  // ── Report-style queries ──

  async getSessionsByBankAndDateRange(
    bankId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FastTagSessionRecord[]> {
    const docs = await mongoFastTagRepo.getAll({
      bank: bankId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    return docs.map(mongoDocToSession);
  }

  /** Paginated query by formType and date range */
  async getSessionsByFormTypeAndDateRange(
    formType: string,
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    sessions: FastTagSessionRecord[];
    totalRecords: number;
    totalPages: number;
    currentPage: number;
  }> {
    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    const result = await mongoFastTagRepo.getByFormTypeAndDateRange(
      formType,
      startStr,
      endStr,
      page,
      limit,
    );
    return {
      sessions: result.data.map(mongoDocToSession),
      totalRecords: result.totalRecords,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    };
  }
}

// ─── Singleton ───────────────────────────────────────────────────
export const fastTagService = new FastTagService();
