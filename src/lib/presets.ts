// Presets de calidad. Este archivo es seguro para usar tanto en cliente como en servidor.

export type OutputFormat = "mp4" | "mp3";
export type QualityKey = "low" | "medium" | "high";

export const OUTPUT_FORMATS: OutputFormat[] = ["mp4", "mp3"];
export const QUALITY_KEYS: QualityKey[] = ["low", "medium", "high"];

/** MP4: 3 resoluciones (se mide por el lado más corto, así funciona igual con videos verticales de TikTok). */
export const MP4_PRESETS: Record<QualityKey, { label: string; res: number; hint: string }> = {
  low: { label: "Baja", res: 360, hint: "Archivo más liviano" },
  medium: { label: "Media", res: 720, hint: "Equilibrado" },
  high: { label: "Alta", res: 1080, hint: "Máxima calidad" },
};

/** MP3: 3 bitrates. */
export const MP3_PRESETS: Record<QualityKey, { label: string; kbps: number; hint: string }> = {
  low: { label: "Baja", kbps: 128, hint: "Archivo más liviano" },
  medium: { label: "Media", kbps: 192, hint: "Equilibrado" },
  high: { label: "Alta", kbps: 320, hint: "Máxima calidad" },
};

export function isOutputFormat(v: unknown): v is OutputFormat {
  return v === "mp4" || v === "mp3";
}

export function isQualityKey(v: unknown): v is QualityKey {
  return v === "low" || v === "medium" || v === "high";
}

/** Texto corto para mostrar, p. ej. "720p" o "192 kbps". */
export function qualityLabel(format: string, quality: string): string {
  if (!isQualityKey(quality)) return quality;
  if (format === "mp3") return `${MP3_PRESETS[quality].kbps} kbps`;
  return `${MP4_PRESETS[quality].res}p`;
}

/**
 * Resolución real que se descargará para un preset dado, imitando el criterio de yt-dlp
 * (`-S res:N`): la mayor resolución <= N, o si no existe, la menor que esté por encima.
 */
export function effectiveResolution(target: number, available: number[]): number | null {
  if (available.length === 0) return null;
  const sorted = [...available].sort((a, b) => a - b);
  const below = sorted.filter((r) => r <= target);
  return below.length > 0 ? below[below.length - 1] : sorted[0];
}
