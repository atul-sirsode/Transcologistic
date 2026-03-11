import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  MapPin,
  IndianRupee,
  Clock,
  Wallet,
  ArrowDown,
  Info,
} from "lucide-react";

interface TollHistoryItem {
  tollName: string;
  amount: number | string;
  nature: string;
  formattedtransactionDateTime?: string;
  closingBalance: number | string;
}

interface TollDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tollHistory: TollHistoryItem[];
  editingRow?: {
    data: {
      has_existing_record?: boolean;
      rc_number?: string;
      opening_amount?: string;
      formType?: string;
    };
  } | null;
  onViewExistingDetails?: () => void;
}

function TollContent({
  tollHistory,
  editingRow,
  onViewExistingDetails,
  onClose,
}: {
  tollHistory: TollHistoryItem[];
  editingRow: TollDetailsDialogProps["editingRow"];
  onViewExistingDetails?: () => void;
  onClose: () => void;
}) {
  const totalDebit = tollHistory
    .filter((t) => t.nature === "Debit")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalCredit = tollHistory
    .filter((t) => t.nature !== "Debit")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-4">
      {/* Existing Vehicle Banner */}
      {editingRow?.data?.has_existing_record && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Existing Vehicle Found
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              • {editingRow.data.rc_number} • ₹{editingRow.data.opening_amount}
            </span>
          </div>
          {onViewExistingDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewExistingDetails}
              className="text-xs h-7 w-fit"
            >
              View Details
            </Button>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            Toll Plazas
          </div>
          <p className="text-lg font-bold text-foreground">
            {tollHistory.length}
          </p>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <ArrowDown className="w-3.5 h-3.5" />
            Total Debit
          </div>
          <p className="text-lg font-bold text-destructive">
            ₹{totalDebit.toFixed(2)}
          </p>
        </div>
        {totalCredit > 0 && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Wallet className="w-3.5 h-3.5" />
              Total Credit
            </div>
            <p className="text-lg font-bold text-emerald-600">
              ₹{totalCredit.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Toll List */}
      {tollHistory.length > 0 ? (
        <div className="space-y-2">
          {tollHistory.map((toll, index) => (
            <div
              key={index}
              className="group rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {toll.tollName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {toll.formattedtransactionDateTime || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 pl-10 sm:pl-0">
                  <Badge
                    variant={
                      toll.nature === "Debit" ? "destructive" : "default"
                    }
                    className="text-xs shrink-0"
                  >
                    {toll.nature}
                  </Badge>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        toll.nature === "Debit"
                          ? "text-destructive"
                          : "text-emerald-600"
                      }`}
                    >
                      {toll.nature === "Debit" ? "-" : "+"}₹{toll.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bal: ₹{toll.closingBalance}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Info className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No toll data available</p>
        </div>
      )}
    </div>
  );
}

export function TollDetailsDialog({
  open,
  onOpenChange,
  tollHistory,
  editingRow,
  onViewExistingDetails,
}: TollDetailsDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Toll Details</DrawerTitle>
            <DrawerDescription className="text-xs">
              {tollHistory.length} toll plaza(s) on this route
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-2 max-h-[65vh] overflow-y-auto">
            <div className="pr-3">
              <TollContent
                tollHistory={tollHistory}
                editingRow={editingRow}
                onViewExistingDetails={onViewExistingDetails}
                onClose={() => onOpenChange(false)}
              />
            </div>
          </ScrollArea>
          <DrawerFooter className="pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Toll Details</DialogTitle>
          <DialogDescription className="text-xs">
            {tollHistory.length} toll plaza(s) on this route
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[60vh] py-2 overflow-y-auto">
          <div className="pr-3">
            <TollContent
              tollHistory={tollHistory}
              editingRow={editingRow}
              onViewExistingDetails={onViewExistingDetails}
              onClose={() => onOpenChange(false)}
            />
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
