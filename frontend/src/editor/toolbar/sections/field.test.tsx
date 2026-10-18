import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createBlankDocument } from '@/lib/document'
import { createMemoryAdapter } from '../../dev/memoryAdapter'
import { EditorProvider } from '../../EditorProvider'
import { EditorEngine } from '../../engine/editor'
import { EMPTY_SELECTION } from '../../store/editorStore'
import { FieldPanel } from './common'

function mount() {
  const doc = createBlankDocument(800, 600)
  doc.pages[0].objects.push({ id: 'other', type: 'textbox', field: { key: 'headline', type: 'text' } })
  const handle = createMemoryAdapter()
  const engine = new EditorEngine({ adapter: handle.adapter, document: doc, meta: { id: 'd', title: 'T', mode: 'guest' }, ephemeral: true })
  engine.store.setState({ selection: { ...EMPTY_SELECTION, pageId: engine.state.doc.pages[0].id, ids: ['o'], kinds: ['text'], objects: [{ id: 'o', type: 'textbox' }], version: 1 } })
  render(
    <EditorProvider engine={engine} portalRoot={document.body}>
      <FieldPanel type="text" />
    </EditorProvider>,
  )
  return engine
}

describe('FieldPanel', () => {
  it('cleans typed keys and blocks a key already used on the page', () => {
    const engine = mount()
    const key = screen.getByRole('textbox', { name: 'Field key' })
    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply).toBeDisabled()
    fireEvent.change(key, { target: { value: 'Hero Title' } })
    expect(key).toHaveValue('hero_title')
    expect(apply).toBeEnabled()
    fireEvent.change(key, { target: { value: 'headline' } })
    expect(screen.getByRole('alert')).toHaveTextContent('already used')
    expect(apply).toBeDisabled()
    engine.dispose()
  })
})
