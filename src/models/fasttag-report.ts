/**
 * FastTag Report Models
 * Data structures for the FastTag Reports feature.
 */

export interface FastTagReportFilter {
  bankId: string;
  bankName: string;
  startDate: Date;
  endDate: Date;
  vehicleNumber: string;
}

export interface FastTagReportSession {
  id: string;
  bank_id: string;
  bank_name: string;
  vehicle_number: string;
  customer_name: string | null;
  customer_mobile: string | null;
  truck_number: string | null;
  truck_owner_name: string | null;
  opening_balance: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  formType: string;
}

export interface FastTagReportTransaction {
  id: string;
  session_id: string;
  processing_time: string | null;
  transaction_time: string | null;
  nature: string;
  amount: number;
  closing_balance: number;
  description: string | null;
  txn_id: string | null;
  created_at: string;
}

export interface FastTagReportRow {
  session: FastTagReportSession;
  transactions: FastTagReportTransaction[];
}
