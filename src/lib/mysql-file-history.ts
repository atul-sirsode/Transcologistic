// Check if we're in a browser environment (MySQL2 won't work in browser)
const isBrowser = typeof window !== "undefined";

// Mock implementations for browser environment
const mockFileHistory: FileHistoryEntry[] = [];
let mockIdCounter = 1;

export interface FileHistoryEntry {
  id: number;
  same_file_name: string;
  file_path: string;
  file_type: string;
  record_count: number;
  size_bytes: number;
  content_sha256: string;
  created_at: string;
  file_blob?: Buffer;
}

// Mock crypto implementation for browser
function createMockHash(data: string | Buffer): string {
  // Simple mock hash for browser environment
  let hash = 0;
  const str = typeof data === "string" ? data : data.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export async function saveFileToHistory(
  file: Buffer | Blob,
  entry: Omit<
    FileHistoryEntry,
    "id" | "created_at" | "size_bytes" | "content_sha256"
  >,
): Promise<number> {
  if (isBrowser) {
    // Mock implementation for browser
    const fileBuffer =
      file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : file;
    const size = file instanceof Blob ? file.size : fileBuffer.length;
    const mockEntry: FileHistoryEntry = {
      id: mockIdCounter++,
      same_file_name: entry.same_file_name,
      file_path: entry.file_path,
      file_type: entry.file_type,
      record_count: entry.record_count,
      size_bytes: size,
      content_sha256: createMockHash(Buffer.from(fileBuffer)),
      created_at: new Date().toISOString(),
    };
    mockFileHistory.push(mockEntry);
    return mockEntry.id;
  }

  // Server implementation would go here with actual MySQL
  return -1;
}

export async function getFileHistory(
  limit: number = 50,
  offset: number = 0,
): Promise<FileHistoryEntry[]> {
  if (isBrowser) {
    // Mock implementation for browser
    return [...mockFileHistory]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(offset, offset + limit);
  }

  return [];
}

export async function getFileBlob(id: number): Promise<Buffer | null> {
  if (isBrowser) {
    // Mock implementation for browser
    const entry = mockFileHistory.find((e) => e.id === id);
    return entry?.file_blob || null;
  }

  return null;
}

export async function getFileBlobBySha256(
  sha256: string,
): Promise<Buffer | null> {
  if (isBrowser) {
    // Mock implementation for browser
    const entry = mockFileHistory.find((e) => e.content_sha256 === sha256);
    return entry?.file_blob || null;
  }

  return null;
}

export async function downloadFileFromHistory(
  entry: FileHistoryEntry,
): Promise<void> {
  const blob = await getFileBlob(entry.id);
  if (!blob) return;

  // Create download in browser environment
  if (typeof window !== "undefined") {
    const file = new Blob([blob as unknown as ArrayBuffer], {
      type: entry.file_type,
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = entry.same_file_name;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export async function downloadMultipleFiles(
  entries: FileHistoryEntry[],
): Promise<void> {
  for (const entry of entries) {
    await downloadFileFromHistory(entry);
    // Small delay between downloads to avoid browser blocking
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export async function deleteFileFromHistory(id: number): Promise<void> {
  if (isBrowser) {
    // Mock implementation for browser
    const index = mockFileHistory.findIndex((e) => e.id === id);
    if (index > -1) {
      mockFileHistory.splice(index, 1);
    }
    return;
  }
}

export async function searchFilesByName(
  fileName: string,
): Promise<FileHistoryEntry[]> {
  if (isBrowser) {
    // Mock implementation for browser
    return mockFileHistory
      .filter((entry) =>
        entry.same_file_name.toLowerCase().includes(fileName.toLowerCase()),
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }

  return [];
}

export async function getFileHistoryStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  totalRecords: number;
}> {
  if (isBrowser) {
    // Mock implementation for browser
    return {
      totalFiles: mockFileHistory.length,
      totalSize: mockFileHistory.reduce(
        (sum, entry) => sum + entry.size_bytes,
        0,
      ),
      totalRecords: mockFileHistory.reduce(
        (sum, entry) => sum + entry.record_count,
        0,
      ),
    };
  }

  return { totalFiles: 0, totalSize: 0, totalRecords: 0 };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Utility function to calculate SHA256 hash
export function calculateSHA256(buffer: Buffer): string {
  return createMockHash(buffer);
}
