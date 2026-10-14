import { DocBuilder } from '../kit'
import type { TemplateDesign } from '../registry'

// The usual shape of a thumbnail that gets clicked: a face on one side, three or four huge words on the other, high
// contrast and nothing near the edges (the duration badge sits bottom right).
const W = 1280
const H = 720
const NAVY = '#0c1a3a'
const ORANGE = '#ff7a1a'
const WHITE = '#ffffff'

export const youtubeThumbnail: TemplateDesign = {
  slug: 'bold-youtube-thumbnail',
  title: 'Bold YouTube thumbnail',
  category: 'youtube',
  tags: ['youtube', 'thumbnail', 'video', 'challenge', 'vlog'],
  description: 'A high-contrast challenge thumbnail: a face on the right, "I tried it for 30 days" in huge type on deep blue, clear of the edges.',
  preset: 'youtube-thumbnail',
  async build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'px', presetId: 'youtube-thumbnail' })
    const p = doc.page('Thumbnail', { type: 'solid', color: NAVY })

    // The face, blending into the blue.
    await p.photo({ name: 'Photo', file: 'youtube-face.webp', x: 520, y: 0, w: 760, h: H, focusX: 0.42, focusY: 0.3, zoom: 1.06 })
    p.rect({ name: 'Blend', x: 520, y: 0, w: 220, h: H, fill: { angle: 0, stops: [[0, NAVY], [1, '#0c1a3a00']] } })

    // The words.
    p.text({ name: 'Kicker', x: 72, y: 96, w: 560, text: 'I tried it for', font: 'archivo', bold: true, size: 52, color: WHITE, on: NAVY, lines: 1 })
    p.text({ name: 'Number', x: 60, y: 150, w: 560, text: '30', font: 'anton', size: 340, color: ORANGE, on: NAVY, lh: 1, lines: 1 })
    p.text({ name: 'Unit', x: 72, y: 500, w: 540, text: 'Days', font: 'anton', size: 120, color: WHITE, on: NAVY, lh: 1, upper: true, lines: 1 })
    return doc
  },
}
