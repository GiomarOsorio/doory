# Server-side export

Most downloads (PNG, JPG, SVG, PDF, MP4, WebM, GIF) are made in the user's browser and don't need the server.
Two exports run on the server, in a headless Chromium:

| Export | Used for | Setting | Default |
|--------|----------|---------|---------|
| Print PDF | Print-quality PDFs | `SERVER_PDF_ENABLED` | on |
| Saved designs as images (PNG, JPG, WebP, AVIF), SVG or PDF; several image or SVG pages as a ZIP | `POST /api/v1/designs/{id}/export/image/` and the MCP tool `export_design` | `SERVER_IMAGE_EXPORT_ENABLED` (PDFs also `SERVER_PDF_ENABLED`) | off |

## Requirements

- **Docker:** `INSTALL_CHROMIUM=true` (the default) builds Chromium into the `api` and `mcp` images, which adds
  about 400 MB.
- **Without Docker:** install Playwright's Chromium (see [manual.md](manual.md#optional-server-side-export)), or
  point `EXPORT_CHROMIUM_PATH` at another Chromium.
- **Image export also needs the built frontend's `render.html`** at an address the API (and MCP) service can
  reach. In Docker the default `EXPORT_RENDER_PAGE_URL=http://doory-web:8080/render.html` already works. Without
  Docker the default is `SITE_URL/render.html`, served by nginx from `frontend/dist`. The Vite dev server won't
  work for this.
- **AVIF needs Pillow 11.2 or newer built with libavif.** The Pillow wheels that `pip install` gets (and the
  Docker image) include it. Without it, AVIF is refused and `auto` compares the other formats.

## Turn it on

```ini
SERVER_IMAGE_EXPORT_ENABLED=true
```

Turning it on runs the editor's drawing code (JavaScript) inside the export browser. The browser can only load
the render page, `/assets/`, and `/media/` and `/static/` from `EXPORT_ALLOWED_ORIGINS`; every other request is
blocked.

To use Docker without Chromium, set `INSTALL_CHROMIUM=false` and `SERVER_PDF_ENABLED=false`, and leave image
export off.

## Image options

The REST endpoint (a JSON body) and the MCP tool `export_design` take the same options:

| Option | Default | What it does |
|--------|---------|--------------|
| `page` | first page | One page, by its id or its number counting from 1 |
| `pages` | | Several pages instead: `"all"` or a list such as `[1, 3]`. They come back as one ZIP |
| `format` | `png` | `png`, `jpg`, `webp`, `avif`, or `auto`: all of them, keeping the smallest file (no JPG when `transparent`). Also `svg`, `pdf` and `pdf-print`: see [SVG and PDF](#svg-and-pdf) |
| `quality` | `90` | JPG, WebP and AVIF: 1 to 100, or `small` (65), `balanced` (82), `best` (95), `original` (100) |
| `max_bytes` | | Largest file wanted. JPG, WebP and AVIF use the highest quality, up to `quality`, that fits. If even the lowest doesn't fit, the smallest file comes back with a warning |
| `scale` | `1` | Output pixels per page pixel, from 0.1 to 4 |
| `size` | | Instead of `scale`: `"2x"`, `"1080w"` (that many pixels wide) or `"1350h"` (that many pixels high) |
| `transparent` | `false` | Leave the page background out (not for JPG) |
| `png_colors` | `full` | PNG only: a palette of 2 to 256 colours, used only when the file gets smaller |
| `strip_metadata` | `true` | Leave text, time and Exif metadata out |
| `srgb` | `true` | Leave any colour profile out (the page is drawn in sRGB) |
| `progressive` | `false` | JPG only: a progressive JPG |
| `optimize` | `false` | Make the file smaller afterwards: `true` (the default optimizer) or an optimizer's id. It never makes a file bigger; see [image optimization](../integrations/image-optimization.md) |
| `file_names` | `EXPORT_FILENAME_STYLE` | `simple` or `detailed` (with platform, preset and size) names. The REST endpoint also takes `filename_style` and `filename_timestamp` |

| `bleed_mm` | `0` | PDF only: bleed around every page, 0 to 10 mm (3 is usual for print) |
| `crop_marks` | `false` | PDF only: crop marks in a margin around the bleed |
| `cmyk` | `false` | Not offered: PDFs are RGB, as on screen, and `true` is refused (`cmyk_unavailable`) |

Each page is drawn on its own, one after another, so a ZIP of many pages takes as long as that many exports.
Each page after the first counts once more against the `export` rate (30 a minute per user), and over MCP
against `MCP_CALLS_PER_MINUTE` too. `EXPORT_IMAGE_MAX_PAGES` limits the pages one export may draw. Over MCP,
AVIF images, SVG files, PDFs and ZIPs are always sent as a download link, because clients can't show them
inline.

## SVG and PDF

These formats make the same files as the editor's Download:

| `format` | File | How it is made |
|----------|------|----------------|
| `svg` | One SVG per page (several pages as a ZIP), with its pictures and fonts inside | Drawn by the render page |
| `pdf` | One PDF of all pages, each a 300 dpi picture | Pictures from the render page, printed as a PDF |
| `pdf-print` | One vector PDF for printing: text stays text, fonts are embedded, links work | Pages from the render page, through the print PDF pipeline |

All pages are made in one browser, within `EXPORT_TIMEOUT_SECONDS` for each page. A PDF is then printed within
another `EXPORT_TIMEOUT_SECONDS`. Both PDFs take `bleed_mm` and `crop_marks`, and their pages get TrimBox and
BleedBox entries like the print PDF. A `pdf` page whose picture would have more than `EXPORT_IMAGE_MAX_PIXELS`
pixels at 300 dpi is drawn at a lower resolution, with a warning. The image options (from `quality` to
`optimize`) don't apply to these formats. Each page after the first counts once more against the rates, as for
images. There is no CMYK conversion.

## Settings

See [Server-side export in configuration.md](configuration.md#server-side-export): size limits, concurrency,
timeouts, work folders and file names.

## Housekeeping

Exported images waiting to be downloaded are kept in `EXPORT_STORAGE_ROOT` until their link expires. Expired
images are deleted each time a new one is stored. On a quiet site, `manage.py purge_exports` deletes them too
(see [Scheduled tasks](README.md#scheduled-tasks)).

## Check it works

- Export a design as a print PDF from the editor's Share menu.
- With image export on, sign in and call `POST /api/v1/designs/{id}/export/image/` for one of your designs, for
  example with `{"format": "auto", "size": "1080w", "max_bytes": 500000}`, `{"pages": "all"}` for a ZIP, or
  `{"format": "pdf-print", "pages": "all", "bleed_mm": 3, "crop_marks": true}`.

## Troubleshooting

- **Chromium crashes in Docker:** the services set `shm_size: 512m`; keep it. For the `mcp` service, raise
  `MCP_MEM_LIMIT` if it runs out of memory.
- **Exports time out:** raise `EXPORT_TIMEOUT_SECONDS`, or lower `EXPORT_MAX_CONCURRENCY` on small servers.
  Exports of several pages run in one request: keep `EXPORT_IMAGE_MAX_PAGES` times the time of one export under
  the web server's worker timeout (120 s in the Docker image).
- **Image export returns blank pages or 404s:** `EXPORT_RENDER_PAGE_URL` must point to the *built* frontend, at an
  address the API container can reach.
- **SVG and PDF fail with 503 while images work:** the frontend is older than the API; deploy both from the same
  version.
- **An SVG export fails with `image_unavailable`:** a picture of the design could not be fetched to put into the
  file. Check that it is under `/media/` on an allowed origin.
- **macOS development, "socket path too long":** set `EXPORT_WORK_DIR` to a short path such as `/tmp/dxw`.
