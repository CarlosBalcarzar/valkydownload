import { NextRequest, NextResponse } from "next/server";
import { fetchInfo } from "@/lib/ytdlp";
import { parseHttpUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const url = parseHttpUrl(body.url);
  if (!url) {
    return NextResponse.json(
      { error: "Ingresa un enlace válido (que empiece con http:// o https://)" },
      { status: 400 }
    );
  }

  try {
    const info = await fetchInfo(url, req.signal);
    return NextResponse.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
