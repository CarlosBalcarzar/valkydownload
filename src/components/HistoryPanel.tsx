"use client";

import { useEffect, useState } from "react";
import { qualityLabel } from "@/lib/presets";

type DownloadRecord = {
  id: number;
  url: string;
  platform: string;
  title: string | null;
  format: string;
  quality: string;
  status: string;
  fileSize: number | null;
  errorMsg: string | null;
  thumbnail: string | null;
  duration: string | null;
  createdAt: string;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    done: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
    processing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    pending: "bg-zinc-700 text-zinc-400 border-zinc-600",
  };
  const labels: Record<string, string> = {
    done: "✅ Completado",
    error: "❌ Error",
    processing: "⏳ Procesando",
    pending: "🕐 Pendiente",
  };
  const cls = map[status] ?? "bg-zinc-700 text-zinc-400";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}

function platformIcon(platform: string) {
  if (platform === "youtube") return "▶";
  if (platform === "tiktok") return "♪";
  return "🌐";
}

export default function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        setRecords(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-bold text-white">📋 Historial de descargas</h2>
        <button
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          Cerrar ✕
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent mr-3" />
            Cargando historial...
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <div className="text-4xl mb-3">📭</div>
            <p>No hay descargas registradas aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/8"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xl">
                  {platformIcon(r.platform)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {r.title ?? r.url}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {r.url}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    {statusBadge(r.status)}
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono uppercase text-zinc-400">
                      {r.format} · {qualityLabel(r.format, r.quality)}
                    </span>
                    {r.fileSize && (
                      <span>{formatBytes(r.fileSize)}</span>
                    )}
                    <span>
                      {new Date(r.createdAt).toLocaleString("es-MX", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  {r.errorMsg && (
                    <p className="mt-1 text-xs text-red-400 line-clamp-1">
                      {r.errorMsg}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
