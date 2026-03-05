/**
 * FastTag Report Service
 * Uses MongoDB via the unified FastTagService for report queries.
 */

import { mongoFastTagRepo } from "@/services/mongodb-fasttag-repository";
import type {
  FastTagReportFilter,
  FastTagReportSession,
  FastTagReportTransaction,
  FastTagReportRow,
} from "@/models/fasttag-report";

// Bank ID → formType mapping
const BANK_FORM_TYPE_MAP: Record<string, string> = {
  idfc: "blackbuck",
  idbi: "parkplus",
};

export class FastTagReportService {
  async getReport(
    filter: FastTagReportFilter,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    rows: FastTagReportRow[];
    totalRecords: number;
    totalPages: number;
    currentPage: number;
  }> {
    const formType = BANK_FORM_TYPE_MAP[filter.bankId] || filter.bankId;

    const startStr = `${filter.startDate.getFullYear()}-${String(filter.startDate.getMonth() + 1).padStart(2, "0")}-${String(filter.startDate.getDate()).padStart(2, "0")}`;
    const endStr = `${filter.endDate.getFullYear()}-${String(filter.endDate.getMonth() + 1).padStart(2, "0")}-${String(filter.endDate.getDate()).padStart(2, "0")}`;

    const raw = await mongoFastTagRepo.getByFormTypeAndDateRange(
      formType,
      startStr,
      endStr,
      page,
      limit,
    );

    const rows: FastTagReportRow[] = raw.data.map((doc) => ({
      session: {
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
      } as unknown as FastTagReportSession,
      transactions: (doc.transactions || []).map((txn) => ({
        id: txn.id,
        session_id: doc._id,
        processing_time: txn.processingTime || undefined,
        transaction_time: txn.transactionTime || undefined,
        nature: txn.nature,
        amount: parseFloat(txn.amount) || 0,
        closing_balance: txn.closingBalance || 0,
        description: txn.description || undefined,
        txn_id: txn.id,
        created_at: txn.transactionTime || new Date().toISOString(),
      })) as unknown as FastTagReportTransaction[],
    }));

    return {
      rows,
      totalRecords: raw.totalRecords,
      totalPages: raw.totalPages,
      currentPage: raw.currentPage,
    };
  }
}

// ─── Singleton export ────────────────────────────────────────────
export const fastTagReportService = new FastTagReportService();
