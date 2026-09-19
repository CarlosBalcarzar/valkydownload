"use client";

import type { ReactNode } from "react";
import type { VideoInfo } from "@/app/page";
import {
  MP3_PRESETS,
  MP4_PRESETS,
  QUALITY_KEYS,
  effectiveResolution,
  type OutputFormat,
  type QualityKey,
} from "@/lib/presets";

interface Props {
  videoInfo: VideoInfo;
  platformIcon: (platform: string) => ReactNode;
  outputFormat: OutputFormat;
  setOutputFormat: (v: OutputFormat) => void;
  quality: QualityKey;
  setQuality: (v: QualityKey) => void;
  onDownload: () => void;
  downloading: boolean;
  downloadProgress: string | null;
}

const selectedCls = "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/40";
const idleCls = "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white";

export default function VideoInfoCard({
  videoInfo,
  platformIcon,
  outputFormat,
  setOutputFormat,
  quality,
  setQuality,
  onDownload,
  downloading,
  downloadProgress,
}: Props) {
  const isMp3 = outputFormat === "mp3";

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Miniatura + datos */}
      <div className="flex flex-col md:flex-row gap-0">
        {videoInfo.thumbnail && (
          <div className="relative md:w-72 h-48 md:h-auto shrink-0 overflow-hidden bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {videoInfo.duration && (
              <span className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-xs font-mono text-white">
                {videoInfo.duration}
              </span>
            )}
          </div>
        )}
        <div className="p-6 flex flex-col justify-center gap-3 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {platformIcon(videoInfo.platform)}
            {videoInfo.uploader && <span className="text-sm text-zinc-400">@{videoInfo.uploader}</span>}
          </div>
          <h2 className="text-xl font-bold text-white leading-snug line-clamp-3">{videoInfo.title}</h2>
        </div>
      </div>

      <div className="p-6 border-t border-white/10">
        {/* Formato */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Formato
          </label>
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            {(["mp4", "mp3"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setOutputFormat(fmt)}
                className={`flex flex-col items-start rounded-xl border px-5 py-3 text-left transition ${
                  outputFormat === fmt ? selectedCls : idleCls
                }`}
              >
                <span className="text-base font-bold">{fmt === "mp4" ? "🎥 MP4" : "🎵 MP3"}</span>
                <span className="text-xs opacity-70">{fmt === "mp4" ? "Video con audio" : "Solo audio"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Calidad: siempre 3 opciones */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Calidad
          </label>
          <div className="grid grid-cols-3 gap-2">
            {QUALITY_KEYS.map((q) => {
              let main: string;
              let hint: string;
              let label: string;

              if (isMp3) {
                const p = MP3_PRESETS[q];
                main = `${p.kbps} kbps`;
                label = p.label;
                hint = p.hint;
              } else {
                const p = MP4_PRESETS[q];
                const real = effectiveResolution(p.res, videoInfo.resolutions);
                main = `${real ?? p.res}p`;
                label = p.label;
                hint = real !== null && real !== p.res ? `Más cercana disponible` : p.hint;
              }

              return (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition ${
                    quality === q ? selectedCls : idleCls
                  }`}
                >
                  <span className="text-xs uppercase tracking-wide opacity-70">{label}</span>
                  <span className="text-lg font-bold">{main}</span>
                  <span className="text-xs opacity-70">{hint}</span>
                </button>
              );
            })}
          </div>
          {isMp3 && (
            <p className="mt-2 text-xs text-zinc-500">
              El audio de YouTube y TikTok suele venir a ~128–160 kbps; subir el bitrate no mejora el
              sonido original, solo aumenta el tamaño del archivo.
            </p>
          )}
        </div>

        {downloadProgress && (
          <div className="mb-4 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-300 flex items-center gap-3">
            {downloading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent shrink-0" />
            )}
            {downloadProgress}
          </div>
        )}

        <button
          onClick={onDownload}
          disabled={downloading}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 py-4 text-base font-bold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {downloading ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Procesando...
            </>
          ) : (
            <>⬇ Descargar {outputFormat.toUpperCase()}</>
          )}
        </button>
      </div>
    </div>
  );
}
