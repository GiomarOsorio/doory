/** The upscaler needs a module worker, an offscreen canvas and the browser's image decoder. */
export function isUpscaleSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function'
}
