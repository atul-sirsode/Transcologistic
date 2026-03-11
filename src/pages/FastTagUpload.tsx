import { useState, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  Info,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Download,
  RotateCcw,
  Printer,
  FileDown,
  Pencil,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TollDetailsDialog } from "@/components/TollDetailsDialog";
import { ExistingVehicleDetailsDialog } from "@/components/ExistingVehicleDetailsDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { getEnabledBanks } from "@/lib/admin-settings";
import { fastTagService, type TollRecord } from "@/services/fasttag-service";
import { fastTagRepo, type FastTagSessionRecord } from "@/lib/db";
import { mongoFastTagRepo } from "@/services/mongodb-fasttag-repository";
import { banksApi } from "@/lib/banks-api";
import type { MongoFastTagFilter } from "@/models/mongodb-fasttag";
import * as XLSX from "xlsx";
import Papa from "papaparse";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

// Function to format date to IST 12-hour format
function formatDateTimeToIST(dateString: string): string {
  if (!dateString) return "";

  try {
    let date: Date;

    // Handle Excel serial date format (numbers like 46176.333333333336)
    if (!isNaN(Number(dateString)) && Number(dateString) > 25569) {
      const excelDate = Number(dateString);
      // Excel dates are stored as days since 1/1/1900
      // Convert to milliseconds since Unix epoch (1/1/1970)
      const adjustedExcelDate = excelDate - 25569; // 25569 = 1/1/1970 in Excel serial
      const utcDate = new Date(adjustedExcelDate * 86400 * 1000);

      // Extract UTC components to avoid timezone conversion
      const year = utcDate.getUTCFullYear();
      const month = utcDate.getUTCMonth();
      const day = utcDate.getUTCDate();
      const hours = utcDate.getUTCHours();
      const minutes = utcDate.getUTCMinutes();
      const seconds = utcDate.getUTCSeconds();

      // Create a new date using local timezone with the UTC components
      date = new Date(year, month, day, hours, minutes, seconds);
    } else {
      // Handle various Excel date string formats
      // Try to parse Excel format like "6/3/2026  8:00:00 AM"
      const excelFormatMatch = dateString.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i,
      );
      if (excelFormatMatch) {
        const [, month, day, year, hours, minutes, seconds, ampm] =
          excelFormatMatch;
        let hour24 = parseInt(hours);
        if (ampm.toUpperCase() === "PM" && hour24 !== 12) {
          hour24 += 12;
        } else if (ampm.toUpperCase() === "AM" && hour24 === 12) {
          hour24 = 0;
        }

        // Create date assuming it's already in IST (no timezone conversion)
        date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          hour24,
          parseInt(minutes),
          parseInt(seconds),
        );
      } else {
        // Try parsing as regular date string
        date = new Date(dateString);
      }
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if parsing fails
    }

    // Format to 12-hour format
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      hourCycle: "h12",
    };

    return date.toLocaleString("en-IN", options);
  } catch (error) {
    return dateString; // Return original if formatting fails
  }
}

const REQUIRED_COLUMNS = [
  "rc_number",
  "bank",
  "source_state",
  "source_city",
  "destination_state",
  "destination_city",
  "opening_amount",
  "start_date",
  "start_time",
  "vehicle_type",
];

const COLUMN_LABELS: Record<string, string> = {
  rc_number: "RC Number",
  bank: "Bank",
  source_state: "Source State",
  source_city: "Source City",
  destination_state: "Destination State",
  destination_city: "Destination City",
  opening_amount: "Opening Amount",
  start_date: "Start DateTime",
  start_time: "Start Time",
  vehicle_type: "Vehicle Type",
};

interface UploadedRow {
  [key: string]: string;
}

type ProcessStatus = "pending" | "processing" | "success" | "failed";

interface ProcessedRow {
  data: UploadedRow;
  _status: ProcessStatus;
  _failReason?: string;
  _selected: boolean;
  _id: string;
  _tollHistory?: TollRecord[];
}

interface ValidationResult {
  valid: boolean;
  data: UploadedRow[];
  errors: string[];
  mappedColumns: Record<string, string>;
  fileName: string;
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}

function findColumn(headers: string[], target: string): string | null {
  const aliases: Record<string, string[]> = {
    rc_number: [
      "rc_number",
      "rcnumber",
      "rc",
      "registration_number",
      "vehicle_number",
      "veh_no",
    ],
    bank: ["bank", "bank_name", "bankname"],
    source_state: [
      "source_state",
      "sourcestate",
      "from_state",
      "fromstate",
      "src_state",
    ],
    source_city: [
      "source_city",
      "sourcecity",
      "from_city",
      "fromcity",
      "src_city",
    ],
    destination_state: [
      "destination_state",
      "destinationstate",
      "dest_state",
      "deststate",
      "to_state",
      "tostate",
    ],
    destination_city: [
      "destination_city",
      "destinationcity",
      "dest_city",
      "destcity",
      "to_city",
      "tocity",
    ],
    opening_amount: [
      "opening_amount",
      "openingamount",
      "opening_balance",
      "openingbalance",
      "amount",
    ],
    start_date: [
      "start_date",
      "startdate",
      "start_datetime",
      "startdatetime",
      "date",
      "from_date",
      "fromdate",
      "date_time",
      "datetime",
    ],
    start_time: [
      "start_time",
      "starttime",
      "time",
      "start_time_only",
      "starttimeonly",
      "from_time",
      "fromtime",
    ],
    vehicle_type: [
      "vehicle_type",
      "vehicletype",
      "vehicle",
      "type",
      "vehicletypecode",
    ],
  };
  const targetAliases = aliases[target] || [target];
  for (const header of headers) {
    const norm = normalizeHeader(header);
    if (targetAliases.includes(norm)) return header;
  }
  return null;
}

function validateFile(
  headers: string[],
  data: Record<string, unknown>[],
  fileName: string,
): ValidationResult {
  const errors: string[] = [];
  const mappedColumns: Record<string, string> = {};

  for (const req of REQUIRED_COLUMNS) {
    const found = findColumn(headers, req);
    if (!found) {
      errors.push(`Missing required column: "${COLUMN_LABELS[req]}"`);
    } else {
      mappedColumns[req] = found;
    }
  }

  if (errors.length > 0) {
    return { valid: false, data: [], errors, mappedColumns, fileName };
  }

  const rows: UploadedRow[] = data.map((row) => {
    const mapped: UploadedRow = {};
    for (const [key, originalHeader] of Object.entries(mappedColumns)) {
      const value = String(row[originalHeader] || "").trim();
      mapped[key] = value;
    }

    // Combine start_date and start_time to create valid datetime
    if (mapped.start_date && mapped.start_time) {
      const dateStr = mapped.start_date;
      const timeStr = mapped.start_time;

      // Try to create a valid datetime by combining date and time
      try {
        const dateTimeStr = `${dateStr} ${timeStr}`;
        const parsedDate = new Date(dateTimeStr);

        // If the combined date is valid, format it to IST for start_date only
        if (!isNaN(parsedDate.getTime())) {
          mapped.start_date = formatDateTimeToIST(parsedDate.toISOString());
          // Keep the original start_time from Excel as-is
          // mapped.start_time = timeStr; // Already set from original
        } else {
          // If invalid, keep original date and let validation handle it
          mapped.start_date = formatDateTimeToIST(dateStr);
        }
      } catch (error) {
        console.error("Error parsing date and time:", error);
        // If parsing fails, format just the date
        mapped.start_date = formatDateTimeToIST(dateStr);
      }
    } else if (mapped.start_date) {
      // If only date is provided, format it
      mapped.start_date = formatDateTimeToIST(mapped.start_date);
    }

    return mapped;
  });

  const rowErrors: string[] = [];
  rows.forEach((row, idx) => {
    if (!row.rc_number) rowErrors.push(`Row ${idx + 1}: RC Number is empty`);
    if (!row.bank) rowErrors.push(`Row ${idx + 1}: Bank is empty`);
    if (!row.source_state)
      rowErrors.push(`Row ${idx + 1}: Source State is empty`);
    if (!row.destination_state)
      rowErrors.push(`Row ${idx + 1}: Destination State is empty`);
    if (!row.opening_amount || isNaN(Number(row.opening_amount)))
      rowErrors.push(`Row ${idx + 1}: Opening Amount is invalid`);
    if (!row.start_date) rowErrors.push(`Row ${idx + 1}: Start Date is empty`);
    if (!row.start_time) rowErrors.push(`Row ${idx + 1}: Start Time is empty`);
    if (!row.vehicle_type)
      rowErrors.push(`Row ${idx + 1}: Vehicle Type is empty`);
  });

  if (rowErrors.length > 0 && rowErrors.length <= 5) {
    errors.push(...rowErrors);
  } else if (rowErrors.length > 5) {
    errors.push(...rowErrors.slice(0, 5));
    errors.push(`...and ${rowErrors.length - 5} more row errors`);
  }

  return {
    valid: rowErrors.length === 0,
    data: rows,
    errors,
    mappedColumns,
    fileName,
  };
}

const INSUFFICIENT_BALANCE_REASON =
  "Due to insufficient balance this record not processed, please add amount to reProcess";

/**
 * Enhance row data with MongoDB records and bank codes
 * - Gets existing records from MongoDB by bank and RC number
 * - Uses record's opening balance if found, otherwise uses row data
 * - Converts bank name to bank code
 */
async function enhanceRowDataWithMongoRecords(
  rows: Array<{
    rc_number: string;
    bank: string;
    formType: string;
    source_state: string;
    source_city: string;
    destination_state: string;
    destination_city: string;
    opening_amount: string;
    start_date: string;
    vehicle_type: string;
  }>,
) {
  try {
    // Get all banks for code mapping
    const banks = await banksApi.list();
    const bankNameToCodeMap = new Map(
      banks.map((bank) => [bank.bank_name.toLowerCase(), bank.code]),
    );

    // Get MongoDB sessions with filters for each row
    const uniqueFilters = new Map<string, MongoFastTagFilter>();

    rows.forEach((row) => {
      const bankCode = bankNameToCodeMap.get(row.bank.toLowerCase());
      if (bankCode) {
        const filterKey = `${row.rc_number.toLowerCase()}_${bankCode}`;
        if (!uniqueFilters.has(filterKey)) {
          uniqueFilters.set(filterKey, {
            vehicleNumber: row.rc_number.toLowerCase(),
            formType: bankCode,
          });
        }
      }
    });

    // Get all matching sessions using the MongoDB repository directly
    const allSessions: FastTagSessionRecord[] = [];
    for (const filter of uniqueFilters.values()) {
      const docs = await mongoFastTagRepo.getAll(filter);
      // Convert MongoDB docs to session records using the same logic as fastTagRepo

      const sessions = docs.map(
        (doc) =>
          ({
            formType: doc.formType,
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
          }) as FastTagSessionRecord,
      );
      allSessions.push(...sessions);
    }

    // Create a map for quick lookup by vehicle number and bank
    const sessionMap = new Map<string, FastTagSessionRecord>();
    allSessions.forEach((session) => {
      const key = `${session.vehicle_number.toLowerCase()}_${session.formType.toLowerCase()}`;
      sessionMap.set(key, session);
    });

    // Enhance each row
    return rows.map((row) => {
      // Set formType based on bank name mapping
      const formType =
        bankNameToCodeMap.get(row.bank.toLowerCase()) || row.bank;

      const vehicleKey = `${row.rc_number.toLowerCase()}_${formType.toLowerCase()}`;
      const existingSession = sessionMap.get(vehicleKey);

      // Use opening balance from MongoDB if record exists, otherwise use row data
      const openingAmount = existingSession
        ? existingSession.opening_balance.toString()
        : row.opening_amount;

      // Convert bank name to bank code
      const bankCode = formType;

      return {
        ...row,
        formType: formType, // Set the correct formType
        opening_amount: openingAmount,
        bank_code: bankCode,
        has_existing_record: !!existingSession,
      };
    });
  } catch (error) {
    console.error("Error enhancing row data:", error);
    // Return original data if enhancement fails
    return rows.map((row) => ({
      ...row,
      bank_code: row.bank,
      has_existing_record: false,
    }));
  }
}

function downloadDummyExcel() {
  const banks = getEnabledBanks();
  const bankName = banks.length > 0 ? banks[0].name : "ICICI Bank";

  // Get current IST time for realistic dates
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(
    now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000,
  );

  const dummyData = [
    {
      RC_Number: "TS09UB1234",
      Bank: bankName,
      Source_State: "Telangana",
      Source_City: "Hyderabad",
      Destination_State: "Maharashtra",
      Destination_City: "Mumbai",
      Opening_Amount: "1000",
      Start_Date: formatDateTimeToIST(istNow.toISOString()).split(",")[0],
      Start_Time:
        formatDateTimeToIST(istNow.toISOString()).split(",")[1] || "10:30 AM",
      Vehicle_Type: "2AxlesAuto",
    },
    {
      RC_Number: "MH12AB5678",
      Bank: "HDFC Bank",
      Source_State: "Maharashtra",
      Source_City: "Pune",
      Destination_State: "Karnataka",
      Destination_City: "Bangalore",
      Opening_Amount: "1500",
      Start_Date: formatDateTimeToIST(
        new Date(istNow.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
      ).split(",")[0],
      Start_Time:
        formatDateTimeToIST(
          new Date(istNow.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
        ).split(",")[1] || "1:00 PM",
      Vehicle_Type: "2AxlesAuto",
    },
    {
      RC_Number: "KA01CD9012",
      Bank: "Axis Bank",
      Source_State: "Karnataka",
      Source_City: "Bangalore",
      Destination_State: "Tamil Nadu",
      Destination_City: "Chennai",
      Opening_Amount: "800",
      Start_Date: formatDateTimeToIST(
        new Date(istNow.getTime() + 6.25 * 60 * 60 * 1000).toISOString(),
      ).split(",")[0],
      Start_Time:
        formatDateTimeToIST(
          new Date(istNow.getTime() + 6.25 * 60 * 60 * 1000).toISOString(),
        ).split(",")[1] || "4:45 PM",
      Vehicle_Type: "2AxlesAuto",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(dummyData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TollData");
  XLSX.writeFile(wb, "FastTag_Upload_Template.xlsx");
}

export default function FastTagUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "success" | "failed"
  >("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ProcessedRow | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [tollDetailsDialogOpen, setTollDetailsDialogOpen] = useState(false);
  const [selectedTollHistory, setSelectedTollHistory] = useState<TollRecord[]>(
    [],
  );
  const [existingSessionDetails, setExistingSessionDetails] =
    useState<FastTagSessionRecord | null>(null);
  const [showExistingDetailsDialog, setShowExistingDetailsDialog] =
    useState(false);

  // Function to fetch existing session details
  const fetchExistingSessionDetails = async (
    rcNumber: string,
    bankCode: string,
  ) => {
    try {
      const docs = await mongoFastTagRepo.getAll({
        vehicleNumber: rcNumber.toLowerCase(),
        formType: bankCode,
      });
      if (docs.length > 0) {
        const doc = docs[0];
        const session: FastTagSessionRecord = {
          formType: doc.formType,
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
        setExistingSessionDetails(session);
        return session;
      }
    } catch (error) {
      console.error("Error fetching existing session details:", error);
    }
    return null;
  };

  const processFile = useCallback(async (file: File) => {
    // File size validation - limit to 2MB
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        title: "File too large",
        description: `File size is ${fileSizeMB}MB. Maximum allowed size is 2MB.`,
        variant: "destructive",
      });
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      toast({
        title: "Unsupported file format",
        description: "Please upload a CSV or Excel file",
        variant: "destructive",
      });
      return;
    }
    setParsing(true);
    setHasProcessed(false);
    setProcessedRows([]);
    try {
      let headers: string[] = [];
      let data: Record<string, unknown>[] = [];
      if (ext === "csv") {
        const parsed = await new Promise<
          Papa.ParseResult<Record<string, unknown>>
        >((resolve) => {
          Papa.parse<Record<string, unknown>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
          });
        });
        headers = parsed.meta.fields || [];
        data = parsed.data;
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        if (data.length > 0) headers = Object.keys(data[0]);
      }
      if (data.length === 0) {
        toast({ title: "File is empty", variant: "destructive" });
        setParsing(false);
        return;
      }
      const validation = validateFile(headers, data, file.name);
      setValidationResult(validation);
      if (validation.valid) {
        toast({ title: `${validation.data.length} rows loaded successfully` });
      } else {
        toast({
          title: "Validation issues found",
          description: `${validation.errors.length} issue(s)`,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Failed to parse file", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        // File size validation - limit to 2MB
        if (file.size > MAX_FILE_SIZE) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          toast({
            title: "File too large",
            description: `File size is ${fileSizeMB}MB. Maximum allowed size is 2MB.`,
            variant: "destructive",
          });
          return;
        }
        processFile(file);
      }
    },
    [processFile],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // File size validation - limit to 2MB
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast({
          title: "File too large",
          description: `File size is ${fileSizeMB}MB. Maximum allowed size is 2MB.`,
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      processFile(file);
    }
    e.target.value = "";
  };

  const handleProcess = async () => {
    if (!validationResult || !validationResult.valid) return;
    setIsProcessing(true);

    const rows: ProcessedRow[] = validationResult.data.map((row, idx) => ({
      data: row,
      _status: "processing" as ProcessStatus,
      _failReason: undefined,
      _selected: false,
      _id: `row-${idx}`,
    }));
    setProcessedRows(rows);

    try {
      // Enhance row data with MongoDB records and bank codes
      const enhancedRows = await enhanceRowDataWithMongoRecords(
        validationResult.data.map((row) => ({
          rc_number: row.rc_number,
          bank: row.bank,
          formType: row.formType,
          source_state: row.source_state,
          source_city: row.source_city,
          destination_state: row.destination_state,
          destination_city: row.destination_city,
          opening_amount: row.opening_amount,
          start_date: row.start_date,
          start_time: row.start_time,
          vehicle_type: row.vehicle_type,
        })),
      );

      // Process rows using the FastTag service
      const tollResults = await fastTagService.processFastTagRows(enhancedRows);

      // Map results back to ProcessedRow format using enhancedRows instead of original rows
      const results: ProcessedRow[] = enhancedRows.map((enhancedRow, idx) => {
        const tollResult = tollResults[idx];
        const originalRow = rows[idx];

        if (!tollResult.success) {
          return {
            ...originalRow,
            data: enhancedRow as unknown as UploadedRow, // Cast through unknown
            _status: "failed" as ProcessStatus,
            _failReason: tollResult.error || "Processing failed",
            _tollHistory: [],
          };
        }

        if (tollResult.insufficientBalance) {
          return {
            ...originalRow,
            data: enhancedRow as unknown as UploadedRow, // Cast through unknown
            _status: "failed" as ProcessStatus,
            _failReason: tollResult.error || INSUFFICIENT_BALANCE_REASON,
            _tollHistory: tollResult.records,
          };
        }

        return {
          ...originalRow,
          data: enhancedRow as unknown as UploadedRow, // Cast through unknown
          _status: "success" as ProcessStatus,
          _tollHistory: tollResult.records,
        };
      });

      setProcessedRows(results);
      setHasProcessed(true);

      // Show summary toast
      const successCount = results.filter(
        (r) => r._status === "success",
      ).length;
      const failedCount = results.filter((r) => r._status === "failed").length;

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${successCount} rows. ${failedCount} rows failed.`,
        variant: failedCount > 0 ? "destructive" : "default",
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Error",
        description: "An error occurred while processing the toll data.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async (ids: string[]) => {
    setProcessedRows((prev) =>
      prev.map((r) =>
        ids.includes(r._id)
          ? {
              ...r,
              _status: "processing" as ProcessStatus,
              _failReason: undefined,
            }
          : r,
      ),
    );

    try {
      // Get the rows to retry
      const rowsToRetry = processedRows.filter((r) => ids.includes(r._id));

      // Enhance row data with MongoDB records and bank codes
      const enhancedRows = await enhanceRowDataWithMongoRecords(
        rowsToRetry.map((row) => ({
          rc_number: row.data.rc_number,
          bank: row.data.bank,
          formType: row.data.formType || row.data.bank,
          source_state: row.data.source_state,
          source_city: row.data.source_city,
          destination_state: row.data.destination_state,
          destination_city: row.data.destination_city,
          opening_amount: row.data.opening_amount,
          start_date: row.data.start_date,
          start_time: row.data.start_time,
          vehicle_type: row.data.vehicle_type,
        })),
      );

      // Process them using the FastTag service with enhanced data
      const tollResults = await fastTagService.processFastTagRows(
        enhancedRows.map((row) => ({
          rc_number: row.rc_number,
          bank: row.bank,
          source_state: row.source_state,
          source_city: row.source_city,
          destination_state: row.destination_state,
          destination_city: row.destination_city,
          opening_amount: row.opening_amount,
          start_date: row.start_date,
          vehicle_type: row.vehicle_type,
        })),
      );

      // Update the processed rows with new results
      setProcessedRows((prev) =>
        prev.map((r) => {
          const index = ids.indexOf(r._id);
          if (index === -1) return r;

          const tollResult = tollResults[index];

          if (!tollResult.success) {
            return {
              ...r,
              _status: "failed" as ProcessStatus,
              _failReason: tollResult.error || "Processing failed",
              _tollHistory: [],
            };
          }

          if (tollResult.insufficientBalance) {
            return {
              ...r,
              _status: "failed" as ProcessStatus,
              _failReason: tollResult.error || INSUFFICIENT_BALANCE_REASON,
              _tollHistory: tollResult.records,
            };
          }

          return {
            ...r,
            _status: "success" as ProcessStatus,
            _tollHistory: tollResult.records,
          };
        }),
      );
    } catch (error) {
      console.error("Retry error:", error);
      toast({
        title: "Retry Failed",
        description: "An error occurred during retry processing.",
        variant: "destructive",
      });
    }
  };

  const handleEditRow = (row: ProcessedRow) => {
    setEditingRow(row);
    setEditAmount(row.data.opening_amount || "");
    setEditDescription(row._failReason || "");
    setEditDialogOpen(true);
  };

  const handleViewTollDetails = (
    tollHistory: TollRecord[],
    row: ProcessedRow,
  ) => {
    setSelectedTollHistory(tollHistory);
    setEditingRow(row);
    setTollDetailsDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    // Update the amount in the row data
    setProcessedRows((prev) =>
      prev.map((r) => {
        if (r._id !== editingRow._id) return r;
        return {
          ...r,
          data: { ...r.data, opening_amount: editAmount },
        };
      }),
    );
    setEditDialogOpen(false);
    toast({ title: "Amount updated", description: "Re-processing record..." });
    // Auto re-process this record with updated amount
    setTimeout(() => {
      handleRetry([editingRow._id]);
    }, 300);
  };

  const toggleSelect = (id: string) => {
    setProcessedRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, _selected: !r._selected } : r)),
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setProcessedRows((prev) =>
      prev.map((r) => {
        if (statusFilter === "all" || r._status === statusFilter) {
          return { ...r, _selected: checked };
        }
        return r;
      }),
    );
  };

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return processedRows;
    return processedRows.filter((r) => r._status === statusFilter);
  }, [processedRows, statusFilter]);

  const selectedRows = processedRows.filter((r) => r._selected);
  const selectedSuccessRows = selectedRows.filter(
    (r) => r._status === "success",
  );
  const selectedFailedRows = selectedRows.filter((r) => r._status === "failed");
  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => r._selected);

  const handleDownloadPDF = () => {
    if (selectedSuccessRows.length === 0) {
      toast({
        title: "Select success records to download",
        variant: "destructive",
      });
      return;
    }

    // Build printable HTML with toll history and bank logo
    const content = selectedSuccessRows
      .map((row) => {
        const tollHtml = (row._tollHistory || [])
          .map(
            (t) => `
        <tr>
          <td style="padding:6px 10px;border:1px solid #ddd;">${t.processingTime}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;">${t.transactionTime}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;">${t.nature}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;">₹${t.amount}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;">₹${t.closingBalance}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;">${t.tollName}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;">${t.txnId}</td>
        </tr>
      `,
          )
          .join("");

        const bankInitial = (row.data.bank || "B")[0].toUpperCase();
        return `
        <div style="page-break-after:always;margin-bottom:30px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:48px;height:48px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:22px;font-weight:bold;">${bankInitial}</div>
            <div>
              <div style="font-size:18px;font-weight:bold;">${row.data.bank}</div>
              <div style="color:#666;font-size:13px;">FASTag Toll Statement</div>
            </div>
          </div>
          <table style="margin-bottom:12px;font-size:13px;">
            <tr><td style="padding:2px 12px 2px 0;font-weight:600;">Vehicle:</td><td>${row.data.rc_number}</td></tr>
            <tr><td style="padding:2px 12px 2px 0;font-weight:600;">Route:</td><td>${row.data.source_city}, ${row.data.source_state} → ${row.data.destination_city}, ${row.data.destination_state}</td></tr>
            <tr><td style="padding:2px 12px 2px 0;font-weight:600;">Opening Amount:</td><td>₹${row.data.opening_amount}</td></tr>
            <tr><td style="padding:2px 12px 2px 0;font-weight:600;">Start Date:</td><td>${row.data.start_date}</td></tr>
          </table>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;">Processing Time</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;">Transaction Time</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;">Nature</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;">Amount</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;">Closing Bal</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;">Toll Name</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;">Txn ID</th>
              </tr>
            </thead>
            <tbody>${tollHtml}</tbody>
          </table>
        </div>
      `;
      })
      .join("");

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>FASTag Toll Report</title>
        <style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a;}@media print{body{padding:12px;}}</style>
        </head><body>
        <h2 style="margin-bottom:20px;">FASTag Toll Report</h2>
        ${content}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const clearAll = () => {
    setValidationResult(null);
    setProcessedRows([]);
    setHasProcessed(false);
    setStatusFilter("all");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Upload File to Get Toll Details
                </h1>
                <p className="text-sm text-muted-foreground">
                  Import a CSV or Excel file with vehicle and route data for
                  toll search
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={downloadDummyExcel}
            >
              <Download className="w-4 h-4" />
              Download Template
            </Button>
          </div>
        </motion.div>

        {/* Upload Area */}
        {!validationResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                {parsing ? (
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Upload className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Upload CSV or Excel file
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drag and drop or click to browse (Max 2MB)
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileSpreadsheet className="w-4 h-4" />
                  Supports .csv, .xlsx, .xls files
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* File Requirements */}
        {!validationResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  File Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>
                      File must contain these required columns:
                      <span className="flex flex-wrap gap-1.5 mt-1">
                        {REQUIRED_COLUMNS.map((col) => (
                          <Badge
                            key={col}
                            variant="secondary"
                            className="text-xs"
                          >
                            {COLUMN_LABELS[col]}
                          </Badge>
                        ))}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    Supported formats: CSV, XLSX, XLS
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    Maximum file size: 2MB
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    Each row should contain one vehicle's toll route data
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Validation Result - before processing */}
        {validationResult && !hasProcessed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {validationResult.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {validationResult.data.length} rows loaded
                  </p>
                </div>
                {validationResult.valid ? (
                  <Badge
                    className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    variant="outline"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Valid
                  </Badge>
                ) : (
                  <Badge className="gap-1" variant="destructive">
                    <AlertCircle className="w-3 h-3" /> Has Issues
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={clearAll}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {validationResult.errors.length > 0 && (
              <Card className="border-destructive/30">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      {validationResult.errors.map((err, i) => (
                        <p key={i} className="text-sm text-destructive">
                          {err}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview Table */}
            {validationResult.data.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Preview Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-semibold w-10">
                              #
                            </TableHead>
                            {REQUIRED_COLUMNS.map((col) => (
                              <TableHead
                                key={col}
                                className="text-xs font-semibold whitespace-nowrap"
                              >
                                {COLUMN_LABELS[col]}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationResult.data
                            .slice(0, 20)
                            .map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-xs text-muted-foreground">
                                  {idx + 1}
                                </TableCell>
                                {REQUIRED_COLUMNS.map((col) => (
                                  <TableCell
                                    key={col}
                                    className="text-sm whitespace-nowrap"
                                  >
                                    {row[col] || (
                                      <span className="text-destructive">
                                        —
                                      </span>
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={clearAll}>
                Upload Another
              </Button>
              {validationResult.valid && (
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Process Toll Search
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Processed Results Table */}
        {hasProcessed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">
                  {validationResult?.fileName}
                </span>
                <Badge
                  variant="outline"
                  className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                >
                  <CheckCircle2 className="w-3 h-3" />{" "}
                  {processedRows.filter((r) => r._status === "success").length}{" "}
                  Success
                </Badge>
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />{" "}
                  {processedRows.filter((r) => r._status === "failed").length}{" "}
                  Failed
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={clearAll}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {(["all", "success", "failed"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={statusFilter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(f)}
                  >
                    {f === "all"
                      ? "All"
                      : f === "success"
                        ? "Success"
                        : "Failed"}
                    {f !== "all" &&
                      ` (${processedRows.filter((r) => r._status === f).length})`}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                {selectedFailedRows.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      handleRetry(selectedFailedRows.map((r) => r._id))
                    }
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retry Selected ({selectedFailedRows.length})
                  </Button>
                )}
                {selectedSuccessRows.length > 0 && (
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleDownloadPDF}
                  >
                    <Printer className="w-4 h-4" />
                    Print/Download PDF ({selectedSuccessRows.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Results DataTable */}
            <Card>
              <CardContent className="pt-4">
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10">
                            <Checkbox
                              checked={allFilteredSelected}
                              onCheckedChange={(checked) =>
                                toggleSelectAll(!!checked)
                              }
                            />
                          </TableHead>
                          <TableHead className="text-xs font-semibold w-10">
                            #
                          </TableHead>
                          <TableHead className="text-xs font-semibold whitespace-nowrap">
                            Status
                          </TableHead>
                          {REQUIRED_COLUMNS.map((col) => (
                            <TableHead
                              key={col}
                              className="text-xs font-semibold whitespace-nowrap"
                            >
                              {COLUMN_LABELS[col]}
                            </TableHead>
                          ))}
                          <TableHead className="text-xs font-semibold whitespace-nowrap">
                            Fail Reason
                          </TableHead>
                          <TableHead className="text-xs font-semibold whitespace-nowrap">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((row, idx) => (
                          <TableRow
                            key={row._id}
                            className={cn(row._selected && "bg-primary/5")}
                          >
                            <TableCell>
                              <Checkbox
                                checked={row._selected}
                                onCheckedChange={() => toggleSelect(row._id)}
                              />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              {row._status === "processing" && (
                                <Badge variant="secondary" className="gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />{" "}
                                  Processing
                                </Badge>
                              )}
                              {row._status === "success" && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Success
                                </Badge>
                              )}
                              {row._status === "failed" && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertCircle className="w-3 h-3" /> Failed
                                </Badge>
                              )}
                            </TableCell>
                            {REQUIRED_COLUMNS.map((col) => (
                              <TableCell
                                key={col}
                                className="text-sm whitespace-nowrap"
                              >
                                {row.data[col] || "—"}
                              </TableCell>
                            ))}
                            <TableCell className="text-sm text-destructive max-w-[250px]">
                              {row._failReason ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block truncate cursor-default">
                                        {row._failReason}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-xs text-sm"
                                    >
                                      {row._failReason}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {row._failReason ===
                                INSUFFICIENT_BALANCE_REASON && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 h-7 text-xs"
                                  onClick={() => handleEditRow(row)}
                                >
                                  <Pencil className="w-3 h-3" /> Edit
                                </Button>
                              )}
                              {row._tollHistory &&
                                row._tollHistory.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 h-7 text-xs"
                                    onClick={() =>
                                      handleViewTollDetails(
                                        row._tollHistory!,
                                        row,
                                      )
                                    }
                                  >
                                    <FileDown className="w-3 h-3" /> View Toll
                                    Details
                                  </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Edit Amount Dialog for Insufficient Balance */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Amount & Description</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-rc">RC Number</Label>
                <Input
                  id="edit-rc"
                  value={editingRow?.data.rc_number || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Opening Amount (₹)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="Enter new amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description (optional)</Label>
                <Input
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a note"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={
                  !editAmount ||
                  isNaN(Number(editAmount)) ||
                  Number(editAmount) <= 0
                }
              >
                Save & Re-process
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toll Details Dialog */}
        <TollDetailsDialog
          open={tollDetailsDialogOpen}
          onOpenChange={setTollDetailsDialogOpen}
          tollHistory={selectedTollHistory}
          editingRow={editingRow}
          onViewExistingDetails={
            editingRow?.data?.has_existing_record
              ? async () => {
                  const session = await fetchExistingSessionDetails(
                    editingRow.data.rc_number,
                    editingRow.data.formType,
                  );
                  if (session) {
                    setShowExistingDetailsDialog(true);
                  }
                }
              : undefined
          }
        />

        {/* Existing Session Details Dialog */}
        <ExistingVehicleDetailsDialog
          open={showExistingDetailsDialog}
          onOpenChange={setShowExistingDetailsDialog}
          details={existingSessionDetails}
        />
      </div>
    </AppLayout>
  );
}
