import { NextResponse } from "next/server";
import { ffmpegStatus, ytdlpPath, ytdlpVersion } from "@/lib/ytdlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Diagnóstico: indica si yt-dlp y ffmpeg están listos. */
export async function GET() {
  const ytdlp = { found: ytdlpPath() !== null, version: ytdlpVersion() };
  const ffmpeg = ffmpegStatus();
  return NextResponse.json({
    ok: ytdlp.found && ffmpeg.found,
    ytdlp,
    ffmpeg,
    node: process.version,
  });
}
