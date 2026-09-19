// Descarga el ejecutable independiente de yt-dlp en ./bin
//  - No usa la API de GitHub (evita el error "API rate limit exceeded")
//  - No necesita Python (usa el binario standalone)
//  - Nunca rompe `npm install`: si falla, solo avisa.
import { chmod, mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const binDir = path.join(root, "bin");
const force = process.argv.includes("--force");

function assetName() {
  const { platform, arch } = process;
  if (platform === "win32") return "yt-dlp.exe";
  if (platform === "darwin") return "yt-dlp_macos";
  if (platform === "linux") return arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
  throw new Error(`Plataforma no soportada: ${platform}/${arch}`);
}

async function exists(p) {
  try {
    return (await stat(p)).size > 1_000_000;
  } catch {
    return false;
  }
}

async function main() {
  if (process.env.YTDLP_PATH) {
    console.log(`[yt-dlp] Usando YTDLP_PATH=${process.env.YTDLP_PATH}, no se descarga nada.`);
    return;
  }

  const asset = assetName();
  const target = path.join(binDir, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

  if (!force && (await exists(target))) {
    console.log("[yt-dlp] Ya está instalado. Para actualizarlo: npm run update:ytdlp");
    return;
  }

  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
  await mkdir(binDir, { recursive: true });

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[yt-dlp] Descargando ${asset} (intento ${attempt}/3)...`);
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1_000_000) throw new Error("Archivo descargado incompleto");

      const tmp = `${target}.download`;
      await writeFile(tmp, buf);
      await chmod(tmp, 0o755);
      await rm(target, { force: true });
      await rename(tmp, target);
      console.log(`[yt-dlp] Listo: ${target} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
      return;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastError;
}

main().catch((err) => {
  console.warn(`\n[yt-dlp] ⚠ No se pudo descargar automáticamente: ${err.message}`);
  console.warn("[yt-dlp]   Ejecuta más tarde:  npm run setup:ytdlp");
  console.warn(`[yt-dlp]   O descárgalo a mano desde https://github.com/yt-dlp/yt-dlp/releases/latest`);
  console.warn("[yt-dlp]   y ponlo en la carpeta ./bin (o define YTDLP_PATH).\n");
  process.exit(0); // no romper npm install
});
