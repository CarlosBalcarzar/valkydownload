# VidSnap – Descargador de YouTube y TikTok

Descarga videos en **MP4** o audio en **MP3**, con **3 opciones de calidad** para cada uno.

| Formato | Baja | Media | Alta |
|---------|------|-------|------|
| MP4     | 360p | 720p  | 1080p |
| MP3     | 128 kbps | 192 kbps | 320 kbps |

Si el video no tiene exactamente esa resolución, se usa la más cercana disponible (la interfaz te muestra cuál).

## Requisitos

- **Node.js 20.9 o superior** (https://nodejs.org)
- Conexión a internet para la instalación (baja yt-dlp y ffmpeg automáticamente)

**No necesitas** instalar Python, ffmpeg, PostgreSQL ni configurar variables de entorno.

## Uso

```bash
npm install      # instala todo, incluido yt-dlp (carpeta bin/) y ffmpeg
npm run dev      # abre http://localhost:3000
```

Producción: `npm run build && npm start`

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run update:ytdlp` | Actualiza yt-dlp. **Hazlo primero si dejan de funcionar las descargas**: YouTube y TikTok cambian seguido y yt-dlp se actualiza para seguirlos. |
| `npm run setup:ytdlp` | Vuelve a descargar yt-dlp si la instalación falló. |
| `http://localhost:3000/api/health` | Diagnóstico: indica si yt-dlp y ffmpeg están encontrados. |

## Solución de problemas

**"Sign in to confirm you're not a bot" (YouTube)**
Crea un archivo `.env.local` con la sesión de tu navegador (con YouTube abierto e iniciado en él):
```
YTDLP_COOKIES_FROM_BROWSER=chrome
```
(también `firefox`, `edge`, `brave`, etc.) y reinicia. Alternativa: `YTDLP_COOKIES_FILE=ruta\cookies.txt`.

**Falla el MP3 o la unión de video+audio**
Falta ffmpeg o no arranca en tu sistema. Instala ffmpeg y apunta a él en `.env.local`:
```
FFMPEG_PATH=C:\ruta\a\ffmpeg.exe
```

**`npm install` no pudo bajar yt-dlp**
No es fatal. Ejecuta `npm run setup:ytdlp` cuando tengas conexión, o descarga `yt-dlp` desde
https://github.com/yt-dlp/yt-dlp/releases/latest, colócalo en `bin/` (o define `YTDLP_PATH`).

Ver todas las variables opcionales en `.env.example`.

## Cómo está hecho

- `src/lib/presets.ts` – las 3 calidades de MP4 y MP3 (compartido entre servidor e interfaz).
- `src/lib/ytdlp.ts` – ejecuta yt-dlp/ffmpeg (info, descarga, manejo de errores).
- `src/app/api/{info,download,history,health}` – endpoints.
- El historial se guarda en `data/history.json` (sin base de datos).

> Descarga solo contenido que tengas derecho a descargar y respeta los términos de cada plataforma.
