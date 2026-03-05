export interface FileHistoryEntry {
  id: string;
  fileName: string;
  fileType: 'upload' | 'export';
  fileSize: number;
  recordCount: number;
  createdAt: string;
  mimeType: string;
}

const DB_NAME = 'rc-file-history';
const DB_VERSION = 1;
const META_STORE = 'metadata';
const BLOB_STORE = 'blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFileToHistory(
  file: File | Blob,
  entry: Omit<FileHistoryEntry, 'id' | 'createdAt' | 'fileSize'>
): Promise<string> {
  const db = await openDB();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const meta: FileHistoryEntry = {
    ...entry,
    id,
    fileSize: file.size,
    createdAt: new Date().toISOString(),
  };

  const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
  tx.objectStore(META_STORE).put(meta);
  tx.objectStore(BLOB_STORE).put({ id, blob: file });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFileHistory(): Promise<FileHistoryEntry[]> {
  const db = await openDB();
  const tx = db.transaction(META_STORE, 'readonly');
  const store = tx.objectStore(META_STORE);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const entries = (request.result as FileHistoryEntry[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      resolve(entries);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getFileBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  const tx = db.transaction(BLOB_STORE, 'readonly');
  const request = tx.objectStore(BLOB_STORE).get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result?.blob ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function downloadFileFromHistory(entry: FileHistoryEntry): Promise<void> {
  const blob = await getFileBlob(entry.id);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = entry.fileName;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadMultipleFiles(entries: FileHistoryEntry[]): Promise<void> {
  for (const entry of entries) {
    await downloadFileFromHistory(entry);
    // Small delay between downloads to avoid browser blocking
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

export async function deleteFileFromHistory(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
  tx.objectStore(META_STORE).delete(id);
  tx.objectStore(BLOB_STORE).delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
