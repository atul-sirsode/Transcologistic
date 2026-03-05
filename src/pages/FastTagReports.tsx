import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileBarChart,
  Loader2,
  FileDown,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { BankSelect } from "@/components/BankSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { fastTagReportService } from "@/services/fasttag-report-service";
import { generateReportPDF } from "@/lib/fasttag-report-pdf";
import type { FastTagReportRow } from "@/models/fasttag-report";

export default function FastTagReports() {
  const [selectedBank, setSelectedBank] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FastTagReportRow[]>([]);
  const [searched, setSearched] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const selectedBankName = selectedBank;

  const fetchReport = async (page: number, limit: number) => {
    if (!selectedBank) {
      toast({ title: "Please select a bank", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Please select date range", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({
        title: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await fastTagReportService.getReport(
        {
          bankId: selectedBank,
          bankName: selectedBankName,
          startDate,
          endDate,
        },
        page,
        limit,
      );
      setRows(result.rows);
      setCurrentPage(result.currentPage);
      setTotalPages(result.totalPages);
      setTotalRecords(result.totalRecords);
      setSearched(true);
      toast({
        title: `Found ${result.totalRecords} record(s) — Page ${result.currentPage} of ${result.totalPages}`,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      toast({
        title: "Failed to fetch report",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchReport(1, pageSize);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchReport(newPage, pageSize);
  };

  const handlePageSizeChange = (val: string) => {
    const newSize = parseInt(val, 10);
    setPageSize(newSize);
    setCurrentPage(1);
    fetchReport(1, newSize);
  };

  const handleExportPDF = () => {
    if (rows.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    generateReportPDF(
      {
        bankId: selectedBank,
        bankName: selectedBankName,
        startDate: startDate!,
        endDate: endDate!,
      },
      rows,
    );
  };

  const totalTransactions = rows.reduce(
    (sum, r) => sum + r.transactions.length,
    0,
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileBarChart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              FastTag Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Filter saved transactions by bank & date range
            </p>
          </div>
        </motion.div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Select Bank</Label>
                <BankSelect
                  value={selectedBank}
                  onValueChange={setSelectedBank}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, "dd MMM yyyy")
                        : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => {
                        setStartDate(d);
                        setStartOpen(false);
                        if (d && endDate && endDate < d) setEndDate(undefined);
                      }}
                      disabled={(date) => date > new Date()}
                      className="p-3 pointer-events-auto"
                      captionLayout="dropdown-buttons"
                      fromYear={2006}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd MMM yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => {
                        setEndDate(d);
                        setEndOpen(false);
                      }}
                      disabled={(date) =>
                        date > new Date() ||
                        (startDate ? date < startDate : false)
                      }
                      className="p-3 pointer-events-auto"
                      captionLayout="dropdown-buttons"
                      fromYear={2006}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileBarChart className="w-4 h-4" />
                )}
                Get Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  Report Results
                  <Badge variant="secondary">{totalRecords} records</Badge>
                  <Badge variant="outline">{totalTransactions} txns</Badge>
                </CardTitle>
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={rows.length === 0}
                >
                  <FileDown className="w-4 h-4" /> Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No sessions found for the selected filters.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {rows.map((row, idx) => (
                      <div
                        key={row.session.id}
                        className="rounded-lg border border-border overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/50 px-4 py-3 gap-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">
                              #{(currentPage - 1) * pageSize + idx + 1}
                            </Badge>
                            <span className="font-semibold text-sm">
                              {row.session.vehicle_number}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {row.session.customer_name || "—"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Opening: ₹{row.session.opening_balance} | Created:{" "}
                            {format(
                              new Date(row.session.created_at),
                              "dd MMM yyyy",
                            )}
                          </div>
                        </div>
                        {row.transactions.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4 text-sm">
                            No transactions
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                                    Processing Time
                                  </TableHead>
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
                                    Closing Bal
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                                    Description
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold whitespace-nowrap">
                                    Txn ID
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {row.transactions.map((txn, txnIdx) => (
                                  <TableRow
                                    key={`${row.session.id}-${txn.id}-${txnIdx}`}
                                  >
                                    <TableCell className="text-sm whitespace-nowrap">
                                      {txn.processing_time
                                        ? format(
                                            new Date(txn.processing_time),
                                            "dd MMM yy, hh:mm a",
                                          )
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-nowrap">
                                      {txn.transaction_time
                                        ? format(
                                            new Date(txn.transaction_time),
                                            "dd MMM yy, hh:mm a",
                                          )
                                        : "—"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          txn.nature === "Debit"
                                            ? "text-destructive border-destructive/30"
                                            : "text-green-600 border-green-300",
                                        )}
                                      >
                                        {txn.nature}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium">
                                      ₹{txn.amount}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      ₹{txn.closing_balance}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {txn.description || "—"}
                                    </TableCell>
                                    <TableCell className="text-sm font-mono text-xs text-muted-foreground">
                                      {txn.txn_id || "—"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rows per page:</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={handlePageSizeChange}
                        >
                          <SelectTrigger className="w-[70px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="ml-2">
                          Page {currentPage} of {totalPages} ({totalRecords}{" "}
                          total)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1 || loading}
                          className="gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" /> Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages || loading}
                          className="gap-1"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
