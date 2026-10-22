/**
 * Entry point of `render.html`: a page with no UI that the server's headless browser opens to draw a design. The
 * server calls `window.__dooryRender(input)` (one page as a PNG) or `window.__dooryRenderPages(input)` (pages for the
 * SVG and PDF exports) once `window.__dooryRenderReady` is true. Design fonts come only from `input.fonts` (the
 * app's bundled UI fonts are other families, e.g. "Plus Jakarta Sans Variable").
 */
import { canvasToBlob } from '../engine/render'
import { type PagesInput, type RenderErrorCode, type RenderInput, type RenderedPages, RenderError, base64, renderDesignPage, renderDesignPages } from './render'

type Failure = { ok: false; error: { code: RenderErrorCode | 'render_failed'; message: string } }

export type RenderResponse = { ok: true; png: string; width: number; height: number; pageId: string; pageIndex: number; placeholders: number; missingFonts: string[] } | Failure

export type RenderPagesResponse = ({ ok: true } & RenderedPages) | Failure

declare global {
  interface Window {
    __dooryRender?: (input: RenderInput) => Promise<RenderResponse>
    __dooryRenderPages?: (input: PagesInput) => Promise<RenderPagesResponse>
    __dooryRenderReady?: boolean
  }
}

function failure(error: unknown): Failure {
  if (error instanceof RenderError) return { ok: false, error: { code: error.code, message: error.message } }
  return { ok: false, error: { code: 'render_failed', message: error instanceof Error ? error.message : String(error) } }
}

window.__dooryRender = async (input) => {
  try {
    const { canvas, ...page } = await renderDesignPage(input)
    const png = await base64(await canvasToBlob(canvas, 'image/png'))
    return { ok: true, png, width: canvas.width, height: canvas.height, ...page }
  } catch (error) {
    return failure(error)
  }
}
window.__dooryRenderPages = async (input) => {
  try {
    return { ok: true, ...(await renderDesignPages(input)) }
  } catch (error) {
    return failure(error)
  }
}
window.__dooryRenderReady = true
