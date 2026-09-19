"use client";

import { useCallback, useEffect, useState } from "react";
import HistoryPanel from "@/components/HistoryPanel";
import VideoInfoCard from "@/components/VideoInfoCard";
import type { OutputFormat, QualityKey } from "@/lib/presets";

export type VideoInfo = {
  title: string;
  thumbnail: string | null;
  duration: string | null;
  uploader: string | null;
  platform: "youtube" | "tiktok" | "other";
  resolutions: number[];
};

type Health = {
  ok: boolean;
  ytdlp: { found: boolean; version: string | null };
  ffmpeg: { found: boolean };
};

function filenameFromHeader(header: string, fallback: string): string {
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* continuar */
    }
  }
  const plain = header.match(/filename="([^"]+)"/i);
  return plain ? plain[1] : fallback;
}

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp4");
  const [quality, setQuality] = useState<QualityKey>("medium");
  const [showHistory, setShowHistory] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  const handleFetchInfo = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al obtener información");
      setVideoInfo(data);
      setQuality("medium");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleDownload = useCallback(async () => {
    if (!videoInfo) return;
    setDownloading(true);
    setError(null);
    setDownloadProgress(
      outputFormat === "mp3"
        ? "Extrayendo audio y convirtiendo a MP3... (puede tardar un poco)"
        : "Descargando y procesando el video... (puede tardar un poco)"
    );

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          format: outputFormat,
          quality,
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
          duration: videoInfo.duration,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al descargar");
      }

      const blob = await res.blob();
      const filename = filenameFromHeader(
        res.headers.get("Content-Disposition") ?? "",
        `video.${outputFormat}`
      );

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

      setDownloadProgress("✅ ¡Descarga completada!");
      setHistoryKey((k) => k + 1);
      setTimeout(() => setDownloadProgress(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setDownloadProgress(null);
    } finally {
      setDownloading(false);
    }
  }, [videoInfo, url, outputFormat, quality]);

  const platformIcon = (platform: string) => {
    if (platform === "youtube")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
          ▶ YouTube
        </span>
      );
    if (platform === "tiktok")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-black border border-zinc-600 px-2 py-0.5 text-xs font-semibold text-white">
          ♪ TikTok
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-2 py-0.5 text-xs font-semibold text-zinc-200">
        🌐 Otro
      </span>
    );
  };

  const setupProblems: string[] = [];
  if (health && !health.ytdlp.found)
    setupProblems.push("Falta yt-dlp. Ejecuta en la terminal: npm run setup:ytdlp");
  if (health && !health.ffmpeg.found)
    setupProblems.push("Falta ffmpeg (necesario para MP3 y para unir video+audio). Ejecuta: npm install");

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950/40">
      <header className="border-b border-white/10 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-lg shadow-lg">
              ⬇
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Vid<span className="text-violet-400">Snap</span>
            </span>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            📋 Historial
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Descarga videos de{" "}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              YouTube & TikTok
            </span>
          </h1>
          <p className="mt-4 text-lg text-zinc-400">
            Pega el enlace, elige MP4 o MP3 y una de las 3 calidades.
          </p>
        </div>

        {setupProblems.length > 0 && (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
            <strong>⚠ Configuración incompleta:</strong>
            <ul className="mt-1 list-disc pl-5">
              {setupProblems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetchInfo()}
            placeholder="https://www.youtube.com/watch?v=... o https://www.tiktok.com/@..."
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-white placeholder-zinc-500 outline-none ring-violet-500 transition focus:border-violet-500 focus:ring-2 backdrop-blur-sm"
          />
          <button
            onClick={handleFetchInfo}
            disabled={loading || !url.trim()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analizando...
              </>
            ) : (
              <>🔍 Analizar</>
            )}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-zinc-500">
          {["youtube.com", "youtu.be", "tiktok.com", "vimeo.com", "twitter.com"].map((site) => (
            <span key={site} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {site}
            </span>
          ))}
        </div>

        {error && (
          <div className="mt-6 whitespace-pre-line rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            <strong>⚠ Error:</strong> {error}
          </div>
        )}

        {videoInfo && (
          <VideoInfoCard
            videoInfo={videoInfo}
            platformIcon={platformIcon}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            quality={quality}
            setQuality={setQuality}
            onDownload={handleDownload}
            downloading={downloading}
            downloadProgress={downloadProgress}
          />
        )}

        {showHistory && <HistoryPanel key={historyKey} onClose={() => setShowHistory(false)} />}
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-zinc-600">
        VidSnap — Powered by yt-dlp &amp; Next.js
      </footer>
    </div>
  );
}
