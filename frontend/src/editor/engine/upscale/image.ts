/** Decoding to RGBA and encoding the result, using only the browser's own canvas APIs. */
import { MAX_OUTPUT_PIXELS, UpscaleError, type CropRect } from './types'

export interface DecodedImage {
  rgba: Uint8ClampedArray<ArrayBuffer>
  width: number
  height: number
}

/**
 * Decodes `blob` (or just the `crop` rectangle) into straight RGBA bytes. The crop is applied by the
 * decoder, so a photo in a design whose visible part is small does not have to be decoded at full size.
 */
export async function decodeImage(blob: Blob, crop?: CropRect): Promise<DecodedImage> {
  let bitmap: ImageBitmap
  try {
    bitmap = crop
      ? await createImageBitmap(blob, crop.x, crop.y, crop.width, crop.height)
      : await createImageBitmap(blob)
  } catch {
    throw new UpscaleError('This image cannot be decoded.')
  }
  try {
    const { width, height } = bitmap
    if (width < 1 || height < 1 || width * height > MAX_OUTPUT_PIXELS) {
      throw new UpscaleError('The image is too large to upscale.')
    }
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new UpscaleError('A canvas could not be created for this image.')
    context.drawImage(bitmap, 0, 0)
    const { data } = context.getImageData(0, 0, width, height)
    return { rgba: data, width, height }
  } finally {
    bitmap.close()
  }
}

/** Keep the result under the editor's usual upload budget without giving up much quality. */
const MAX_RESULT_BYTES = 9 * 1024 * 1024

export async function encodeResult(rgba: Uint8ClampedArray<ArrayBuffer>, width: number, height: number, method: 'photo' | 'pixel'): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) throw new UpscaleError('A canvas could not be created for the result.')
  context.putImageData(new ImageData(rgba, width, height), 0, 0)
  // Pixel art keeps exact colours in a PNG. Photographs go to WebP: visually near-lossless at this
  // quality, and a fraction of the PNG size, which matters for a 48-megapixel result.
  if (method === 'pixel') return canvas.convertToBlob({ type: 'image/png' })
  let blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.95 })
  // A browser without a WebP encoder answers with a PNG; compressing it again would do nothing.
  if (blob.type !== 'image/webp') return blob
  for (const quality of [0.88, 0.8, 0.7]) {
    if (blob.size <= MAX_RESULT_BYTES) break
    blob = await canvas.convertToBlob({ type: 'image/webp', quality })
  }
  return blob
}
