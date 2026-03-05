import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard,
  ChevronRight,
  Clock,
  CheckCircle2,
  ExternalLink,
  CalendarIcon,
  User,
  Phone,
  Truck,
  IndianRupee,
  Pencil,
  Plus,
  MapPin,
  Loader2,
  Car,
  Bus,
  Bike,
  Caravan,
  Trash2,
  FileDown,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { fastTagService } from "@/services/fasttag-service";
import {
  statesCitiesApi,
  type StateOption as ApiStateOption,
} from "@/lib/states-cities-api";
import { tollApi } from "@/lib/toll-api";

import { generateFastTagPDF } from "@/lib/fasttag-pdf";
import { useBanks } from "@/components/BankSelect";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { verifyRC, getMockRCData } from "@/lib/rc-api";

// Bank display name → MongoDB formType mapping
const BANK_FORM_TYPE_MAP: Record<string, string> = {
  idfc: "blackbuck",
  idbi: "parkplus",
};

// Fallback states (used if API fails)
const FALLBACK_STATES: StateOption[] = [
  { name: "Maharashtra", iso_code: "MH" },
  { name: "Telangana", iso_code: "TG" },
  { name: "Karnataka", iso_code: "KA" },
  { name: "Tamil Nadu", iso_code: "TN" },
  { name: "Gujarat", iso_code: "GJ" },
  { name: "Rajasthan", iso_code: "RJ" },
  { name: "Uttar Pradesh", iso_code: "UP" },
  { name: "Madhya Pradesh", iso_code: "MP" },
  { name: "Andhra Pradesh", iso_code: "AP" },
  { name: "Delhi", iso_code: "DL" },
];

const VEHICLE_TYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  car: Car,
  truck: Truck,
  bus: Bus,
  bike: Bike,
  lcv: Truck,
  taxi: Car,
  rv: Caravan,
};

const VEHICLE_TYPES = [
  { value: "2AxlesAuto", description: "Car, Jeep, Van, SUV", iconKey: "car" },
  {
    value: "3AxlesAuto",
    description: "Car, SUV towing 1-axle trailer",
    iconKey: "car",
  },
  {
    value: "4AxlesAuto",
    description: "Car, SUV towing 2-axle trailer",
    iconKey: "car",
  },
  { value: "2AxlesTaxi", description: "Taxi", iconKey: "taxi" },
  {
    value: "2AxlesLCV",
    description: "Pickup truck, Light Commercial Vehicles",
    iconKey: "lcv",
  },
  { value: "2AxlesTruck", description: "Truck - 2 Axles", iconKey: "truck" },
  { value: "3AxlesTruck", description: "Truck - 3 Axles", iconKey: "truck" },
  { value: "4AxlesTruck", description: "Truck - 4 Axles", iconKey: "truck" },
  { value: "5AxlesTruck", description: "Truck - 5 Axles", iconKey: "truck" },
  { value: "6AxlesTruck", description: "Truck - 6 Axles", iconKey: "truck" },
  { value: "7AxlesTruck", description: "Truck - 7+ Axles", iconKey: "truck" },
  { value: "2AxlesBus", description: "Bus - 2 Axles", iconKey: "bus" },
  { value: "3AxlesBus", description: "Bus - 3 Axles", iconKey: "bus" },
  { value: "4AxlesBus", description: "Bus - 4 Axles", iconKey: "bus" },
  { value: "2AxlesMotorcycle", description: "Bike", iconKey: "bike" },
];

// Mock toll data for demo
const MOCK_TOLL_DATA = [
  { tollName: "Arambha", amount: "0" },
  { tollName: "Nandori", amount: "0" },
  { tollName: "Visapur", amount: "0" },
  { tollName: "Sarandi Toll Plaza", amount: "90" },
  { tollName: "Mandamarri Toll Plaza", amount: "90" },
  { tollName: "Basanthnagar", amount: "76" },
  { tollName: "Singarajupally", amount: "45" },
  { tollName: "Yerkaram", amount: "45" },
  { tollName: "Chillakallu", amount: "110" },
  { tollName: "Keesara Fee Plaza", amount: "70" },
];

interface RouteInfo {
  routeName: string;
  distance: string;
  duration: string;
  fastagTotal: number;
  tollSegments: { name: string; amount: number }[];
}

interface FormData {
  vehicleNumber: string;
  customerName: string;
  customerMobile: string;
  truckNumber: string;
  truckOwnerName: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  openingBalance: string;
}

interface TollEntry {
  id: string;
  processingTime: string;
  transactionTime: string;
  amount: string;
  tollName: string;
  selected: boolean;
}

interface HistoryEntry {
  id: string;
  processingTime: string;
  transactionTime: string;
  nature: "Debit" | "Credit";
  amount: string;
  closingBalance: string;
  description: string;
  txnId: string;
}

interface ManualTransaction {
  processingTime: string;
  transactionTime: string;
  type: string;
  amount: string;
  description: string;
}

interface StateOption {
  name: string;
  iso_code: string;
}

function generateTxnId(): string {
  return Math.floor(Math.random() * 90000000000000 + 10000000000000).toString();
}

export default function FastTag() {
  const navigate = useNavigate();
  const { banks: allBanks } = useBanks();
  const banks = allBanks
    .filter((b) => b.is_active)
    .map((b) => ({ id: b.code, name: `${b.bank_name} (${b.code})` }));
  const [selectedBank, setSelectedBankState] = useState<string | null>(() => {
    return sessionStorage.getItem("fasttag-selected-bank");
  });

  const setSelectedBank = (bank: string | null) => {
    setSelectedBankState(bank);
    if (bank) {
      sessionStorage.setItem("fasttag-selected-bank", bank);
      window.dispatchEvent(new Event("collapse-sidebar"));
    } else {
      sessionStorage.removeItem("fasttag-selected-bank");
    }
  };
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [detailsFetched, setDetailsFetched] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [tollsLoaded, setTollsLoaded] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    vehicleNumber: "",
    customerName: "",
    customerMobile: "",
    truckNumber: "",
    truckOwnerName: "",
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    openingBalance: "",
  });

  // Toll finder state
  const [vehicleType, setVehicleType] = useState("");
  const [sourceState, setSourceState] = useState("");
  const [sourceCity, setSourceCity] = useState("");
  const [destState, setDestState] = useState("");
  const [destCity, setDestCity] = useState("");
  const [tolls, setTolls] = useState<TollEntry[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [fetchingTolls, setFetchingTolls] = useState(false);

  // States & cities from API
  const [statesList, setStatesList] = useState<StateOption[]>([]);
  const [sourceCities, setSourceCities] = useState<string[]>([]);
  const [destCities, setDestCities] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingSourceCities, setLoadingSourceCities] = useState(false);
  const [loadingDestCities, setLoadingDestCities] = useState(false);

  // Load states on mount
  useEffect(() => {
    setLoadingStates(true);
    statesCitiesApi
      .getStates()
      .then((states) =>
        setStatesList(
          states.map((s) => ({ name: s.name, iso_code: s.iso_code })),
        ),
      )
      .catch(() => setStatesList(FALLBACK_STATES))
      .finally(() => setLoadingStates(false));
  }, []);

  // Load source cities when source state changes
  useEffect(() => {
    if (!sourceState) {
      setSourceCities([]);
      return;
    }
    setLoadingSourceCities(true);
    setSourceCity("");
    statesCitiesApi
      .getCitiesByState(sourceState)
      .then((cities) => setSourceCities(cities))
      .catch(() => setSourceCities([]))
      .finally(() => setLoadingSourceCities(false));
  }, [sourceState]);

  // Load dest cities when dest state changes
  useEffect(() => {
    if (!destState) {
      setDestCities([]);
      return;
    }
    setLoadingDestCities(true);
    setDestCity("");
    statesCitiesApi
      .getCitiesByState(destState)
      .then((cities) => setDestCities(cities))
      .catch(() => setDestCities([]))
      .finally(() => setLoadingDestCities(false));
  }, [destState]);

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Manual transaction state
  const [manualTx, setManualTx] = useState<ManualTransaction>({
    processingTime: "",
    transactionTime: "",
    type: "Debit",
    amount: "",
    description: "",
  });

  const updateForm = (key: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetFormState = () => {
    setFormData({
      vehicleNumber: "",
      customerName: "",
      customerMobile: "",
      truckNumber: "",
      truckOwnerName: "",
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endDate: new Date(),
      openingBalance: "",
    });
    setHistory([]);
    setSubmitted(false);
    setIsEditing(false);
    setDetailsFetched(false);
    setTollsLoaded(false);
    setTolls([]);
    setRouteInfo(null);
    setManualTx({
      processingTime: "",
      transactionTime: "",
      type: "Debit",
      amount: "",
      description: "",
    });
  };

  const handleGetDetails = async () => {
    if (!formData.vehicleNumber.trim()) {
      toast({ title: "Vehicle Number is required", variant: "destructive" });
      return;
    }
    setFetchingDetails(true);
    try {
      const vehicleNum = formData.vehicleNumber.trim();

      // Step 1: Try to get existing session from FastTag service (MongoDB)
      let foundExisting = false;
      try {
        const formType = selectedBank
          ? BANK_FORM_TYPE_MAP[selectedBank] || selectedBank
          : undefined;
        const result = await fastTagService.getSessionWithHistory({
          vehicleNumber: vehicleNum,
          formType,
        });

        if (result) {
          const { session, history: historyRecords } = result;
          foundExisting = true;

          // Fill form from existing session data
          setCurrentSessionId(session.id);
          setFormData((prev) => ({
            ...prev,
            customerName: session.customer_name || prev.customerName,
            customerMobile: session.customer_mobile || prev.customerMobile,
            truckNumber: session.truck_number || prev.truckNumber,
            truckOwnerName: session.truck_owner_name || prev.truckOwnerName,
            openingBalance: String(session.opening_balance || ""),
          }));
          setDetailsFetched(true);

          // Load transactions into history
          if (historyRecords.length > 0) {
            const mappedHistory: HistoryEntry[] = historyRecords.map((h) => ({
              id: h.id,
              processingTime: h.processing_time || "",
              transactionTime: h.transaction_time || "",
              nature: h.nature,
              amount: String(h.amount),
              closingBalance: h.closing_balance
                ? h.closing_balance.toLocaleString("en-IN")
                : "0",
              description: h.description || "",
              txnId: h.txn_id || h.id,
            }));
            setHistory(mappedHistory);
            toast({
              title: `Loaded ${mappedHistory.length} existing transaction(s) from database`,
            });
          }

          toast({ title: "Session found! Details loaded from database." });
        }
      } catch (sessionErr) {
        console.warn("Could not fetch existing session:", sessionErr);
      }

      // Step 2: If no existing session, call verifyRC → then create a new session
      if (!foundExisting) {
        let rcData;
        try {
          const response = await verifyRC(vehicleNum);
          rcData = response.data;
        } catch {
          const mock = getMockRCData(vehicleNum);
          rcData = mock.data;
        }

        if (rcData) {
          setFormData((prev) => ({
            ...prev,
            customerName: rcData.owner_name || prev.customerName,
            truckNumber: rcData.rc_number || prev.truckNumber,
            truckOwnerName: rcData.owner_name || prev.truckOwnerName,
          }));
          setDetailsFetched(true);
          toast({ title: "Vehicle details fetched via RC verification" });

          // Try to create a new session in MongoDB (returns null if 409 = already exists)
          try {
            const formTypeForCreate = selectedBank
              ? BANK_FORM_TYPE_MAP[selectedBank] || selectedBank
              : selectedBank!;
            const newSession = await fastTagService.createSession({
              formType: formTypeForCreate,
              bank_id: formTypeForCreate,
              bank_name: formTypeForCreate,
              vehicle_number: vehicleNum,
              customer_name: rcData.owner_name || "",
              customer_mobile: "",
              truck_number: rcData.rc_number || vehicleNum,
              truck_owner_name: rcData.owner_name || "",
              opening_balance: 0,
            });
            if (newSession) {
              toast({
                title: "New session created in database",
                description: `ID: ${newSession.id}`,
              });
            } else {
              toast({ title: "Vehicle already exists in database" });
            }
          } catch (createErr: unknown) {
            console.warn("Could not create session:", createErr);
          }
        }
      }
    } catch (err) {
      toast({
        title: "Failed to fetch vehicle details",
        variant: "destructive",
      });
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.openingBalance.trim() ||
      isNaN(Number(formData.openingBalance))
    ) {
      toast({
        title: "Opening Balance is required and must be a valid number",
        variant: "destructive",
      });
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Please select statement duration",
        variant: "destructive",
      });
      return;
    }

    // Save/update session in MongoDB
    try {
      const formTypeForSave = selectedBank
        ? BANK_FORM_TYPE_MAP[selectedBank] || selectedBank
        : selectedBank!;
      if (currentSessionId) {
        console.log("update to mongo", currentSessionId, formTypeForSave);
        // Update existing session
        await fastTagService.updateSession(currentSessionId, {
          customer_name: formData.customerName,
          customer_mobile: formData.customerMobile,
          truck_number: formData.truckNumber,
          truck_owner_name: formData.truckOwnerName,
          opening_balance: Number(formData.openingBalance) || 0,
        });
        toast({ title: "Session updated in database" });
      } else {
        // Create new session
        const newSession = await fastTagService.createSession({
          formType: formTypeForSave,
          bank_id: formTypeForSave,
          bank_name: formTypeForSave,
          vehicle_number: formData.vehicleNumber,
          customer_name: formData.customerName,
          customer_mobile: formData.customerMobile,
          truck_number: formData.truckNumber,
          truck_owner_name: formData.truckOwnerName,
          opening_balance: Number(formData.openingBalance) || 0,
          start_date: formData.startDate?.toISOString(),
          end_date: formData.endDate?.toISOString(),
        });
        if (newSession) {
          setCurrentSessionId(newSession.id);
          toast({ title: "Session saved to database" });
        }
      }
    } catch (err: unknown) {
      console.warn("Failed to save session:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast({
        title: "Warning: Could not save session",
        description: errorMessage,
        variant: "destructive",
      });
    }

    setSubmitted(true);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setSubmitted(false);
    setIsEditing(true);
  };

  const selectedBankName = banks.find((b) => b.id === selectedBank)?.name || "";

  // Get Toll Routes handler - calls real API
  const handleGetTollRoutes = async () => {
    if (
      !vehicleType ||
      !sourceState ||
      !sourceCity ||
      !destState ||
      !destCity
    ) {
      toast({
        title: "Please fill all toll finder fields",
        variant: "destructive",
      });
      return;
    }

    setFetchingTolls(true);
    try {
      const result = await tollApi.getTollInfo(
        sourceCity,
        sourceState,
        destCity,
        destState,
        vehicleType,
      );

      const newTolls: TollEntry[] = result.tollSegments.map((seg, i) => ({
        id: `toll-${Date.now()}-${i}`,
        processingTime: seg.etaInfo?.processedDateTime || "",
        transactionTime: seg.etaInfo?.processedTransactionDateTime || "",
        amount: String(seg.amount || 0),
        tollName: seg.name || seg.plazaName || "",
        selected: false,
      }));

      setTolls(newTolls);
      setTollsLoaded(true);

      setRouteInfo({
        routeName: result.routeName,
        distance: result.distance,
        duration: result.duration,
        fastagTotal: result.fastagTotal,
        tollSegments: result.tollSegments.map((s) => ({
          name: s.name,
          amount: s.amount,
        })),
      });

      toast({ title: "Toll routes loaded from API" });
    } catch (err: unknown) {
      console.error("Toll API error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast({
        title: "Failed to fetch toll routes",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setFetchingTolls(false);
    }
  };

  // Select all tolls
  const allSelected = tolls.length > 0 && tolls.every((t) => t.selected);
  const someSelected = tolls.some((t) => t.selected);
  const handleSelectAll = (checked: boolean) => {
    setTolls((prev) => prev.map((t) => ({ ...t, selected: checked })));
  };

  // Calculate running closing balance
  const calculateClosingBalance = (
    upToIndex: number,
    existingHistory: HistoryEntry[],
  ): string => {
    let balance = Number(formData.openingBalance) || 0;
    for (let i = 0; i <= upToIndex; i++) {
      const entry = existingHistory[i];
      const amt = Number(entry.amount) || 0;
      balance = entry.nature === "Debit" ? balance - amt : balance + amt;
    }
    return balance.toLocaleString("en-IN");
  };

  // Recalculate all closing balances (optionally pass opening balance to avoid stale state)
  const recalcBalances = (
    entries: HistoryEntry[],
    overrideOpeningBalance?: number,
  ): HistoryEntry[] => {
    let balance =
      overrideOpeningBalance !== undefined
        ? overrideOpeningBalance
        : Number(formData.openingBalance) || 0;
    return entries.map((e) => {
      const amt = Number(e.amount) || 0;
      balance = e.nature === "Debit" ? balance - amt : balance + amt;
      return { ...e, closingBalance: balance.toLocaleString("en-IN") };
    });
  };

  // Add selected tolls to history
  const handleAddSelectedTolls = () => {
    const selectedTolls = tolls.filter((t) => t.selected);
    if (selectedTolls.length === 0) {
      toast({
        title: "Please select at least one toll",
        variant: "destructive",
      });
      return;
    }

    // Validate datetime fields for selected tolls
    const missingDates = selectedTolls.filter(
      (t) => !t.processingTime || !t.transactionTime,
    );
    if (missingDates.length > 0) {
      toast({
        title: "Processing Time and Transaction Time are required",
        description: `Please fill date/time for all selected tolls (${missingDates.length} missing)`,
        variant: "destructive",
      });
      return;
    }

    const newEntries: HistoryEntry[] = selectedTolls.map((t) => ({
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      processingTime: t.processingTime,
      transactionTime: t.transactionTime,
      nature: "Debit" as const,
      amount: t.amount,
      closingBalance: "0",
      description: t.tollName,
      txnId: generateTxnId(),
    }));

    // Deduct total selected toll amount from opening balance
    const totalTollAmount = selectedTolls.reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0,
    );
    const currentOpening = Number(formData.openingBalance) || 0;
    const newOpening = currentOpening - totalTollAmount;
    setFormData((prev) => ({ ...prev, openingBalance: String(newOpening) }));

    const updated = recalcBalances([...history, ...newEntries], currentOpening);
    setHistory(updated);

    // Remove added tolls from the list
    setTolls((prev) => prev.filter((t) => !t.selected));
    toast({
      title: `${selectedTolls.length} toll(s) added to history`,
      description: `Opening balance updated: ₹${currentOpening.toLocaleString("en-IN")} → ₹${newOpening.toLocaleString("en-IN")}`,
    });
  };

  // Add manual transaction to history
  const addManualTransaction = () => {
    if (!manualTx.amount || !manualTx.description) {
      toast({
        title: "Amount and Description are required",
        variant: "destructive",
      });
      return;
    }

    const txAmount = Number(manualTx.amount) || 0;
    const currentOpening = Number(formData.openingBalance) || 0;

    const newEntry: HistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      processingTime: manualTx.processingTime,
      transactionTime: manualTx.transactionTime,
      nature: manualTx.type as "Debit" | "Credit",
      amount: manualTx.amount,
      closingBalance: "0",
      description: manualTx.description,
      txnId: generateTxnId(),
    };

    if (manualTx.type === "Credit") {
      // For Credit: increase opening balance, don't recalculate existing balances
      const newOpening = currentOpening + txAmount;
      setFormData((prev) => ({ ...prev, openingBalance: String(newOpening) }));
      // Recalc all balances with the new opening balance
      const updated = recalcBalances([...history, newEntry], newOpening);
      setHistory(updated);
      toast({
        title: "Credit transaction added",
        description: `Opening balance updated: ₹${currentOpening.toLocaleString("en-IN")} → ₹${newOpening.toLocaleString("en-IN")}`,
      });
    } else {
      // For Debit: deduct from opening balance and add new entry without recalculating existing balances
      const newOpening = currentOpening - txAmount;
      // Update the new entry's closing balance to current opening balance
      newEntry.closingBalance = String(newOpening);
      setFormData((prev) => ({ ...prev, openingBalance: String(newOpening) }));
      // Add new entry to history without recalculating existing balances
      setHistory((prev) => [...prev, newEntry]);
      toast({
        title: "Debit transaction added",
        description: `Opening balance updated: ₹${currentOpening.toLocaleString("en-IN")} → ₹${newOpening.toLocaleString("en-IN")}`,
      });
    }

    setManualTx({
      processingTime: "",
      transactionTime: "",
      type: "Debit",
      amount: "",
      description: "",
    });
  };

  // Delete history entry from DB and state
  const handleDeleteHistory = async (id: string) => {
    try {
      if (currentSessionId) {
        await fastTagService.deleteHistoryEntry(currentSessionId, id);
      }
      const updated = recalcBalances(history.filter((h) => h.id !== id));
      setHistory(updated);
      toast({ title: "Transaction deleted from database" });
    } catch (err: unknown) {
      console.error("Delete failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast({
        title: "Failed to delete transaction",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Edit history entry
  const handleOpenEdit = (entry: HistoryEntry) => {
    setEditingEntry({ ...entry });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    // Validate: opening balance should be less than total history amount
    const totalHistoryAmount = history.reduce((sum, h) => {
      const amt =
        Number(h.id === editingEntry.id ? editingEntry.amount : h.amount) || 0;
      return sum + amt;
    }, 0);
    const openingBal = Number(formData.openingBalance) || 0;
    if (openingBal > totalHistoryAmount) {
      toast({
        title: "Opening balance cannot exceed total history amount",
        description: `Opening: ₹${openingBal.toLocaleString("en-IN")}, Total: ₹${totalHistoryAmount.toLocaleString("en-IN")}`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (currentSessionId) {
        await fastTagService.updateHistoryEntry(
          currentSessionId,
          editingEntry.id,
          {
            session_id: currentSessionId,
            transaction_time: editingEntry.transactionTime,
            nature: editingEntry.nature,
            amount: Number(editingEntry.amount) || 0,
            closing_balance: 0,
            description: editingEntry.description,
            txn_id: editingEntry.txnId,
          },
        );
      }
      const updated = recalcBalances(
        history.map((h) => (h.id === editingEntry.id ? editingEntry : h)),
      );
      setHistory(updated);
      setEditDialogOpen(false);
      setEditingEntry(null);
      toast({ title: "Transaction updated in database" });
    } catch (err: unknown) {
      console.error("Update failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast({
        title: "Failed to update transaction",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  // Generate PDF and save to database
  const handleGeneratePDFAndSave = async () => {
    if (history.length === 0) {
      toast({ title: "No transactions to save", variant: "destructive" });
      return;
    }

    setSavingSession(true);
    try {
      // 1. Update session in DB (need to find existing session first or create if not exists)
      let session;
      if (currentSessionId) {
        session = await fastTagService.updateSession(currentSessionId, {
          bank_name: selectedBankName,
          bank_id: selectedBank!,
          vehicle_number: formData.vehicleNumber,
          customer_name: formData.customerName,
          customer_mobile: formData.customerMobile,
          truck_number: formData.truckNumber,
          truck_owner_name: formData.truckOwnerName,
          opening_balance: Number(formData.openingBalance) || 0,
        });
        console.log("currentSession", session);
      }
      console.log("history", history);
      // 2. Update history entries in DB
      const historyDataList = history.map((entry) => ({
        session_id: session.id,
        processing_time: entry.processingTime || undefined,
        transaction_time: entry.transactionTime || undefined,
        nature: entry.nature,
        amount: Number(entry.amount) || 0,
        closing_balance: Number(entry.closingBalance.replace(/,/g, "")) || 0,
        description: entry.description,
        txn_id: entry.txnId,
      }));

      // Create all entries at once
      if (historyDataList && historyDataList.length > 0) {
        await fastTagService.createHistoryEntries(
          formData.vehicleNumber,
          historyDataList,
        );
      } else {
        console.warn("No valid history data to save");
      }
      console.log("before generateFastTagPDF");
      // 3. Generate PDF
      generateFastTagPDF(
        {
          bankName: selectedBankName,
          vehicleNumber: formData.vehicleNumber,
          customerName: formData.customerName,
          truckNumber: formData.truckNumber,
          truckOwnerName: formData.truckOwnerName,
          openingBalance: formData.openingBalance,
          startDate: formData.startDate,
          endDate: formData.endDate,
        },
        history.map((h) => ({
          processingTime: h.processingTime,
          transactionTime: h.transactionTime,
          nature: h.nature,
          amount: h.amount,
          closingBalance: h.closingBalance,
          description: h.description,
          txnId: h.txnId,
        })),
      );

      toast({ title: "Session saved & PDF generated successfully" } as const);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast({
        title: "Failed to save",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSavingSession(false);
    }
  };

  // Bank selection screen
  if (!selectedBank) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Fast Tag</h1>
                <p className="text-sm text-muted-foreground">
                  Select a bank to proceed
                </p>
              </div>
            </div>
          </motion.div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pick the bank</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {banks.map((bank, index) => (
                <motion.button
                  key={bank.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedBank(bank.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 font-medium text-foreground">
                    {bank.name}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              ))}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: banks.length * 0.05 }}
                onClick={() => navigate("/fast-tag-history")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="flex-1 font-medium text-foreground">
                  View History
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Form / Post-submit screen
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedBank(null);
                resetFormState();
              }}
            >
              ← Back
            </Button>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Fast Tag</h1>
              <p className="text-sm text-muted-foreground">
                {selectedBankName}
              </p>
            </div>
          </div>
        </motion.div>

        {!submitted ? (
          /* ========== FORM ========== */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fill the details</CardTitle>
                <CardDescription>
                  Start by entering the customer's vehicle number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Vehicle Number */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">
                    Vehicle Number
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      value={formData.vehicleNumber}
                      onChange={(e) =>
                        updateForm(
                          "vehicleNumber",
                          e.target.value.toUpperCase(),
                        )
                      }
                      placeholder="Enter vehicle number"
                      className="flex-1 bg-primary/5 border-primary/20"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={handleGetDetails}
                      disabled={fetchingDetails}
                    >
                      {fetchingDetails ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />{" "}
                          Fetching...
                        </>
                      ) : (
                        <>
                          Get details <ExternalLink className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Customer details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">
                      Customer Name
                    </Label>
                    <Input
                      value={formData.customerName}
                      onChange={(e) =>
                        updateForm("customerName", e.target.value)
                      }
                      placeholder="Enter customer name"
                      disabled={!detailsFetched}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">
                      Customer Mobile
                    </Label>
                    <Input
                      value={formData.customerMobile}
                      onChange={(e) =>
                        updateForm("customerMobile", e.target.value)
                      }
                      placeholder="Enter mobile number"
                      disabled={!detailsFetched}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">
                      Truck Number
                    </Label>
                    <Input
                      value={formData.truckNumber}
                      onChange={(e) =>
                        updateForm("truckNumber", e.target.value.toUpperCase())
                      }
                      placeholder="Enter truck number"
                      disabled={!detailsFetched}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">
                      Truck Owner Name
                    </Label>
                    <Input
                      value={formData.truckOwnerName}
                      onChange={(e) =>
                        updateForm("truckOwnerName", e.target.value)
                      }
                      placeholder="Enter owner name"
                      disabled={!detailsFetched}
                    />
                  </div>
                </div>

                {/* Statement Duration */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">
                    Statement Duration
                  </Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Popover
                      open={startDateOpen}
                      onOpenChange={setStartDateOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={!detailsFetched}
                          className={cn(
                            "flex-1 w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate
                            ? format(formData.startDate, "dd/MM/yyyy")
                            : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(d) => {
                            updateForm("startDate", d);
                            setStartDateOpen(false);
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground font-medium hidden sm:block">
                      –
                    </span>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={!detailsFetched}
                          className={cn(
                            "flex-1 w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate
                            ? format(formData.endDate, "dd/MM/yyyy")
                            : "End"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(d) => {
                            updateForm("endDate", d);
                            setEndDateOpen(false);
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-sm text-primary/70">
                    Select the duration for which you want the statement
                  </p>
                </div>

                {/* Opening Balance */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">
                    Opening balance
                  </Label>
                  <Input
                    value={formData.openingBalance}
                    onChange={(e) =>
                      updateForm("openingBalance", e.target.value)
                    }
                    placeholder="XXXXX"
                    type="text"
                    disabled={!detailsFetched}
                  />
                  <p className="text-sm text-primary/70">
                    Enter your opening balance for the statement
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSubmit}>Submit</Button>
                </div>

                {/* History Table (pre-submit, loaded from DB) */}
                {history.length > 0 && (
                  <div className="space-y-2">
                    <Label className="font-semibold text-foreground">
                      History
                    </Label>
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Txn ID</TableHead>
                            <TableHead>Transaction Time</TableHead>
                            <TableHead>Nature</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="whitespace-nowrap text-xs font-mono">
                                {entry.txnId || "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {entry.transactionTime
                                  ? format(
                                      new Date(entry.transactionTime),
                                      "d MMM yy, hh:mm a",
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    "font-semibold",
                                    entry.nature === "Debit"
                                      ? "text-destructive"
                                      : "text-green-600",
                                  )}
                                >
                                  {entry.nature}
                                </span>
                              </TableCell>
                              <TableCell>
                                {Number(entry.amount).toLocaleString("en-IN")}
                              </TableCell>
                              <TableCell>{entry.description}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEdit(entry)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() =>
                                      handleDeleteHistory(entry.id)
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* ========== POST-SUBMIT LAYOUT ========== */
          <div className="space-y-6">
            {/* Entered Information Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Entered Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-primary/70">Customer Name</p>
                        <p className="font-semibold text-foreground">
                          {formData.customerName || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-primary/70">
                          Customer Mobile
                        </p>
                        <p className="font-semibold text-foreground">
                          {formData.customerMobile || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-primary/70">Truck Number</p>
                        <p className="font-semibold text-foreground">
                          {formData.truckNumber || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-primary/70">
                          Truck Owner Name
                        </p>
                        <p className="font-semibold text-foreground">
                          {formData.truckOwnerName || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-primary/70">
                          Statement Duration
                        </p>
                        <p className="font-semibold text-foreground">
                          {formData.startDate && formData.endDate
                            ? `${format(formData.startDate, "dd MMM yyyy")} - ${format(formData.endDate, "dd MMM yyyy")}`
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <IndianRupee className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-primary/70">
                          Opening Balance
                        </p>
                        <p className="font-semibold text-foreground">
                          ₹{" "}
                          {Number(formData.openingBalance).toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Route Breadcrumb */}
            {routeInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <Card className="border-primary/20">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {routeInfo.routeName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({routeInfo.distance} • {routeInfo.duration})
                        </span>
                        <span className="ml-auto text-sm font-semibold text-primary">
                          FASTag Total: ₹{routeInfo.fastagTotal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        {routeInfo.tollSegments.map((seg, idx) => (
                          <span key={idx} className="flex items-center gap-2">
                            {idx > 0 && (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="px-3 py-1 rounded-full border border-border bg-muted/50 text-foreground">
                              {seg.name} • ₹{seg.amount}
                            </span>
                          </span>
                        ))}
                        <span className="ml-2 font-semibold text-primary">
                          ⇒ ₹{routeInfo.fastagTotal}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Find Tolls */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Find tolls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">
                        Vehicle Type
                      </Label>
                      <Select
                        value={vehicleType}
                        onValueChange={setVehicleType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_TYPES.map((vt) => {
                            const IconComp = VEHICLE_TYPE_ICONS[vt.iconKey];
                            return (
                              <SelectItem key={vt.value} value={vt.value}>
                                <span className="flex items-center gap-2">
                                  <IconComp className="h-4 w-4 text-primary" />
                                  <span>{vt.description}</span>
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">
                        Source State
                      </Label>
                      <SearchableSelect
                        value={sourceState}
                        onValueChange={(v) => {
                          setSourceState(v);
                          setSourceCity("");
                        }}
                        placeholder="Select a state"
                        options={statesList.map((s) => ({
                          label: s.name,
                          value: s.iso_code,
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">
                        Source City
                      </Label>
                      <SearchableSelect
                        value={sourceCity}
                        onValueChange={setSourceCity}
                        placeholder="Enter source city"
                        disabled={!sourceState}
                        options={sourceCities.map((c) => ({
                          label: c,
                          value: c,
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">
                        Destination State
                      </Label>
                      <SearchableSelect
                        value={destState}
                        onValueChange={(v) => {
                          setDestState(v);
                          setDestCity("");
                        }}
                        placeholder="Select a state"
                        options={statesList.map((s) => ({
                          label: s.name,
                          value: s.iso_code,
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">
                        Destination City
                      </Label>
                      <SearchableSelect
                        value={destCity}
                        onValueChange={setDestCity}
                        placeholder="Enter destination city"
                        disabled={!destState}
                        options={destCities.map((c) => ({
                          label: c,
                          value: c,
                        }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleGetTollRoutes}
                      disabled={fetchingTolls}
                    >
                      {fetchingTolls ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />{" "}
                          Fetching...
                        </>
                      ) : (
                        "Get Toll Routes"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tolls Table - shown after Get Toll Routes */}
            {tollsLoaded && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={(checked) =>
                                  handleSelectAll(!!checked)
                                }
                                aria-label="Select all"
                              />
                            </TableHead>
                            <TableHead>Processing time</TableHead>
                            <TableHead>Transaction time</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Toll name</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tolls.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-muted-foreground text-center"
                              >
                                No tolls found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            tolls.map((toll) => (
                              <TableRow key={toll.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={toll.selected}
                                    onCheckedChange={(checked) => {
                                      setTolls((prev) =>
                                        prev.map((t) =>
                                          t.id === toll.id
                                            ? { ...t, selected: !!checked }
                                            : t,
                                        ),
                                      );
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="datetime-local"
                                    value={toll.processingTime}
                                    onChange={(e) =>
                                      setTolls((prev) =>
                                        prev.map((t) =>
                                          t.id === toll.id
                                            ? {
                                                ...t,
                                                processingTime: e.target.value,
                                              }
                                            : t,
                                        ),
                                      )
                                    }
                                    className="w-[200px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="datetime-local"
                                    value={toll.transactionTime}
                                    onChange={(e) =>
                                      setTolls((prev) =>
                                        prev.map((t) =>
                                          t.id === toll.id
                                            ? {
                                                ...t,
                                                transactionTime: e.target.value,
                                              }
                                            : t,
                                        ),
                                      )
                                    }
                                    className="w-[200px]"
                                  />
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium text-foreground">
                                    ₹ {toll.amount}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Textarea
                                    value={toll.tollName}
                                    onChange={(e) =>
                                      setTolls((prev) =>
                                        prev.map((t) =>
                                          t.id === toll.id
                                            ? { ...t, tollName: e.target.value }
                                            : t,
                                        ),
                                      )
                                    }
                                    className="min-h-[40px] resize-y"
                                    rows={1}
                                  />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button onClick={handleAddSelectedTolls}>
                        Add Selected Tolls to Statement
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Manual Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Add manual transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
                    <div className="space-y-1.5 w-full sm:w-auto sm:flex-1">
                      <Label>Processing Time</Label>
                      <Input
                        type="datetime-local"
                        value={manualTx.processingTime}
                        onChange={(e) =>
                          setManualTx((p) => ({
                            ...p,
                            processingTime: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 w-full sm:w-auto sm:flex-1">
                      <Label>Transaction Time</Label>
                      <Input
                        type="datetime-local"
                        value={manualTx.transactionTime}
                        onChange={(e) =>
                          setManualTx((p) => ({
                            ...p,
                            transactionTime: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 w-full sm:w-auto sm:w-[120px]">
                      <Label>Type</Label>
                      <Select
                        value={manualTx.type}
                        onValueChange={(v) =>
                          setManualTx((p) => ({ ...p, type: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Debit">Debit</SelectItem>
                          <SelectItem value="Credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 w-full sm:w-auto sm:w-[120px]">
                      <Label>Amount</Label>
                      <Input
                        value={manualTx.amount}
                        onChange={(e) =>
                          setManualTx((p) => ({ ...p, amount: e.target.value }))
                        }
                        placeholder="Amount"
                      />
                    </div>
                    <div className="space-y-1.5 w-full sm:w-auto sm:flex-1">
                      <Label>Description</Label>
                      <Input
                        value={manualTx.description}
                        onChange={(e) =>
                          setManualTx((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Description"
                      />
                    </div>
                    <Button onClick={addManualTransaction} className="shrink-0">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* History Table */}
            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Processing Time</TableHead>
                            <TableHead>Transaction Time</TableHead>
                            <TableHead>Nature</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Closing Balance</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Txn ID</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="whitespace-nowrap">
                                {entry.processingTime
                                  ? format(
                                      new Date(entry.processingTime),
                                      "dd MMM yy, hh:mm a",
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {entry.transactionTime
                                  ? format(
                                      new Date(entry.transactionTime),
                                      "dd MMM yy, hh:mm a",
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    "font-semibold",
                                    entry.nature === "Debit"
                                      ? "text-destructive"
                                      : "text-green-600",
                                  )}
                                >
                                  {entry.nature}
                                </span>
                              </TableCell>
                              <TableCell>{entry.amount}</TableCell>
                              <TableCell>{entry.closingBalance}</TableCell>
                              <TableCell>{entry.description}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {entry.txnId}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEdit(entry)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() =>
                                      handleDeleteHistory(entry.id)
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Generate PDF Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex justify-center">
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-12 py-6 text-base bg-muted-foreground hover:bg-muted-foreground/90 text-background rounded-xl gap-2"
                  onClick={handleGeneratePDFAndSave}
                  disabled={savingSession}
                >
                  {savingSession ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileDown className="w-5 h-5" />
                  )}
                  {savingSession
                    ? "Saving..."
                    : "Generate PDF and Save Changes"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
            <DialogDescription>
              Make changes to your transaction here. Click save when you're
              done.
            </DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Transaction ID</Label>
                <Input
                  value={editingEntry.txnId || "—"}
                  readOnly
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Transaction Time</Label>
                <Input
                  type="datetime-local"
                  value={(() => {
                    if (!editingEntry.transactionTime) return "";
                    const d = new Date(editingEntry.transactionTime);
                    if (isNaN(d.getTime())) return "";
                    // Format as local datetime: YYYY-MM-DDTHH:mm
                    const pad = (n: number) => n.toString().padStart(2, "0");
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  })()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setEditingEntry((prev) =>
                        prev ? { ...prev, transactionTime: "" } : prev,
                      );
                      return;
                    }
                    // Convert local datetime-local value to ISO string
                    const d = new Date(val);
                    setEditingEntry((prev) =>
                      prev
                        ? { ...prev, transactionTime: d.toISOString() }
                        : prev,
                    );
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Nature</Label>
                <div className="flex rounded-lg overflow-hidden border border-border">
                  <button
                    type="button"
                    className={cn(
                      "flex-1 py-2.5 text-sm font-semibold transition-colors",
                      editingEntry.nature === "Debit"
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-muted",
                    )}
                    onClick={() =>
                      setEditingEntry((prev) =>
                        prev ? { ...prev, nature: "Debit" } : prev,
                      )
                    }
                  >
                    Debit
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex-1 py-2.5 text-sm font-semibold transition-colors",
                      editingEntry.nature === "Credit"
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-muted",
                    )}
                    onClick={() =>
                      setEditingEntry((prev) =>
                        prev ? { ...prev, nature: "Credit" } : prev,
                      )
                    }
                  >
                    Credit
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  value={editingEntry.amount}
                  onChange={(e) =>
                    setEditingEntry((prev) =>
                      prev ? { ...prev, amount: e.target.value } : prev,
                    )
                  }
                  placeholder="Amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingEntry.description}
                  onChange={(e) =>
                    setEditingEntry((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev,
                    )
                  }
                  placeholder="Description"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
