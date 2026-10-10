import { sprig } from '../decor'
import { DocBuilder } from '../kit'
import { INK, PALETTES } from '../palette'
import type { TemplateDesign } from '../registry'

/** This design's own palette (see ../palette.ts). */
const ACCENT = PALETTES.forest

const W = 480
const H = 672
const IVORY = '#fff9f3'
const SAGE = '#5f8a6b'
const BERRY = ACCENT[600]
const GOLD = '#9a6b2f'
const PLUM = ACCENT[900]

export const botanicalInvitation: TemplateDesign = {
  slug: 'botanical-celebration-invitation',
  title: 'Botanical celebration invitation',
  category: 'invitations',
  tags: ['invitation', 'wedding', 'birthday', 'party', 'elegant', 'botanical', 'print', 'save the date'],
  description: 'A 5 x 7 in invitation with a double frame, hand-drawn leaf sprigs and script names. Works for a wedding, an engagement or a birthday.',
  preset: '',
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'in' })
    const p = doc.page('Invitation', { type: 'solid', color: IVORY })

    // Double frame with a small diamond in each corner.
    p.rect({ name: 'Outer frame', x: 18, y: 18, w: W - 36, h: H - 36, fill: '#00000000', stroke: PLUM, strokeWidth: 1.6, locked: true })
    p.rect({ name: 'Inner frame', x: 27, y: 27, w: W - 54, h: H - 54, fill: '#00000000', stroke: GOLD, strokeWidth: 0.9, locked: true })
    const corners: [number, number][] = [[27, 27], [W - 27, 27], [27, H - 27], [W - 27, H - 27]]
    p.group('Corner marks', corners.map(([x, y], i) => p.rect({ name: `Corner mark ${i + 1}`, x: x - 4, y: y - 4, w: 8, h: 8, fill: GOLD, angle: 45 })), { locked: true })

    sprig(p, { name: 'Top sprig', cx: W / 2, cy: 76, span: 150, leaf: SAGE, berry: BERRY })

    p.text({ name: 'Eyebrow', x: 56, y: 110, w: 368, text: 'Together with their families', font: 'crimson', bold: true, size: 13, color: PLUM, on: IVORY, align: 'center', spacing: 280, upper: true, lines: 1 })
    // The two names and the ampersand are three boxes, centred as one unit from their measured widths.
    const nameStyle = { font: 'greatVibes', size: 78, color: PLUM, on: IVORY, lh: 1.1 } as const
    const ampStyle = { font: 'crimson', italic: true, size: 40, color: GOLD, on: IVORY, lh: 1 } as const
    const first = p.measure({ ...nameStyle, name: 'First name', x: 0, y: 0, w: 400, text: 'Ava' })
    const amp = p.measure({ ...ampStyle, name: 'Ampersand', x: 0, y: 0, w: 100, text: '&' })
    const second = p.measure({ ...nameStyle, name: 'Second name', x: 0, y: 0, w: 400, text: 'Noah' })
    const gap = 14
    let x = (W - (first.widest + amp.widest + second.widest + gap * 2)) / 2
    p.text({ ...nameStyle, name: 'First name', x, y: 130, w: first.widest + 16, text: 'Ava', lines: 1 })
    x += first.widest + gap
    p.text({ ...ampStyle, name: 'Ampersand', x, y: 154, w: amp.widest + 16, text: '&', lines: 1 })
    x += amp.widest + gap
    p.text({ ...nameStyle, name: 'Second name', x, y: 130, w: second.widest + 16, text: 'Noah', lines: 1 })
    p.text({ name: 'Invitation line', x: 130, y: 224, w: 220, text: 'invite you to celebrate their wedding', font: 'crimson', italic: true, size: 24, color: INK, on: IVORY, align: 'center', lh: 1.2, lines: 2 })

    // Date block.
    p.line({ name: 'Date rule top', x1: 76, y1: 298, x2: 404, y2: 298, color: GOLD, width: 1 })
    p.text({ name: 'Weekday', x: 76, y: 326, w: 110, text: 'Saturday', font: 'crimson', bold: true, size: 16, color: PLUM, on: IVORY, align: 'center', spacing: 240, upper: true, lines: 1 })
    p.text({ name: 'Day', x: 190, y: 304, w: 100, text: '14', font: 'playfair', bold: true, size: 66, color: PLUM, on: IVORY, align: 'center', lh: 1, lines: 1 })
    p.text({ name: 'Month', x: 294, y: 326, w: 110, text: 'June', font: 'crimson', bold: true, size: 16, color: PLUM, on: IVORY, align: 'center', spacing: 240, upper: true, lines: 1 })
    p.line({ name: 'Date rule bottom', x1: 76, y1: 378, x2: 404, y2: 378, color: GOLD, width: 1 })
    p.text({ name: 'Time', x: 76, y: 390, w: 328, text: '2027  ·  half past four in the afternoon', font: 'crimson', italic: true, size: 18, color: INK, on: IVORY, align: 'center', lines: 1 })

    // Venue and reply.
    p.text({ name: 'Venue', x: 56, y: 434, w: 368, text: 'The Orchard House', font: 'crimson', bold: true, size: 28, color: PLUM, on: IVORY, align: 'center', lh: 1.1, lines: 1 })
    p.text({ name: 'Address', x: 56, y: 468, w: 368, text: '12 Orchard Lane, Willowbrook', font: 'crimson', size: 18, color: INK, on: IVORY, align: 'center', lines: 1 })
    p.text({ name: 'Dinner', x: 56, y: 494, w: 368, text: 'Dinner and dancing to follow', font: 'crimson', italic: true, size: 17, color: INK, on: IVORY, align: 'center', lines: 1 })
    p.text({ name: 'Reply', x: 56, y: 538, w: 368, text: 'Kindly reply by 1 May', font: 'crimson', bold: true, size: 12.5, color: PLUM, on: IVORY, align: 'center', spacing: 280, upper: true, lines: 1 })
    p.text({ name: 'Reply contact', x: 56, y: 558, w: 368, text: 'hello@ava-and-noah.example', font: 'crimson', size: 16, color: INK, on: IVORY, align: 'center', lines: 1 })
    sprig(p, { name: 'Bottom sprig', cx: W / 2, cy: 610, span: 110, leaf: SAGE, berry: BERRY, flip: true })
    return doc
  },
}
