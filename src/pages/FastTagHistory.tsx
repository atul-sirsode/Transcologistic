import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, History, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { BankSelect } from "@/components/BankSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { fastTagService } from "@/services/fasttag-service";
import { format } from "date-fns";

interface HistoryRecord {
  id: string;
  sessionId: string;
  transactionTime: string;
  nature: "Debit" | "Credit";
  amount: string;
  closingBalance: string;
  description: string;
  txnId: string;
}

export default function FastTagHistory() {
  const navigate = useNavigate();
  const [selectedBank, setSelectedBank] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [searched, setSearched] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<HistoryRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Store sessionId from search result
  const [currentSessionId, setCurrentSessionId] = useState("");

  const handleSearch = async () => {
    if (!selectedBank) {
      toast({ title: "Please select a bank", variant: "destructive" });
      return;
    }
    if (!vehicleNumber.trim()) {
      toast({ title: "Please enter vehicle number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await fastTagService.getSessionWithHistory({
        vehicleNumber: vehicleNumber.trim(),
        bank: selectedBank,
      });

      if (!result || !result.history.length) {
        setHistory([]);
        setCurrentSessionId("");
        setSearched(true);
        toast({ title: "No transactions found", variant: "destructive" });
        setLoading(false);
        return;
      }

      setCurrentSessionId(result.session.id);

      const mapped: HistoryRecord[] = result.history.map((h) => ({
        id: h.id,
        sessionId: result.session.id,
        transactionTime: h.transaction_time
          ? format(new Date(h.transaction_time), "dd MMM yy, hh:mm a")
          : "-",
        nature: h.nature,
        amount: String(h.amount),
        closingBalance: String(h.closing_balance),
        description: h.description || "",
        txnId: h.txn_id || h.id,
      }));

      setHistory(mapped);
      setSearched(true);
      toast({ title: `Found ${mapped.length} transaction(s)` });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast({
        title: "Failed to fetch history",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fastTagService.deleteHistoryEntry(
        deleteTarget.sessionId,
        deleteTarget.id,
      );
      setHistory((prev) => prev.filter((h) => h.id !== deleteTarget.id));
      toast({ title: "Transaction deleted successfully" });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      toast({
        title: "Failed to delete",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!globalFilter) return history;
    const q = globalFilter.toLowerCase();
    return history.filter(
      (h) =>
        h.description.toLowerCase().includes(q) ||
        h.txnId.includes(q) ||
        h.amount.includes(q) ||
        h.nature.toLowerCase().includes(q),
    );
  }, [history, globalFilter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                View History
              </h1>
              <p className="text-sm text-muted-foreground">
                Search transaction history by bank and vehicle
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/fast-tag")}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </motion.div>

        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Select Bank</Label>
                <BankSelect
                  value={selectedBank}
                  onValueChange={setSelectedBank}
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  placeholder="Enter vehicle number"
                  value={vehicleNumber}
                  onChange={(e) =>
                    setVehicleNumber(e.target.value.toUpperCase())
                  }
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">
                  Transaction History
                  <Badge variant="secondary" className="ml-2">
                    {history.length} records
                  </Badge>
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter results..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No transactions to display.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-semibold whitespace-nowrap">
                              Transaction Time
                            </TableHead>
                            <TableHead className="text-xs font-semibold whitespace-nowrap">
                              Nature
                            </TableHead>
                            <TableHead className="text-xs font-semibold whitespace-nowrap">
                              Amount
                            </TableHead>
                            <TableHead className="text-xs font-semibold whitespace-nowrap">
                              Closing Balance
                            </TableHead>
                            <TableHead className="text-xs font-semibold whitespace-nowrap">
                              Description
                            </TableHead>
                            <TableHead className="text-xs font-semibold whitespace-nowrap">
                              Txn ID
                            </TableHead>
                            <TableHead className="text-xs font-semibold whitespace-nowrap">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredHistory.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="text-sm whitespace-nowrap">
                                {row.transactionTime}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    row.nature === "Debit"
                                      ? "text-destructive border-destructive/30"
                                      : "text-success border-success/30",
                                  )}
                                >
                                  {row.nature}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                ₹{row.amount}
                              </TableCell>
                              <TableCell className="text-sm">
                                ₹{row.closingBalance}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.description}
                              </TableCell>
                              <TableCell className="text-sm font-mono text-xs text-muted-foreground">
                                {row.txnId}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteTarget(row)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                This record action cannot be undone. Are you sure you want to
                delete this transaction?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
