import fs from "node:fs/promises";
import path from "node:path";

export type HistoryRecord = {
  id: number;
  url: string;
  platform: string;
  title: string | null;
  format: string;
  quality: string;
  status: "processing" | "done" | "error";
  fileSize: number | null;
  errorMsg: string | null;
  thumbnail: string | null;
  duration: string | null;
  createdAt: string;
};

const MAX_RECORDS = 100;
const dataDir = () => path.join(process.cwd(), "data");
const dataFile = () => path.join(dataDir(), "history.json");

// Cola simple para que dos escrituras simultáneas no se pisen.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

async function readAll(): Promise<HistoryRecord[]> {
  try {
    const raw = await fs.readFile(dataFile(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(records: HistoryRecord[]) {
  await fs.mkdir(dataDir(), { recursive: true });
  const tmp = `${dataFile()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(records, null, 2), "utf8");
  await fs.rename(tmp, dataFile());
}

export function listHistory(limit = 50): Promise<HistoryRecord[]> {
  return locked(async () => (await readAll()).slice(0, limit));
}

export function addRecord(
  data: Omit<HistoryRecord, "id" | "createdAt" | "fileSize" | "errorMsg">
): Promise<HistoryRecord | null> {
  return locked(async () => {
    try {
      const all = await readAll();
      const id = all.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      const record: HistoryRecord = {
        ...data,
        id,
        fileSize: null,
        errorMsg: null,
        createdAt: new Date().toISOString(),
      };
      await writeAll([record, ...all].slice(0, MAX_RECORDS));
      return record;
    } catch {
      return null; // el historial nunca debe romper una descarga
    }
  });
}

export function updateRecord(id: number, patch: Partial<HistoryRecord>): Promise<void> {
  return locked(async () => {
    try {
      const all = await readAll();
      const idx = all.findIndex((r) => r.id === id);
      if (idx === -1) return;
      all[idx] = { ...all[idx], ...patch };
      await writeAll(all);
    } catch {
      /* ignorar */
    }
  });
}
