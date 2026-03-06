import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  CheckSquare,
  Square,
  FileDown,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  FileHistoryEntry,
  getFileHistory,
  downloadFileFromHistory,
  downloadMultipleFiles,
  deleteFileFromHistory,
  formatFileSize,
} from "@/lib/file-history-api";
import { toast } from "sonner";

interface FileHistoryProps {
  refreshTrigger?: number;
}

export function FileHistory({ refreshTrigger }: FileHistoryProps) {
  const [entries, setEntries] = useState<FileHistoryEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getFileHistory();
      setEntries(data);
    } catch {
      console.error("Failed to load file history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshTrigger]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map((e) => e.id)));
    }
  };

  const handleDownloadSingle = async (entry: FileHistoryEntry) => {
    try {
      await downloadFileFromHistory(entry);
      toast.success(`Downloaded ${entry.same_file_name}`);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDownloadSelected = async () => {
    const selectedEntries = entries.filter((e) => selected.has(e.id));
    if (selectedEntries.length === 0) return;
    try {
      await downloadMultipleFiles(selectedEntries);
      toast.success(`Downloaded ${selectedEntries.length} file(s)`);
    } catch {
      toast.error("Some downloads failed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteFileFromHistory(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("File removed from history");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const getOperationType = (
    fileName: string,
    fileType: string,
  ): "import" | "export" => {
    const lowerFileName = fileName.toLowerCase();
    const lowerFileType = fileType.toLowerCase();

    // Export files are typically CSV and have export-related naming patterns
    if (
      lowerFileType.includes("csv") &&
      (lowerFileName.includes("export") ||
        lowerFileName.includes("download") ||
        lowerFileName.includes("output") ||
        lowerFileName.includes("verification") ||
        lowerFileName.includes("rc-verification") ||
        lowerFileName.includes("selected"))
    ) {
      return "export";
    }

    // Import files are typically Excel or user uploads
    if (
      lowerFileType.includes("excel") ||
      lowerFileType.includes("spreadsheet") ||
      lowerFileName.includes(".xlsx") ||
      lowerFileName.includes(".xls")
    ) {
      return "import";
    }

    // Default to import for user uploads
    return "import";
  };

  const getFileTypeIcon = (fileType: string, fileName: string) => {
    const lowerFileType = fileType.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    if (lowerFileType.includes("csv") || lowerFileName.includes(".csv")) {
      return <FileText className="w-4 h-4 text-green-600 shrink-0" />;
    } else if (
      lowerFileType.includes("excel") ||
      lowerFileType.includes("spreadsheet") ||
      lowerFileName.includes(".xlsx") ||
      lowerFileName.includes(".xls")
    ) {
      return <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />;
    } else {
      return <FileText className="w-4 h-4 text-gray-600 shrink-0" />;
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="p-6 bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Processed File History
            </h3>
            {entries.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {entries.length}
              </Badge>
            )}
          </div>
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadSelected}
              className="gap-2"
            >
              <FileDown className="w-4 h-4" />
              Download {selected.size} selected
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Loading history...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No file history yet. Upload or export files to see them here.
          </div>
        ) : (
          <div className="space-y-1">
            {/* Select all header */}
            <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground border-b border-border">
              <Checkbox
                checked={selected.size === entries.length && entries.length > 0}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
              <span className="flex-1">File Name</span>
              <span className="w-20 text-center">Type</span>
              <span className="w-16 text-right">Records</span>
              <span className="w-16 text-right">Size</span>
              <span className="w-36 text-right">Date</span>
              <span className="w-20 text-right">Actions</span>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <AnimatePresence>
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <Checkbox
                      checked={selected.has(entry.id)}
                      onCheckedChange={() => toggleSelect(entry.id)}
                      aria-label={`Select ${entry.same_file_name}`}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileTypeIcon(entry.file_type, entry.same_file_name)}
                      <span className="text-sm text-foreground truncate">
                        {entry.same_file_name}
                      </span>
                    </div>
                    <div className="w-20 text-center">
                      {getOperationType(
                        entry.same_file_name,
                        entry.file_type,
                      ) === "export" ? (
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs">
                          Export
                        </div>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Import
                        </Badge>
                      )}
                    </div>
                    <span className="w-16 text-right text-sm text-muted-foreground">
                      {entry.record_count}
                    </span>
                    <span className="w-16 text-right text-sm text-muted-foreground">
                      {formatFileSize(entry.size_bytes)}
                    </span>
                    <span className="w-36 text-right text-xs text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </span>
                    <div className="w-20 flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDownloadSingle(entry)}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
