import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { banksApi, type Bank } from "@/lib/banks-api";
import { SearchableSelect } from "@/components/SearchableSelect";

interface BankSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function BankSelect({
  value,
  onValueChange,
  placeholder = "Search & select bank",
  disabled,
}: BankSelectProps) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    banksApi
      .list()
      .then((list) => setBanks(list.filter((b) => b.is_active)))
      .catch(() => setBanks([]))
      .finally(() => setLoading(false));
  }, []);

  const options = useMemo(
    () =>
      banks.map((b) => ({
        value: b.code,
        label: `${b.bank_name} (${b.code})`,
      })),
    [banks],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border border-input rounded-md text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading banks...
      </div>
    );
  }

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

// Hook for pages that need the full bank list
export function useBanks() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    banksApi
      .list()
      .then(setBanks)
      .catch(() => setBanks([]))
      .finally(() => setLoading(false));
  }, []);

  return { banks, loading };
}
