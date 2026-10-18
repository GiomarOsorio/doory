/**
 * The upscaling worker: decode, run the pure resampler and encode the result off the editor's main
 * thread, so the page stays responsive while a large photo is processed.
 */
import { upscaleImageData } from './core'
import { decodeImage, encodeResult } from './image'
import type { UpscaleWorkerReply, UpscaleWorkerRequest } from './protocol'

interface WorkerScope {
  postMessage(message: UpscaleWorkerReply): void
  onmessage: ((event: MessageEvent<UpscaleWorkerRequest>) => void) | null
}

const scope = self as unknown as WorkerScope

async function run(request: Extract<UpscaleWorkerRequest, { type: 'run' }>): Promise<void> {
  const { id } = request
  try {
    const image = await decodeImage(request.image, request.options.crop)
    scope.postMessage({ type: 'progress', id, percent: 1 })
    const result = upscaleImageData(image.rgba, image.width, image.height, {
      scale: request.options.scale,
      method: request.options.method,
      detail: request.options.detail,
      // Encoding the result is the last few percent of the work.
      onProgress: (percent) => scope.postMessage({ type: 'progress', id, percent: Math.round(percent * 0.95) }),
    })
    const encoded = await encodeResult(result.data, result.width, result.height, request.options.method ?? 'photo')
    scope.postMessage({ type: 'progress', id, percent: 100 })
    scope.postMessage({ type: 'done', id, result: encoded })
  } catch (error) {
    scope.postMessage({ type: 'failed', id, message: error instanceof Error ? error.message : 'Upscaling failed.' })
  }
}

scope.onmessage = (event) => {
  if (event.data.type === 'run') void run(event.data)
}
