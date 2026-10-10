import { portraitBackdrop } from '../decor'
import { bandInPage, circleInPage, rotatedOrigin } from '../geometry'
import { DocBuilder } from '../kit'
import { INK, PALETTES, WHITE } from '../palette'
import type { TemplateDesign } from '../registry'

/** This design's own palette (see ../palette.ts). */
const ACCENT = PALETTES.violet

const W = 1280
const H = 720
const PAGE = { x: 0, y: 0, w: W, h: H }
const GOLD = '#ffd23f'

export const youtubeThumbnail: TemplateDesign = {
  slug: 'bold-youtube-thumbnail',
  title: 'Bold YouTube thumbnail',
  category: 'youtube',
  tags: ['youtube', 'thumbnail', 'video', 'challenge', 'vlog', 'creator'],
  description: 'A punchy 1280 x 720 thumbnail: giant outlined number, a tilted caption and a framed photo slot for your face.',
  preset: 'youtube-thumbnail',
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'px', presetId: 'youtube-thumbnail' })
    const p = doc.page('Thumbnail', { type: 'solid', color: ACCENT[600] })

    // Background: a dark diagonal band and a halo behind the photo.
    p.path({ name: 'Diagonal band', d: bandInPage(560, 380, 1900, 240, -24, PAGE), fill: ACCENT[700], locked: true })
    p.path({ name: 'Halo', d: circleInPage(1010, 370, 330, PAGE), fill: GOLD, locked: true })

    // Photo with a white border and a shadow, so it reads as a sticker.
    p.rect({ name: 'Photo border', x: 758, y: 52, w: 456, h: 616, fill: WHITE, radius: 40, shadow: { color: INK, blur: 0, offsetX: 12, offsetY: 14 } })
    portraitBackdrop(p, { name: 'Photo backdrop', box: { x: 768, y: 62, w: 436, h: 596 }, radius: 32, bg: [ACCENT[200], ACCENT[300]], figure: ACCENT[50] })
    p.placeholder({ name: 'Your photo', x: 768, y: 62, w: 436, h: 596, mask: 'rounded', maskRadius: 32 / 436 })

    // Headline.
    p.rect({ name: 'Intro pill', x: 56, y: 34, w: 392, h: 62, fill: INK, radius: 31 })
    p.text({ name: 'Intro', x: 56, y: 34 + 14, w: 392, text: 'I tried it for', font: 'montserrat', bold: true, size: 30, color: WHITE, on: INK, align: 'center', spacing: 120, upper: true, lines: 1 })
    p.text({ name: 'Number', x: 40, y: 106, w: 700, text: '30', font: 'anton', size: 330, color: WHITE, on: ACCENT[700], lh: 1, outline: { color: INK, width: 14 }, shadow: { color: INK, blur: 0, offsetX: 12, offsetY: 14 }, lines: 1 })
    p.text({ name: 'Unit', x: 50, y: 392, w: 700, text: 'days', font: 'anton', size: 180, color: GOLD, on: ACCENT[700], lh: 1, upper: true, outline: { color: INK, width: 12 }, shadow: { color: INK, blur: 0, offsetX: 10, offsetY: 12 }, lines: 1 })
    p.rect({ name: 'Caption box', x: 48, y: 574, w: 640, h: 84, fill: GOLD, radius: 10, angle: -3, shadow: { color: INK, blur: 0, offsetX: 8, offsetY: 8 } })
    const caption = { name: 'Caption', w: 640, text: 'And it changed everything', font: 'montserrat', bold: true, size: 38, color: INK, on: GOLD, align: 'center', upper: true, angle: -3, lines: 1 } as const
    const at = rotatedOrigin(48 + 320, 574 + 42, caption.w, p.measure({ ...caption, x: 0, y: 0 }).height, -3)
    p.text({ ...caption, x: at.x, y: at.y })

    p.line({ name: 'Arrow', x1: 470, y1: 330, x2: 690, y2: 330, color: WHITE, width: 20, arrowEnd: 'triangle' })

    // Badge.
    p.star({ name: 'Badge burst', cx: 1170, cy: 96, size: 150, points: 16, innerRatio: 0.86, fill: GOLD, angle: 12, shadow: { color: INK, blur: 0, offsetX: 6, offsetY: 6 } })
    p.text({ name: 'Badge text', x: 1095, y: 72, w: 150, text: 'Part 1', font: 'anton', size: 30, color: INK, on: GOLD, align: 'center', upper: true, angle: 12, lines: 1 })
    return doc
  },
}
