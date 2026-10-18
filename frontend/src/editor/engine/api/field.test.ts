import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlankDocument } from '@/lib/document'
import type { DocObject } from '@/types/document'
import { createMemoryAdapter } from '../../dev/memoryAdapter'
import { EditorEngine } from '../editor'

async function setup() {
  const engine = new EditorEngine({ adapter: createMemoryAdapter().adapter, document: createBlankDocument(800, 600), meta: { id: 'd1', title: 'Test', mode: 'guest' }, ephemeral: true })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const pageId = engine.state.doc.pages[0].id
  engine.mountPage(pageId, host)
  const view = await engine.whenView(pageId)
  view.setLayout(1, { x: 0, y: 0, width: 800, height: 600 })
  return engine
}

const objects = (engine: EditorEngine): DocObject[] => engine.state.doc.pages[0].objects

describe('template field tags', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['thumb'], { type: 'image/webp' })))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('tags the selected object, ignores invalid keys and clears the tag', async () => {
    const engine = await setup()
    await engine.insert.shape('rect')
    engine.style.setField({ key: 'Bad Key', type: 'color' })
    expect(objects(engine)[0].field).toBeUndefined()
    engine.style.setField({ key: 'accent', type: 'color', label: 'Accent' })
    expect(objects(engine)[0].field).toEqual({ key: 'accent', type: 'color', label: 'Accent' })
    engine.style.setField(null)
    expect(objects(engine)[0].field).toBeUndefined()
    engine.dispose()
  })

  it('does not copy the tag to a duplicate', async () => {
    const engine = await setup()
    await engine.insert.shape('rect')
    engine.style.setField({ key: 'accent', type: 'color' })
    await engine.arrange.duplicate()
    expect(objects(engine)).toHaveLength(2)
    expect(objects(engine)[0].field).toEqual({ key: 'accent', type: 'color' })
    expect(objects(engine)[1].field).toBeUndefined()
    engine.dispose()
  })
})
