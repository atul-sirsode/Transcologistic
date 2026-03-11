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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Car,
  Building2,
  CalendarDays,
  User,
  Phone,
  CreditCard,
  Hash,
  Clock,
} from "lucide-react";

interface ExistingSessionDetails {
  id: string;
  vehicle_number: string;
  truck_number?: string;
  customer_name?: string;
  customer_mobile?: string;
  bank_name: string;
  formType: string;
  opening_balance: number;
  created_at?: string;
  updated_at?: string;
  start_date?: string;
  end_date?: string;
}

interface ExistingVehicleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ExistingSessionDetails | null;
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function DetailsContent({ details }: { details: ExistingSessionDetails }) {
  return (
    <div className="space-y-4">
      {/* Vehicle Info Section */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Vehicle Information
        </h3>
        <Separator className="mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <DetailItem
            icon={Car}
            label="Vehicle Number"
            value={details.vehicle_number}
          />
          <DetailItem
            icon={Car}
            label="Car Model"
            value={details.truck_number || "Not specified"}
          />
          <DetailItem
            icon={User}
            label="Owner Name"
            value={details.customer_name || "Not specified"}
          />
          <DetailItem
            icon={Phone}
            label="Mobile"
            value={details.customer_mobile || "Not specified"}
          />
        </div>
      </div>

      {/* Account Info Section */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Account Information
        </h3>
        <Separator className="mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <DetailItem icon={Building2} label="Bank" value={details.bank_name} />
          <DetailItem
            icon={CreditCard}
            label="Form Type"
            value={details.formType}
          />
          <DetailItem
            icon={CreditCard}
            label="Opening Balance"
            value={`₹${details.opening_balance}`}
          />
          <DetailItem icon={Hash} label="Session ID" value={details.id} />
        </div>
      </div>

      {/* Timeline Section */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Timeline
        </h3>
        <Separator className="mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <DetailItem
            icon={Clock}
            label="Created At"
            value={
              details.created_at
                ? new Date(details.created_at).toLocaleString()
                : "Not specified"
            }
          />
          <DetailItem
            icon={Clock}
            label="Updated At"
            value={
              details.updated_at
                ? new Date(details.updated_at).toLocaleString()
                : "Not specified"
            }
          />
          <DetailItem
            icon={CalendarDays}
            label="Start Date"
            value={
              details.start_date
                ? new Date(details.start_date).toLocaleDateString()
                : "Not specified"
            }
          />
          <DetailItem
            icon={CalendarDays}
            label="End Date"
            value={
              details.end_date
                ? new Date(details.end_date).toLocaleDateString()
                : "Not specified"
            }
          />
        </div>
      </div>

      {/* Note */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Transaction history for this vehicle can be viewed in the main toll
          details section. The existing opening balance of ₹
          {details.opening_balance} has been used for the current processing.
        </p>
      </div>
    </div>
  );
}

export function ExistingVehicleDetailsDialog({
  open,
  onOpenChange,
  details,
}: ExistingVehicleDetailsDialogProps) {
  const isMobile = useIsMobile();

  if (!details) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Existing Vehicle Details</DrawerTitle>
            <DrawerDescription className="text-xs">
              {details.vehicle_number}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-2 max-h-[65vh] overflow-y-auto">
            <div className="pr-3">
              <DetailsContent details={details} />
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
          <DialogTitle>Existing Vehicle Details</DialogTitle>
          <DialogDescription className="text-xs">
            {details.vehicle_number}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[60vh] py-2 overflow-y-auto">
          <div className="pr-3">
            <DetailsContent details={details} />
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
