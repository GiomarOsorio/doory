import { FabricImage } from 'fabric'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocObject } from '@/types/document'
import { setupEditor } from '../../animation/testing'
import { readTracks } from '../../audio/model'
import { readClip } from '../../clips/model'
import { installImageStub } from '../../test/imageStub'
import type { EditorEngine } from '../editor'

const clipObject = (over: Partial<DocObject> = {}): DocObject => ({
  id: 'clip',
  type: 'image',
  name: 'Beach',
  src: '/media/poster.webp',
  left: 400,
  top: 300,
  width: 160,
  height: 90,
  originX: 'center',
  originY: 'center',
  videoSrc: '/media/c.mp4',
  videoAudioSrc: '/media/a.m4a',
  videoDurationMs: 8000,
  videoTrimStartMs: 0,
  videoTrimEndMs: 8000,
  ...over,
})

describe('video clip commands', () => {
  let restoreImages: () => void
  let engine: EditorEngine
  beforeAll(() => {
    restoreImages = installImageStub({ width: 160, height: 90 })
  })
  afterAll(() => restoreImages())
  beforeEach(async () => {
    vi.spyOn(FabricImage.prototype, '_render').mockImplementation(() => undefined)
    ;({ engine } = await setupEditor({ objects: [clipObject(), { id: 'pic', type: 'image', src: '/media/p.png', left: 10, top: 10, width: 160, height: 90 }] }))
  })
  afterEach(async () => {
    // Let Fabric's scheduled repaint run while the drawing is still stubbed.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    engine.dispose()
    vi.restoreAllMocks()
  })

  const stored = (): DocObject => engine.getDocument().pages[0].objects.find((o) => o.id === 'clip')!

  it('reads the clip, keeps its poster as `src` and its kind as video', () => {
    expect(engine.videos.get('clip')).toMatchObject({ src: '/media/c.mp4', audioSrc: '/media/a.m4a', durationMs: 8000 })
    engine.select(['clip'])
    expect(engine.state.selection.kinds).toEqual(['video'])
    expect(stored().src).toBe('/media/poster.webp')
  })

  it('changes settings as one undo step per gesture, clamped', async () => {
    engine.videos.update('clip', { trimEndMs: 6000 }, 'Trim video', 'drag')
    engine.videos.update('clip', { trimEndMs: 5000 }, 'Trim video', 'drag')
    engine.videos.update('clip', { speed: 100, volume: -1 })
    expect(readClip(stored())).toMatchObject({ trimEndMs: 5000, speed: 4, volume: 0 })
    await engine.undo()
    expect(readClip(stored())).toMatchObject({ trimEndMs: 5000, speed: 1, volume: 1 })
    await engine.undo()
    expect(readClip(stored())?.trimEndMs).toBe(8000)
  })

  it('does nothing to plain pictures', () => {
    expect(engine.videos.update('pic', { muted: true })).toBe(false)
    expect(engine.videos.get('pic')).toBeNull()
  })

  it('detaches the sound into a page track and mutes the clip, in one step', async () => {
    engine.videos.update('clip', { startMs: 500, trimStartMs: 1000, volume: 0.5 })
    expect(engine.videos.detachAudio('clip')).toBe(true)
    const [track] = readTracks(engine.getDocument())
    expect(track).toMatchObject({ kind: 'upload', name: 'Beach', src: '/media/a.m4a', scope: { type: 'page' }, startMs: 500, trimStartMs: 1000, trimEndMs: 8000, volume: 0.5 })
    expect(stored().videoMuted).toBe(true)
    await engine.undo()
    expect(readTracks(engine.getDocument())).toHaveLength(0)
    expect(stored().videoMuted).not.toBe(true)
  })

  it('cannot detach the sound of a silent clip', async () => {
    engine.dispose()
    ;({ engine } = await setupEditor({ objects: [clipObject({ videoAudioSrc: undefined })] }))
    expect(engine.videos.detachAudio('clip')).toBe(false)
    expect(readTracks(engine.getDocument())).toHaveLength(0)
  })

  it('sets a clip as the background: covers the page, at the back, locked', () => {
    expect(engine.videos.setAsBackground('clip')).toBe(true)
    const objects = engine.getDocument().pages[0].objects
    expect(objects[0].id).toBe('clip')
    const clip = objects[0]
    expect(clip.locked).toBe(true)
    // 800 x 600 page, 160 x 90 clip: scaled to cover.
    expect(Number(clip.scaleX) * 160).toBeGreaterThanOrEqual(800)
    expect(Number(clip.scaleY) * 90).toBeGreaterThanOrEqual(600)
    expect([clip.left, clip.top]).toEqual([400, 300])
  })

  it('keeps picture tools away from clips', async () => {
    engine.select(['clip'])
    engine.style.setPlaceholder(true)
    expect(stored().isPlaceholder).toBeUndefined()
  })
})
