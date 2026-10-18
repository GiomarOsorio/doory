import type { UpscaleRequestOptions } from './types'

/** Messages between the editor and the upscaling worker. */
export type UpscaleWorkerRequest = { type: 'run'; id: number; image: Blob; options: UpscaleRequestOptions }

export type UpscaleWorkerReply =
  | { type: 'progress'; id: number; percent: number }
  | { type: 'done'; id: number; result: Blob }
  | { type: 'failed'; id: number; message: string }
