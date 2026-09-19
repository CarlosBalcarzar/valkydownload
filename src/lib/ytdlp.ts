import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  MP3_PRESETS,
  MP4_PRESETS,
  type OutputFormat,
  type QualityKey,
} from "./presets";

const isWin = process.platform === "win32";

// ---------------------------------------------------------------------------
// Localización de binarios
// ---------------------------------------------------------------------------

export function ytdlpPath(): string | null {
  if (process.env.YTDLP_PATH) {
    return fs.existsSync(process.env.YTDLP_PATH) ? process.env.YTDLP_PATH : null;
  }
  const local = path.join(process.cwd(), "bin", isWin ? "yt-dlp.exe" : "yt-dlp");
  return fs.existsSync(local) ? local : null;
}

/** Devuelve la ruta de ffmpeg, o null si hay que confiar en el PATH del sistema. */
function ffmpegExplicitPath(): string | null {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const bundled = path.join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    isWin ? "ffmpeg.exe" : "ffmpeg"
  );
  return fs.existsSync(bundled) ? bundled : null;
}

export function ffmpegStatus(): { found: boolean; source: "env" | "ffmpeg-static" | "system" | null } {
  const explicit = ffmpegExplicitPath();
  if (explicit) {
    return {
      found: true,
      source: process.env.FFMPEG_PATH === explicit ? "env" : "ffmpeg-static",
    };
  }
  const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return probe.status === 0 ? { found: true, source: "system" } : { found: false, source: null };
}

export function ytdlpVersion(): string | null {
  const bin = ytdlpPath();
  if (!bin) return null;
  const res = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 15_000 });
  return res.status === 0 ? res.stdout.trim() : null;
}

// ---------------------------------------------------------------------------
// Ejecución de yt-dlp
// ---------------------------------------------------------------------------

function baseArgs(): string[] {
  const args = [
    "--no-playlist",
    "--no-warnings",
    "--socket-timeout", "30",
    "--retries", "3",
    // YouTube necesita un runtime de JavaScript externo; usamos el mismo Node que ejecuta la app.
    "--js-runtimes", `node:${process.execPath}`,
  ];

  const ffmpeg = ffmpegExplicitPath();
  if (ffmpeg) args.push("--ffmpeg-location", ffmpeg);

  if (process.env.YTDLP_COOKIES_FROM_BROWSER) {
    args.push("--cookies-from-browser", process.env.YTDLP_COOKIES_FROM_BROWSER);
  } else if (process.env.YTDLP_COOKIES_FILE) {
    args.push("--cookies", process.env.YTDLP_COOKIES_FILE);
  }
  return args;
}

/** Convierte la salida de error de yt-dlp en un mensaje entendible. */
function friendlyError(stderr: string, fallback: string): string {
  const lines = stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("ERROR:"));
  const raw = (lines[lines.length - 1] ?? stderr.trim()) || fallback;
  const msg = raw.replace(/^ERROR:\s*/, "").replace(/\x1b\[[0-9;]*m/g, "");

  if (/sign in to confirm|not a bot|cookies/i.test(msg)) {
    return `${msg}\n\nYouTube pide verificación. Solución: define YTDLP_COOKIES_FROM_BROWSER=chrome en tu archivo .env.local (con la sesión de YouTube iniciada en ese navegador) y reinicia la app.`;
  }
  if (/ffmpeg|ffprobe/i.test(msg) && /not found|no such file|not installed/i.test(msg)) {
    return "No se encontró ffmpeg. Ejecuta `npm install` de nuevo o instala ffmpeg en tu sistema.";
  }
  if (/^postprocessing/i.test(msg)) {
    return "ffmpeg falló al procesar el archivo. Si tienes ffmpeg instalado en tu sistema, prueba a usarlo definiendo FFMPEG_PATH en .env.local (por ejemplo FFMPEG_PATH=/usr/bin/ffmpeg).";
  }
  return msg;
}

type RunResult = { stdout: string; stderr: string };

function run(args: string[], opts: { signal?: AbortSignal; timeoutMs: number }): Promise<RunResult> {
  const bin = ytdlpPath();
  if (!bin) {
    return Promise.reject(
      new Error("yt-dlp no está instalado. Ejecuta en la terminal: npm run setup:ytdlp")
    );
  }

  const signals = [AbortSignal.timeout(opts.timeoutMs)];
  if (opts.signal) signals.push(opts.signal);
  const signal = AbortSignal.any(signals);

  return new Promise<RunResult>((resolve, reject) => {
    const child = spawn(bin, [...baseArgs(), ...args], {
      signal,
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));

    child.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).name === "AbortError") {
        reject(new Error("La operación tardó demasiado o fue cancelada."));
      } else {
        reject(new Error(`No se pudo ejecutar yt-dlp: ${err.message}`));
      }
    });
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(friendlyError(stderr, `yt-dlp terminó con código ${code}`)));
    });
  });
}

// ---------------------------------------------------------------------------
// Información del video
// ---------------------------------------------------------------------------

export type Platform = "youtube" | "tiktok" | "other";

export function detectPlatform(url: string): Platform {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  return "other";
}

export type VideoInfo = {
  title: string;
  thumbnail: string | null;
  duration: string | null;
  uploader: string | null;
  platform: Platform;
  /** Resoluciones de video disponibles (lado corto, p. ej. 360, 720, 1080), de menor a mayor. */
  resolutions: number[];
};

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type RawFormat = { vcodec?: string | null; width?: number | null; height?: number | null };
type RawInfo = {
  _type?: string;
  entries?: RawInfo[];
  title?: string;
  thumbnail?: string;
  duration?: number;
  duration_string?: string;
  uploader?: string;
  channel?: string;
  height?: number;
  width?: number;
  formats?: RawFormat[];
};

export async function fetchInfo(url: string, signal?: AbortSignal): Promise<VideoInfo> {
  const { stdout } = await run(["-J", "--skip-download", "--", url], { signal, timeoutMs: 60_000 });

  let data = JSON.parse(stdout) as RawInfo;
  if (data._type === "playlist" && data.entries?.length) data = data.entries[0];

  const formats = Array.isArray(data.formats) ? data.formats : [];
  const set = new Set<number>();
  for (const f of formats) {
    if (!f.vcodec || f.vcodec === "none") continue;
    const res = f.width && f.height ? Math.min(f.width, f.height) : f.height;
    if (res && res >= 100) set.add(res);
  }
  if (set.size === 0 && data.height) {
    set.add(data.width ? Math.min(data.width, data.height) : data.height);
  }

  return {
    title: data.title ?? "Sin título",
    thumbnail: data.thumbnail ?? null,
    duration:
      typeof data.duration === "number" ? formatDuration(data.duration) : data.duration_string ?? null,
    uploader: data.uploader ?? data.channel ?? null,
    platform: detectPlatform(url),
    resolutions: [...set].sort((a, b) => a - b),
  };
}

// ---------------------------------------------------------------------------
// Descarga
// ---------------------------------------------------------------------------

export type DownloadResult = {
  dir: string;
  file: string;
  size: number;
  ext: "mp3" | "mp4";
  cleanup: () => Promise<void>;
};

export function buildDownloadArgs(format: OutputFormat, quality: QualityKey, output: string): string[] {
  if (format === "mp3") {
    return [
      "-f", "ba/b",
      "-x",
      "--audio-format", "mp3",
      "--audio-quality", `${MP3_PRESETS[quality].kbps}K`,
      "--embed-metadata",
      "-o", output,
    ];
  }

  const res = MP4_PRESETS[quality].res;
  return [
    "-f", "bv*+ba/b",
    // Prefiere la mayor resolución <= res (o la menor por encima si no hay ninguna), y códecs compatibles (H.264 + AAC).
    "-S", `res:${res},vcodec:h264,acodec:m4a`,
    "--merge-output-format", "mp4",
    "--remux-video", "mp4",
    "-o", output,
  ];
}

export async function downloadMedia(opts: {
  url: string;
  format: OutputFormat;
  quality: QualityKey;
  signal?: AbortSignal;
}): Promise<DownloadResult> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "vidsnap-"));
  const cleanup = () => fsp.rm(dir, { recursive: true, force: true }).catch(() => {});

  try {
    const output = path.join(dir, "media.%(ext)s");
    const args = [...buildDownloadArgs(opts.format, opts.quality, output), "--", opts.url];
    await run(args, { signal: opts.signal, timeoutMs: 15 * 60_000 });

    const files = await fsp.readdir(dir);
    const ext = opts.format;
    const file = files.find((f) => f.toLowerCase().endsWith(`.${ext}`));
    if (!file) {
      throw new Error(
        `No se generó el archivo .${ext}. ${
          ffmpegStatus().found ? "" : "Falta ffmpeg (ejecuta npm install o instálalo en tu sistema)."
        }`.trim()
      );
    }

    const filePath = path.join(dir, file);
    const { size } = await fsp.stat(filePath);
    return { dir, file: filePath, size, ext, cleanup };
  } catch (err) {
    await cleanup();
    throw err;
  }
}
