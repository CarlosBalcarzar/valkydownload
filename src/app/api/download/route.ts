import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { downloadMedia, detectPlatform } from "@/lib/ytdlp";
import { parseHttpUrl } from "@/lib/url";
import { addRecord, updateRecord } from "@/lib/history";
import { isOutputFormat, isQualityKey } from "@/lib/presets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

const CONTENT_TYPES = { mp3: "audio/mpeg", mp4: "video/mp4" } as const;

function safeFilename(title: unknown, ext: string): string {
  const base =
    typeof title === "string"
      ? title
          .replace(/[\\/:*?"<>|\x00-\x1f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80)
          .replace(/[. ]+$/, "")
      : "";
  return `${base || "video"}.${ext}`;
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const url = parseHttpUrl(body.url);
  if (!url) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const format = isOutputFormat(body.format) ? body.format : "mp4";
  const quality = isQualityKey(body.quality) ? body.quality : "medium";
  const title = typeof body.title === "string" ? body.title : null;

  const record = await addRecord({
    url,
    platform: detectPlatform(url),
    title,
    format,
    quality,
    status: "processing",
    thumbnail: typeof body.thumbnail === "string" ? body.thumbnail : null,
    duration: body.duration != null ? String(body.duration) : null,
  });

  try {
    const result = await downloadMedia({ url, format, quality, signal: req.signal });

    if (record) await updateRecord(record.id, { status: "done", fileSize: result.size });

    // Se envía el archivo en streaming (sin cargarlo entero en memoria) y se borra al terminar.
    const stream = fs.createReadStream(result.file);
    stream.on("close", () => void result.cleanup());

    return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
      headers: {
        "Content-Type": CONTENT_TYPES[result.ext],
        "Content-Length": String(result.size),
        "Content-Disposition": contentDisposition(safeFilename(title, result.ext)),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    if (record) await updateRecord(record.id, { status: "error", errorMsg: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
