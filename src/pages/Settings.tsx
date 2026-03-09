import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Building2,
  Plus,
  Trash2,
  ArrowLeft,
  Database,
  IndianRupee,
  Loader2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { banksApi, Bank } from "@/lib/banks-api";
import { autoAdjustAmountService } from "@/lib/auto-adjust-amount-service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingAutoAdjust, setIsLoadingAutoAdjust] = useState(false);
  const { toast } = useToast();
  const [newBankName, setNewBankName] = useState("");
  const [autoAdjustAmount, setAutoAdjustAmount] = useState("");
  const [autoAdjustError, setAutoAdjustError] = useState("");

  const handleAutoAdjustSave = async () => {
    // Validate amount using service
    const validation = autoAdjustAmountService.validateAmount(autoAdjustAmount);
    if (!validation.isValid) {
      setAutoAdjustError(validation.error || "Invalid amount");
      return;
    }

    setIsLoadingAutoAdjust(true);
    setAutoAdjustError("");

    try {
      const success = await autoAdjustAmountService.updateAmount(
        Number(autoAdjustAmount),
      );

      console.log("success", success);
      if (success) {
        toast({ title: "Auto Adjust Amount saved successfully" });
      } else {
        setAutoAdjustError("Failed to save amount. Please try again.");
        toast({
          title: "Failed to save",
          description: "Could not update auto adjust amount",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Save auto adjust amount error:", error);
      setAutoAdjustError("Failed to save amount. Please try again.");
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAutoAdjust(false);
    }
  };

  const loadAutoAdjustAmount = async () => {
    try {
      const data = await autoAdjustAmountService.getAmount();
      if (data) {
        setAutoAdjustAmount(data.amount.toString());
      }
    } catch (error) {
      console.error("Failed to load auto adjust amount:", error);
    }
  };
  const loadBanks = async () => {
    setIsLoading(true);
    try {
      const banksList = await banksApi.list();
      setBanks(banksList);
    } catch (error) {
      toast({
        title: "Failed to load banks",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBanks();
    loadAutoAdjustAmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addBank = async () => {
    if (!newBankName.trim()) {
      toast({ title: "Bank name is required", variant: "destructive" });
      return;
    }
    setIsAdding(true);
    try {
      await banksApi.create(newBankName.trim());
      toast({ title: "Bank added successfully" });
      setNewBankName("");
      await loadBanks();
    } catch (error) {
      toast({
        title: "Failed to add bank",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeBank = async (bankId: number) => {
    setIsLoading(true);
    try {
      await banksApi.delete(bankId);
      toast({ title: "Bank removed successfully" });
      await loadBanks();
    } catch (error) {
      console.error("Delete bank error:", error);
      toast({
        title: "Failed to remove bank",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBank = async (bankId: number, currentStatus: boolean) => {
    setIsLoading(true);
    try {
      await banksApi.update(bankId, !currentStatus);
      toast({ title: `Bank ${!currentStatus ? "enabled" : "disabled"}` });
      await loadBanks();
    } catch (error) {
      toast({
        title: "Failed to update bank",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage bank list</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit
          </Button>
        </motion.div>
        {/* Auto Adjust Amount */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="w-4 h-4" /> Auto Adjust Amount
            </CardTitle>
            <CardDescription>
              Set the auto adjust amount (must be greater than 2000)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min={2001}
                  value={autoAdjustAmount}
                  onChange={(e) => {
                    setAutoAdjustAmount(e.target.value);
                    setAutoAdjustError("");
                  }}
                  placeholder="e.g. 5000"
                />
                {autoAdjustError && (
                  <p className="text-sm text-destructive">{autoAdjustError}</p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleAutoAdjustSave}
                disabled={isLoadingAutoAdjust}
              >
                {isLoadingAutoAdjust ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {/* Add Bank */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Bank</CardTitle>
              <CardDescription>
                Add a new bank to the Fast Tag bank list
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <Label>Bank Name</Label>
                  <Input
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="e.g. IDFC First Bank | Blackbuck"
                    disabled={isAdding}
                    onKeyDown={(e) => e.key === "Enter" && addBank()}
                  />
                </div>
                <Button onClick={addBank} className="gap-2" disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Add
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bank List */}
          {isLoading && banks.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">
                  Loading banks...
                </p>
              </CardContent>
            </Card>
          ) : banks.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No banks found. Add one above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {banks.map((bank, index) => {
                if (!bank.bank_id) {
                  console.error("Bank missing bank_id:", bank);
                  return null; // Skip rendering banks without valid IDs
                }

                return (
                  <Card key={bank.bank_id || `bank-${index}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={bank.is_active}
                            onCheckedChange={() =>
                              toggleBank(bank.bank_id, bank.is_active)
                            }
                            disabled={isLoading}
                          />
                          <span
                            className={`font-medium ${bank.is_active ? "text-foreground" : "text-muted-foreground line-through"}`}
                          >
                            {bank.bank_name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBank(bank.bank_id)}
                          className="text-destructive hover:text-destructive"
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
