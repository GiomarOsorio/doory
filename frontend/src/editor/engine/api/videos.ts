/**
 * Video clip commands. A clip is a picture (its poster) with `video…` props (see `clips/model.ts`), so placing,
 * moving, cropping, masking and animating it are the picture commands; what is here is what only clips have: adding
 * one from an asset, its playback settings, "Set as background" and "Detach audio". Every command is one undo step
 * and does nothing in a read-only editor.
 *
 * Settings go onto the live object, like animation edits: nothing is rebuilt, and co-editing sees only the props
 * that changed (they are flat for that reason).
 */
import { type FabricImage, type FabricObject } from 'fabric'
import type { AssetRef } from '@/types/adapter'
import type { DocObject, DoryDocument } from '@/types/document'
import { type Clip, type ClipFilmstrip, clipPropsFromAsset, isClip, readClip } from '../../clips/model'
import { MAX_TRACKS, createTrack, readTracks, withTracks } from '../../audio/model'
import { t } from '../../strings'
import type { EditorEngine } from '../editor'
import { createImage } from '../objects/factories'
import { applyLock, asDory } from '../objects/dory'

const labels = t.clips.history

/** What a clip's settings can be changed to (`ClipPatch` keys map to the object's `video…` props). */
export interface ClipPatch {
  startMs?: number
  trimStartMs?: number
  trimEndMs?: number
  loop?: boolean
  muted?: boolean
  volume?: number
  speed?: number
  fadeInMs?: number
  fadeOutMs?: number
}

const PROP: Record<keyof ClipPatch, string> = {
  startMs: 'videoStartMs',
  trimStartMs: 'videoTrimStartMs',
  trimEndMs: 'videoTrimEndMs',
  loop: 'videoLoop',
  muted: 'videoMuted',
  volume: 'videoVolume',
  speed: 'videoSpeed',
  fadeInMs: 'videoFadeInMs',
  fadeOutMs: 'videoFadeOutMs',
}

const asRecord = (o: FabricObject): Record<string, unknown> => o as unknown as Record<string, unknown>

/** True when the live object is a clip. */
export function isLiveClip(o: FabricObject | undefined | null): o is FabricImage {
  return !!o && isClip(asRecord(o))
}

/** The clip a live object holds, as the editor reads it. */
export function liveClip(o: FabricObject): Clip | null {
  return readClip(asRecord(o))
}

export class VideosApi {
  constructor(private readonly engine: EditorEngine) {}

  /** The live clip on the active page with this id, or the selected one. */
  private target(id?: string): FabricImage | null {
    const view = this.engine.activeView()
    if (!view) return null
    const obj = id ? view.getById(id) : view.selectedObjects().length === 1 ? view.selectedObjects()[0] : undefined
    return isLiveClip(obj) && !asDory(obj).rawDoc ? obj : null
  }

  /** The clip with this id (or the selected one) on the active page. */
  get(id?: string): Clip | null {
    const obj = this.target(id)
    return obj ? liveClip(obj) : null
  }

  /**
   * Changes the settings of a clip: one undo step, or one per gesture when the calls share `coalesceKey` (a trim drag).
   * Values are clamped to what the clip allows. Returns false when nothing changed.
   */
  update(id: string | undefined, patch: ClipPatch, label: string = labels.update, coalesceKey?: string): boolean {
    if (this.engine.readOnly) return false
    const obj = this.target(id)
    const clip = obj ? liveClip(obj) : null
    if (!obj || !clip) return false
    const record = asRecord(obj)
    const merged: Record<string, unknown> = { ...record }
    for (const [key, value] of Object.entries(patch) as [keyof ClipPatch, unknown][]) if (value !== undefined) merged[PROP[key]] = value
    const next = readClip({ ...merged, type: 'image' })
    if (!next) return false
    const values: Record<string, unknown> = {
      videoStartMs: next.startMs,
      videoTrimStartMs: next.trimStartMs,
      videoTrimEndMs: next.trimEndMs,
      videoLoop: next.loop,
      videoMuted: next.muted,
      videoVolume: next.volume,
      videoSpeed: next.speed,
      videoFadeInMs: next.fadeInMs,
      videoFadeOutMs: next.fadeOutMs,
    }
    const changed = Object.entries(values).filter(([key, value]) => record[key] !== value)
    if (changed.length === 0) return false
    for (const [key, value] of changed) record[key] = value
    obj.set('dirty', true)
    this.engine.commitActive({ label, coalesceKey })
    return true
  }

  /**
   * Adds a ready clip to a page, fitted inside it. With a single unfilled placeholder selected the clip fills that frame
   * instead, like a picture would.
   */
  async fromAsset(ref: AssetRef, at?: { x: number; y: number }, pageId?: string): Promise<void> {
    if (this.engine.readOnly || ref.kind !== 'video' || !ref.video || ref.video.status !== 'ready') return
    const target = pageId ?? this.engine.state.activePageId
    const view = this.engine.viewOf(target)
    const selected = view?.selectedObjects() ?? []
    if (!at && selected.length === 1 && asDory(selected[0]).isPlaceholder && asDory(selected[0]).id) {
      await this.engine.insert.fillPlaceholderWith(target, asDory(selected[0]).id as string, ref)
      return
    }
    try {
      const poster = ref.video.posterUrl
      const url = await this.engine.assets.resolve(poster)
      const page = this.engine.pageSizeOf(target)
      // A clip is fitted to the page, so it goes in the middle of it (not a step aside, as smaller inserts do).
      const img = await createImage({ src: poster, url, assetId: ref.id }, at ?? { x: page.width / 2, y: page.height / 2 }, { width: page.width, height: page.height })
      img.set(clipPropsFromAsset(ref))
      asDory(img).name = ref.name
      await this.engine.insert.add([img], labels.add, { pageId: target, announce: t.clips.announce.added })
    } catch {
      this.engine.toast(t.errors.imageLoad, 'error')
    }
  }

  /** Makes a clip fill the page behind everything else, locked in place (what "Set as background" means for a video). */
  setAsBackground(id?: string): boolean {
    if (this.engine.readOnly) return false
    const view = this.engine.activeView()
    const obj = this.target(id)
    if (!view || !obj) return false
    const page = this.engine.pageSizeOf(this.engine.state.activePageId)
    const scale = Math.max(page.width / (obj.width || 1), page.height / (obj.height || 1))
    obj.set({ left: page.width / 2, top: page.height / 2, originX: 'center', originY: 'center', scaleX: scale, scaleY: scale, angle: 0, skewX: 0, skewY: 0, cropX: 0, cropY: 0 })
    asDory(obj).locked = true
    applyLock(obj)
    view.canvas.sendObjectToBack(obj)
    obj.setCoords()
    view.canvas.discardActiveObject()
    view.canvas.requestRenderAll()
    this.engine.commitActive({ label: labels.background })
    return true
  }

  /**
   * Moves the clip's sound to an audio track of the page (same start, trim and volume) and mutes the clip: one undo step.
   * Afterwards the sound can be moved, trimmed, faded and ducked like any track.
   */
  detachAudio(id?: string): boolean {
    if (this.engine.readOnly) return false
    const obj = this.target(id)
    const clip = obj ? liveClip(obj) : null
    const objectId = obj ? asDory(obj).id : undefined
    if (!obj || !clip || !clip.audioSrc || !objectId) return false
    const doc = this.engine.getDocument()
    const tracks = readTracks(doc)
    if (tracks.length >= MAX_TRACKS) {
      this.engine.toast(t.audio.errors.limit, 'error')
      return false
    }
    const pageId = this.engine.state.activePageId
    const track = createTrack({
      kind: 'upload',
      name: asDory(obj).name || t.clips.kind,
      src: clip.audioSrc,
      durationMs: clip.durationMs,
      scope: { type: 'page', pageId },
      startMs: clip.startMs,
      assetId: asDory(obj).assetId,
    })
    Object.assign(track, { trimStartMs: clip.trimStartMs, trimEndMs: clip.trimEndMs, volume: clip.volume, loop: clip.loop, fadeInMs: clip.fadeInMs, fadeOutMs: clip.fadeOutMs })
    const pages = doc.pages.map((page) =>
      page.id !== pageId ? page : { ...page, objects: page.objects.map((o): DocObject => (o.id === objectId ? { ...o, videoMuted: true } : o)) },
    )
    const next: DoryDocument = withTracks({ ...doc, pages }, [...tracks, track])
    this.engine.applyDocument(next, { label: labels.detachAudio, selection: [objectId] })
    this.engine.refreshSelection() // the toolbar reads the clip's settings from the selection
    this.engine.announce(t.clips.announce.detached)
    return true
  }

  /** The filmstrip of a clip, for the timeline and the trim popover. */
  filmstrip(id?: string): ClipFilmstrip | null {
    return this.get(id)?.filmstrip ?? null
  }
}
