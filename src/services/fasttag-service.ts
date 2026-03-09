/**
 * Unified FastTag Service
 *
 * Uses MongoDB repository via REST API for all FastTag operations.
 */

import { mongoFastTagRepo } from "@/services/mongodb-fasttag-repository";
import { httpClient } from "@/lib/http-client";
import { autoAdjustAmountService } from "@/lib/auto-adjust-amount-service";
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
import { formatForDatetimeLocal } from "@/lib/toll-api";

// ─── Toll API Types ────────────────────────────────────────────────

export interface TollApiRequest {
  from: {
    address: string;
  };
  to: {
    address: string;
  };
  vehicle: {
    type:
      | "2AxlesAuto"
      | "2AxlesTaxi"
      | "2AxlesLCV"
      | "2AxlesTruck"
      | "2AxlesBus"
      | "2AxlesMotorcycle"
      | "3AxlesAuto"
      | "3AxlesTruck"
      | "3AxlesBus"
      | "4AxlesAuto"
      | "4AxlesTruck"
      | "4AxlesBus"
      | "5AxlesTruck"
      | "6AxlesTruck"
      | "7AxlesTruck";
  };
  country: "IND";
  departureTime: string; // ISO-8601 format
  OpeningAmount: number;
}

export interface TollRecord {
  tollName: string;
  amount: string;
  formattedArrivalTime: string | null;
  formattedtransactionDateTime: string;
  processedDateTime: string | null;
  processedTransactionDateTime: string | null;
  processingTime: string;
  transactionTime: string;
  nature: "Debit" | "Credit";
  closingBalance: string;
  txnId: string;
}

export interface TollApiResponse {
  status: boolean;
  message?: string;
  statuscode?: number;
  error?: string;
  analysis?: {
    recommendedRoute: {
      tolls: Array<{
        name: string;
        amount: number;
        cashCost?: number;
        tagCost?: number;
        etaInfo?: {
          formattedArrivalTime?: string;
        };
        location?: {
          lat: number;
          lng: number;
        };
        type?: string;
      }>;
    };
  };
}

export interface TollProcessingResult {
  success: boolean;
  records: TollRecord[];
  insufficientBalance: boolean;
  error?: string;
}

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
  bankName?: string,
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
    bankName: bankName,
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
    console.log("docs", docs);
    if (!docs.length) return null;

    // Find the document that has transactions, not just the first one
    const docWithTransactions = docs.find(
      (doc) => doc.transactions && doc.transactions.length > 0,
    );
    const doc = docWithTransactions || docs[0]; // Fallback to first doc if none have transactions

    return {
      session: mongoDocToSession(doc),
      history: (doc.transactions || []).map((txn) =>
        mongoTxnToHistory(txn, doc._id, doc.bank),
      ),
    };
  }

  // ── Transaction / History operations ──

  async createHistoryEntries(
    vehicleNumber: string,
    entries: FastTagHistoryData[],
  ): Promise<FastTagHistoryRecord[]> {
    const results: FastTagHistoryRecord[] = [];

    // Get the parent document to extract bank name
    const parentDoc = await mongoFastTagRepo.getById(vehicleNumber);
    const bankName = parentDoc?.bank;

    for (const entry of entries) {
      const doc = await mongoFastTagRepo.addTransaction(
        vehicleNumber,
        historyDataToMongoTxn(entry),
      );

      // doc is the transaction itself, not a document with transactions array
      if (doc) {
        results.push(mongoTxnToHistory(doc, vehicleNumber, bankName));
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
    return doc.transactions.map((txn) =>
      mongoTxnToHistory(txn, sessionId, doc.bank),
    );
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

  // ── Toll API Operations ──

  /**
   * Process toll route using TollGuru API
   */
  async processTollRoute(
    request: TollApiRequest,
  ): Promise<TollProcessingResult> {
    try {
      const apiResponse: TollApiResponse = await httpClient.post(
        "/api/lightweight-tollguru/get-toll-details",
        request,
      );

      // Check if response has the expected structure
      if (!apiResponse || typeof apiResponse !== "object") {
        return {
          success: false,
          records: [],
          insufficientBalance: false,
          error: "Invalid response format received from API",
        };
      }

      // Handle case where API returns just the request object (echo)
      if (
        "from" in apiResponse &&
        "to" in apiResponse &&
        !("status" in apiResponse)
      ) {
        return {
          success: false,
          records: [],
          insufficientBalance: false,
          error:
            "API endpoint appears to be echoing the request instead of processing it. Please check if the toll API is properly implemented.",
        };
      }

      if (!apiResponse.status) {
        return {
          success: false,
          records: [],
          insufficientBalance: false,
          error:
            apiResponse.error ||
            apiResponse.message ||
            "Failed to fetch toll details",
        };
      }

      // Check if analysis data exists
      if (!apiResponse.analysis?.recommendedRoute?.tolls) {
        return {
          success: false,
          records: [],
          insufficientBalance: false,
          error: "No toll data found in the response",
        };
      }

      // Convert API response to TollRecord format
      // First calculate total toll amount
      const totalTollAmount =
        apiResponse.analysis.recommendedRoute.tolls.reduce(
          (sum, toll) => sum + (toll.cashCost || toll.amount),
          0,
        );

      // Now create the toll records with the final amounts
      let runningBalance = request.OpeningAmount; // Start with original opening amount
      const records: TollRecord[] = [];
      let isCreditEntryInserted = false;
      let isSwitchedToAdjusted = false;
      let creditEntry: TollRecord | undefined = undefined;

      // Add toll records using the original API response (toll amounts don't change)
      for (const [
        index,
        toll,
      ] of apiResponse.analysis.recommendedRoute.tolls.entries()) {
        const formattedArrivalTime = toll.etaInfo?.formattedArrivalTime || null;
        const now = new Date().toISOString();
        const tollAmount = toll.tagCost;

        // Check if running balance is insufficient for current toll and credit entry hasn't been inserted yet
        if (!isCreditEntryInserted && runningBalance < tollAmount) {
          // Calculate auto-adjust amount at this point
          const autoAdjustResult = await this.handleAutoAdjustAmount(
            runningBalance,
            totalTollAmount - (runningBalance - tollAmount), // Remaining tolls including current
          );

          if (autoAdjustResult.creditEntry) {
            creditEntry = autoAdjustResult.creditEntry;

            // Insert credit entry at this point
            records.push({
              ...creditEntry,
              closingBalance: (
                runningBalance + parseFloat(creditEntry.amount)
              ).toString(),
            });

            // Update running balance after credit and switch to adjusted amount
            runningBalance += parseFloat(creditEntry.amount);
            isCreditEntryInserted = true;
            isSwitchedToAdjusted = true;
          }
        }

        // Calculate closing balance: runningBalance - current toll
        const closingBalance = runningBalance - tollAmount;

        records.push({
          tollName: toll.name,
          amount: tollAmount.toString(),
          formattedArrivalTime,
          formattedtransactionDateTime: formattedArrivalTime
            ? addMinutesKeepFormat(formattedArrivalTime)
            : now,
          processedDateTime: formattedArrivalTime
            ? formatForDatetimeLocal(formattedArrivalTime)
            : now,
          processedTransactionDateTime: formattedArrivalTime
            ? formatForDatetimeLocal(addMinutesKeepFormat(formattedArrivalTime))
            : now,
          processingTime: formatForDatetimeLocal(formattedArrivalTime),
          transactionTime: formatForDatetimeLocal(
            addMinutesKeepFormat(formattedArrivalTime),
          ),
          nature: "Debit" as const,
          closingBalance: closingBalance.toString(),
          txnId: `toll_${Date.now()}_${index}`,
        });

        // Update running balance for next iteration
        runningBalance = closingBalance;
      }

      // Add credit entry at the end if it exists and wasn't inserted during processing
      if (creditEntry && !isCreditEntryInserted) {
        records.push({
          ...creditEntry,
          closingBalance: runningBalance.toString(),
        });
      }

      return {
        success: true,
        records,
        insufficientBalance: false,
      };
    } catch (error) {
      console.error("Toll API error:", error);
      return {
        success: false,
        records: [],
        insufficientBalance: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Calculate auto-adjust amount and create credit entry if needed
   */
  private async handleAutoAdjustAmount(
    openingAmount: number,
    totalTollAmount: number,
  ): Promise<{
    adjustedOpeningAmount: number;
    creditEntry?: TollRecord;
  }> {
    // If opening amount is sufficient, no adjustment needed
    if (openingAmount >= totalTollAmount) {
      return { adjustedOpeningAmount: openingAmount };
    }

    try {
      // Get auto-adjust amount from service
      const autoAdjustData = await autoAdjustAmountService.getAmount();

      if (!autoAdjustData || !autoAdjustData.amount) {
        return { adjustedOpeningAmount: openingAmount };
      }

      const maxAutoAdjustAmount = autoAdjustData.amount;
      const deficit = totalTollAmount - openingAmount;

      // Find the minimum even amount >= deficit and <= maxAutoAdjustAmount
      // Start from the higher of (deficit rounded up to nearest even number) or 2000
      const minRequired = Math.max(Math.ceil(deficit / 2) * 2, 2000);

      // Find the minimum even amount that satisfies the requirement
      let autoAdjustAmount = minRequired;

      // If the minimum required exceeds max available amount, find the largest even amount <= max
      if (minRequired > maxAutoAdjustAmount) {
        // Use the largest even amount <= maxAutoAdjustAmount
        autoAdjustAmount = Math.floor(maxAutoAdjustAmount / 2) * 2;

        // If even this is less than deficit, return original amount (insufficient even with max)
        if (autoAdjustAmount < deficit) {
          return { adjustedOpeningAmount: openingAmount };
        }
      }

      const adjustedOpeningAmount = openingAmount + autoAdjustAmount;

      // Create credit entry for the auto-adjust amount
      const now = new Date();
      const formattedNow = now.toLocaleString("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      const creditEntry: TollRecord = {
        tollName: "Auto Adjust Amount",
        amount: autoAdjustAmount.toString(),
        formattedArrivalTime: formattedNow,
        formattedtransactionDateTime: addMinutesKeepFormat(formattedNow),
        processedDateTime: formatForDatetimeLocal(formattedNow),
        processedTransactionDateTime: formatForDatetimeLocal(formattedNow),
        processingTime: formatForDatetimeLocal(formattedNow),
        transactionTime: formatForDatetimeLocal(formattedNow),
        nature: "Credit" as const,
        closingBalance: adjustedOpeningAmount.toString(),
        txnId: `auto_adjust_${Date.now()}`,
      };

      return {
        adjustedOpeningAmount,
        creditEntry,
      };
    } catch (error) {
      console.error("Error getting auto-adjust amount:", error);
      return { adjustedOpeningAmount: openingAmount };
    }
  }

  /**
   * Map vehicle type string to API vehicle type
   */
  private mapVehicleType(
    vehicleType: string,
  ): TollApiRequest["vehicle"]["type"] {
    const typeMap: Record<string, TollApiRequest["vehicle"]["type"]> = {
      // Direct API formats
      "2axlesauto": "2AxlesAuto",
      "2axlestaxi": "2AxlesTaxi",
      "2axleslcv": "2AxlesLCV",
      "2axlestruck": "2AxlesTruck",
      "2axlesbus": "2AxlesBus",
      "2axlesmotorcycle": "2AxlesMotorcycle",
      "3axlesauto": "3AxlesAuto",
      "3axlestruck": "3AxlesTruck",
      "3axlesbus": "3AxlesBus",
      "4axlesauto": "4AxlesAuto",
      "4axlestruck": "4AxlesTruck",
      "4axlesbus": "4AxlesBus",
      "5axlestruck": "5AxlesTruck",
      "6axlestruck": "6AxlesTruck",
      "7axlestruck": "7AxlesTruck",

      // User-friendly formats
      car: "2AxlesAuto",
      jeep: "2AxlesAuto",
      van: "2AxlesAuto",
      suv: "2AxlesAuto",
      taxi: "2AxlesTaxi",
      bike: "2AxlesMotorcycle",
      motorcycle: "2AxlesMotorcycle",
      pickup: "2AxlesLCV",
      lcv: "2AxlesLCV",
      lightcommercial: "2AxlesLCV",
      truck: "2AxlesTruck",
      bus: "2AxlesBus",

      // Common variations
      "2axles": "2AxlesAuto",
      "3axles": "3AxlesAuto",
      "4axles": "4AxlesAuto",
      "5axles": "5AxlesTruck",
      "6axles": "6AxlesTruck",
      "7axles": "7AxlesTruck",
    };

    const normalizedType = vehicleType.toLowerCase().replace(/[^a-z0-9]/g, "");
    return typeMap[normalizedType] || "2AxlesAuto"; // Default fallback
  }

  /**
   * Process multiple rows with toll calculations and balance checking
   */
  async processFastTagRows(
    rows: Array<{
      rc_number: string;
      bank: string;
      source_state: string;
      source_city: string;
      destination_state: string;
      destination_city: string;
      opening_amount: string;
      start_date: string;
      vehicle_type: string;
    }>,
  ): Promise<
    Array<{
      success: boolean;
      records: TollRecord[];
      insufficientBalance: boolean;
      error?: string;
    }>
  > {
    const results = [];

    for (const row of rows) {
      try {
        // Convert start_date to ISO-8601 format
        const departureTime = this.convertToISO8601(row.start_date);
        const openingAmount = parseFloat(row.opening_amount);

        const tollRequest: TollApiRequest = {
          from: {
            address: `${row.source_city}, ${row.source_state}`,
          },
          to: {
            address: `${row.destination_city}, ${row.destination_state}`,
          },
          vehicle: {
            type: this.mapVehicleType(row.vehicle_type),
          },
          country: "IND",
          departureTime,
          OpeningAmount: openingAmount,
        };

        const tollResult = await this.processTollRoute(tollRequest);

        // Calculate total toll amount from debit transactions only (exclude credit entries)
        const totalTollAmount = tollResult.records
          .filter((record) => record.nature === "Debit")
          .reduce((sum, record) => sum + parseFloat(record.amount), 0);

        // Get the adjusted opening amount from the credit entry if it exists
        const { adjustedOpeningAmount, creditEntry } =
          await this.handleAutoAdjustAmount(openingAmount, totalTollAmount);
        const adjustedAmount = creditEntry
          ? parseFloat(creditEntry.closingBalance) // This is the adjusted opening amount
          : adjustedOpeningAmount;

        // Check insufficient balance using adjusted amount
        if (adjustedAmount < totalTollAmount) {
          tollResult.insufficientBalance = true;
          tollResult.error = `Insufficient balance: Adjusted amount ₹${adjustedAmount} is less than total toll amount ₹${totalTollAmount}`;
        }

        results.push(tollResult);
      } catch (error) {
        results.push({
          success: false,
          records: [],
          insufficientBalance: false,
          error: error instanceof Error ? error.message : "Processing failed",
        });
      }
    }

    return results;
  }

  /**
   * Convert various date formats to ISO-8601
   */
  private convertToISO8601(dateString: string): string {
    try {
      // Handle Excel serial dates
      if (!isNaN(Number(dateString)) && Number(dateString) > 25569) {
        const excelDate = Number(dateString);
        const adjustedExcelDate = excelDate - 25569;
        const date = new Date(adjustedExcelDate * 86400 * 1000);
        return date.toISOString();
      }

      // Handle various string formats
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }

      // Fallback to current time
      return new Date().toISOString();
    } catch (error) {
      console.error("Date conversion error:", error);
      return new Date().toISOString();
    }
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
    vehicleNumber: string,
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
      vehicleNumber,
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

// Parse "M/D/YYYY, h:mm:ss AM/PM" as LOCAL time, convert to UTC, and format "YYYY-MM-DDTHH:mm"
export function toUtcIsoShortFromFormatted(
  input /* e.g., "2/28/2026, 1:10:07 AM" */,
) {
  if (typeof input !== "string") throw new TypeError("input must be a string");

  // Split "2/28/2026, 1:10:07 AM"
  const [datePart, timePart] = input.split(", ").map((s) => s?.trim());
  if (!datePart || !timePart)
    throw new Error("Invalid input format: expected 'M/D/YYYY, h:mm:ss AM/PM'");

  // Date: M/D/YYYY
  const [M, D, Y] = datePart.split("/").map((n) => parseInt(n, 10));
  if (!Y || !M || !D) throw new Error("Invalid date part");

  // Time: "h:mm:ss AM/PM"
  const [time, apRaw] = timePart.split(" ");
  const [hStr, mStr, sStr] = time.split(":");
  if (!hStr || !mStr || !sStr || !apRaw) throw new Error("Invalid time part");

  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const s = parseInt(sStr, 10);
  const ap = apRaw.toUpperCase();

  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s))
    throw new Error("Invalid time numbers");

  // Convert 12h → 24h
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;

  // Build local Date (timezone = user's environment)
  const local = new Date(Y, M - 1, D, h, m, s);

  // Validate: if date rolled, input was invalid (e.g., 2/30)
  if (
    local.getFullYear() !== Y ||
    local.getMonth() !== M - 1 ||
    local.getDate() !== D
  ) {
    throw new Error("Invalid calendar date");
  }

  // Extract UTC components
  const y = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mi = String(local.getUTCMinutes()).padStart(2, "0");

  // ISO short (no seconds)
  return `${y}-${mm}-${dd}T${hh}:${mi}`;
}

function addMinutesKeepFormat(input, minutesToAdd = 1) {
  // Input format: M/D/YYYY, h:mm:ss AM/PM
  const [datePart, timePart] = input.split(", ").map((s) => s.trim());

  const [m, d, y] = datePart.split("/").map(Number);
  // timePart like "1:10:07 AM"
  const [time, meridiem] = timePart.split(" ");
  const [h, min, sec] = time.split(":").map(Number); // ✅ Fixed: include hour

  // Convert to 24h
  let hour24 = h;
  if (meridiem.toUpperCase() === "PM" && h !== 12) hour24 += 12;
  if (meridiem.toUpperCase() === "AM" && h === 12) hour24 = 0;

  // Build a Date in local time
  const dt = new Date(y, m - 1, d, hour24, min, sec);

  // Add minutes
  dt.setMinutes(dt.getMinutes() + minutesToAdd);

  // Format back to M/D/YYYY, h:mm:ss AM/PM
  const outY = dt.getFullYear();
  const outM = dt.getMonth() + 1;
  const outD = dt.getDate();

  let outH = dt.getHours();
  const outMin = dt.getMinutes().toString().padStart(2, "0");
  const outSec = dt.getSeconds().toString().padStart(2, "0");

  const outMeridiem = outH >= 12 ? "PM" : "AM";
  outH = outH % 12;
  if (outH === 0) outH = 12;

  return `${outM}/${outD}/${outY}, ${outH}:${outMin}:${outSec} ${outMeridiem}`;
}
// ─── Singleton ───────────────────────────────────────────────────
export const fastTagService = new FastTagService();
