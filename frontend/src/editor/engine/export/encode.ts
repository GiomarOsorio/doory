/**
 * Turns a drawn page into a PNG, JPG, WebP or AVIF file. The browser encodes what it can; the server
 * (`EditorAdapter.optimizeImage`) converts and optimizes when an optimizer is on, for AVIF (no browser encodes it from a
 * canvas), for WebP where the browser can't make it (Safari quietly answers with a PNG) and for palette PNGs. When the
 * server can't help, the browser's own file is kept and a note says so.
 */
import { canvasToBlob } from '../render'
import { type OptimizeAdapter, type RasterFormat, type RasterOptions, RASTER_MIME, browserEncodes, hasAlpha, isLossy, serverConverts, wantsServer } from './raster'
import { t } from '../../strings'

export interface EncodedRaster {
  blob: Blob
  /** What the file is: the format asked for, or PNG when neither the browser nor the server could make it. */
  format: RasterFormat
  /** The file's size before optimizing (the same as the file when nothing was optimized). */
  bytesBefore: number
  optimized: boolean
  /** Something to tell the person: the server's warning, or that its step was skipped. */
  note?: string
}

const FIT_STEPS = 7

/** The highest quality whose file stays under `maxBytes` (a binary search, as the server does); the lowest when none does. */
async function fitInBrowser(canvas: HTMLCanvasElement, mime: string, maxBytes: number, quality: number): Promise<Blob> {
  const first = await canvasToBlob(canvas, mime, quality)
  if (first.size <= maxBytes) return first
  let lo = 0.05
  let hi = quality
  let best: Blob | null = null
  for (let i = 0; i < FIT_STEPS; i++) {
    const mid = (lo + hi) / 2
    const blob = await canvasToBlob(canvas, mime, mid)
    if (blob.size <= maxBytes) {
      best = blob
      lo = mid
    } else hi = mid
  }
  return best ?? canvasToBlob(canvas, mime, 0.05)
}

async function encodeInBrowser(canvas: HTMLCanvasElement, format: RasterFormat, options: RasterOptions): Promise<{ blob: Blob; format: RasterFormat }> {
  if (!browserEncodes(format)) return { blob: await canvasToBlob(canvas, 'image/png'), format: 'png' }
  const mime = RASTER_MIME[format]
  const blob = isLossy(format) && options.maxBytes ? await fitInBrowser(canvas, mime, options.maxBytes, options.quality) : await canvasToBlob(canvas, mime, isLossy(format) ? options.quality : undefined)
  // Safari answers an unknown type with a PNG instead of failing.
  return blob.type === mime || !blob.type ? { blob, format } : { blob, format: 'png' }
}

/**
 * The file for one drawn page. The server step is skipped (and the browser's file kept) when there is no server, and
 * on any failure of it but a cancel.
 */
export async function encodeRaster(canvas: HTMLCanvasElement, format: RasterFormat, options: RasterOptions, adapter: OptimizeAdapter, signal?: AbortSignal): Promise<EncodedRaster> {
  const local = await encodeInBrowser(canvas, format, options)
  const fallback = (note?: string): EncodedRaster => ({ blob: local.blob, format: local.format, bytesBefore: local.blob.size, optimized: false, note: note ?? (local.format !== format ? t.dialog.downloadNoServer(format.toUpperCase()) : undefined) })
  const optimizeImage = adapter.optimizeImage
  if (!optimizeImage || !serverConverts(adapter, format) || !wantsServer(format, options)) return fallback()
  try {
    const png = local.format === 'png' ? local.blob : await canvasToBlob(canvas, 'image/png')
    const result = await optimizeImage({
      file: png,
      format,
      quality: Math.round(options.quality * 100),
      maxBytes: isLossy(format) ? options.maxBytes : undefined,
      pngColors: format === 'png' ? (options.pngColors ?? 'full') : undefined,
      transparent: hasAlpha(format) && options.transparent,
      stripMetadata: options.stripMetadata ?? true,
      progressive: format === 'jpg' ? options.progressive === true : undefined,
      optimize: options.optimize ? (options.optimizer ?? true) : false,
      signal,
    })
    return { blob: result.blob, format: result.format, bytesBefore: result.bytesBefore, optimized: result.optimized, note: result.warnings[0] }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    return fallback(local.format === format ? t.dialog.downloadServerSkipped : t.dialog.downloadNoServer(format.toUpperCase()))
  }
}
