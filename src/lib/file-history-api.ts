import { httpClient, fileHttpClient } from "./http-client";

const API_BASE_URL = import.meta.env.VITE_BASE_DOMAIN;

export interface FileHistoryEntry {
  id: number;
  same_file_name: string;
  file_type: string;
  record_count: number;
  size_bytes: number;
  content_sha256: string;
  created_at: string;
  file_blob?: Buffer;
}

export interface FileHistoryStats {
  totalFiles: number;
  totalSize: number;
  totalRecords: number;
}

class FileHistoryAPI {
  async getFileHistory(
    limit: number = 50,
    offset: number = 0,
  ): Promise<FileHistoryEntry[]> {
    try {
      const response = await httpClient.get<FileHistoryEntry[]>(
        "/api/file-history",
        { limit, offset },
      );
      return response;
    } catch (error) {
      console.error("Error fetching file history:", error);
      throw error;
    }
  }

  async saveFileToHistory(
    file: File,
    entry: Omit<
      FileHistoryEntry,
      "id" | "created_at" | "size_bytes" | "content_sha256"
    >,
    operationType?: "import" | "export",
  ): Promise<{ id: number; record_count: number; auto_calculated: boolean }> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Only send these if provided, server will auto-generate missing ones
      if (entry.same_file_name)
        formData.append("same_file_name", entry.same_file_name);
      if (entry.file_type) formData.append("file_type", entry.file_type);
      if (entry.record_count > 0)
        formData.append("record_count", entry.record_count.toString());
      if (operationType) formData.append("operation_type", operationType);

      const response = await fileHttpClient.postFormData<{
        id: number;
        record_count: number;
        auto_calculated: boolean;
      }>("/api/file-history", formData);

      return response;
    } catch (error) {
      console.error("Error saving file to history:", error);
      throw error;
    }
  }

  async getFileBlob(id: number): Promise<Blob> {
    try {
      const response = await httpClient.custom<Blob>(
        `/api/file-history/${id}`,
        {
          method: "GET",
          headers: { Accept: "application/octet-stream" },
        },
      );
      return response;
    } catch (error) {
      console.error("Error getting file blob:", error);
      throw error;
    }
  }

  async deleteFileFromHistory(id: number): Promise<void> {
    try {
      await httpClient.delete<void>(`/api/file-history/${id}`);
    } catch (error) {
      console.error("Error deleting file from history:", error);
      throw error;
    }
  }

  async searchFilesByName(fileName: string): Promise<FileHistoryEntry[]> {
    try {
      const response = await httpClient.get<FileHistoryEntry[]>(
        "/api/file-history/search",
        { q: fileName },
      );
      return response;
    } catch (error) {
      console.error("Error searching files:", error);
      throw error;
    }
  }

  async getFileHistoryStats(): Promise<FileHistoryStats> {
    try {
      const response = await httpClient.get<FileHistoryStats>(
        "/api/file-history/stats",
      );
      return response;
    } catch (error) {
      console.error("Error getting file history stats:", error);
      throw error;
    }
  }

  async downloadFileFromHistory(entry: FileHistoryEntry): Promise<void> {
    try {
      const blob = await this.getFileBlob(entry.id);

      // Create download in browser environment
      if (typeof window !== "undefined") {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = entry.same_file_name;
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      throw error;
    }
  }

  async downloadMultipleFiles(entries: FileHistoryEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.downloadFileFromHistory(entry);
      // Small delay between downloads to avoid browser blocking
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export const fileHistoryAPI = new FileHistoryAPI();

// Export individual functions for easier imports
export const getFileHistory =
  fileHistoryAPI.getFileHistory.bind(fileHistoryAPI);
export const saveFileToHistory =
  fileHistoryAPI.saveFileToHistory.bind(fileHistoryAPI);
export const getFileBlob = fileHistoryAPI.getFileBlob.bind(fileHistoryAPI);
export const deleteFileFromHistory =
  fileHistoryAPI.deleteFileFromHistory.bind(fileHistoryAPI);
export const searchFilesByName =
  fileHistoryAPI.searchFilesByName.bind(fileHistoryAPI);
export const getFileHistoryStats =
  fileHistoryAPI.getFileHistoryStats.bind(fileHistoryAPI);
export const downloadFileFromHistory =
  fileHistoryAPI.downloadFileFromHistory.bind(fileHistoryAPI);
export const downloadMultipleFiles =
  fileHistoryAPI.downloadMultipleFiles.bind(fileHistoryAPI);
export const formatFileSize =
  fileHistoryAPI.formatFileSize.bind(fileHistoryAPI);
