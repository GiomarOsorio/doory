import { DocBuilder } from '../kit'
import { portraitBackdrop } from '../decor'
import type { TemplateDesign } from '../registry'

// Big number, three words, before and after: orange against deep blue, nothing near the edges.
const W = 1280
const H = 720
const NAVY = '#0c1a3a'
const ORANGE = '#ff7a1a'
const WHITE = '#ffffff'

export const youtubeThumbnail: TemplateDesign = {
  slug: 'bold-youtube-thumbnail',
  title: 'Bold YouTube thumbnail',
  category: 'youtube',
  tags: ['youtube', 'thumbnail', 'video', 'before-after', 'challenge'],
  description: 'A high-contrast before-and-after thumbnail: a huge number, three words, two photos and an arrow, all clear of the edges.',
  preset: 'youtube-thumbnail',
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'px', presetId: 'youtube-thumbnail' })
    const p = doc.page('Thumbnail', { type: 'gradient', kind: 'linear', angle: 0, stops: [{ offset: 0, color: NAVY }, { offset: 1, color: '#16306a' }] })

    // Before and after.
    portraitBackdrop(p, { name: 'Before stand-in', box: { x: 610, y: 150, w: 290, h: 410 }, radius: 23, bg: ['#5b6b8c', '#3a4a6c'], figure: '#9fb0d0' })
    p.placeholder({ name: 'Before photo', x: 610, y: 150, w: 290, h: 410, mask: 'rounded', maskRadius: 0.08 })
    portraitBackdrop(p, { name: 'After stand-in', box: { x: 930, y: 110, w: 300, h: 450 }, radius: 24, bg: ['#ffc27a', '#ff7a1a'], figure: '#fff1e2' })
    p.placeholder({ name: 'After photo', x: 930, y: 110, w: 300, h: 450, mask: 'rounded', maskRadius: 0.08 })
    p.rect({ name: 'Before tag', x: 670, y: 530, w: 170, h: 56, fill: WHITE, radius: 28 })
    p.text({ name: 'Before', x: 670, y: 530 + 13, w: 170, text: 'Before', font: 'archivo', bold: true, size: 26, color: NAVY, on: WHITE, align: 'center', upper: true, spacing: 120, lines: 1 })
    p.rect({ name: 'After tag', x: 995, y: 530, w: 170, h: 56, fill: ORANGE, radius: 28 })
    p.text({ name: 'After', x: 995, y: 530 + 13, w: 170, text: 'After', font: 'archivo', bold: true, size: 26, color: NAVY, on: ORANGE, align: 'center', upper: true, spacing: 120, lines: 1 })
    p.circle({ name: 'Arrow disc', cx: 915, cy: 340, r: 54, fill: ORANGE, stroke: NAVY, strokeWidth: 8 })
    p.icon({ name: 'Arrow', icon: 'arrowRight', x: 881, y: 306, size: 68, color: NAVY, width: 3.2 })

    // The words.
    p.text({ name: 'Kicker', x: 72, y: 110, w: 520, text: 'I tried it for', font: 'archivo', bold: true, size: 44, color: WHITE, on: [NAVY, '#16306a'], upper: true, spacing: 80, lines: 1 })
    p.text({ name: 'Number', x: 64, y: 160, w: 560, text: '30', font: 'anton', size: 330, color: ORANGE, on: [NAVY, '#16306a'], lh: 1, lines: 1 })
    p.text({ name: 'Unit', x: 72, y: 500, w: 540, text: 'Days', font: 'anton', size: 120, color: WHITE, on: [NAVY, '#16306a'], lh: 1, upper: true, lines: 1 })
    return doc
  },
}
