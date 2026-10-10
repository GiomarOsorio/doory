import { avatarBackdrop, photoBackdrop } from '../decor'
import { circleInPage, ringInPage } from '../geometry'
import { DocBuilder, type PageBuilder } from '../kit'
import { INK, MUTED, RED, WHITE } from '../palette'
import type { TemplateDesign } from '../registry'

const W = 1920
const H = 1080
const PAGE = { x: 0, y: 0, w: W, h: H }
const GOLD = '#ffd23f'

/** Small square logo placeholder with the company name, top left of a slide. */
function wordmark(p: PageBuilder, x: number, y: number, color: string, on: string, markFill: string): void {
  p.rect({ name: 'Logo mark', x, y, w: 44, h: 44, fill: markFill, radius: 12 })
  p.circle({ name: 'Logo dot', cx: x + 22, cy: y + 22, r: 9, fill: on })
  p.text({ name: 'Company name', x: x + 62, y: y + 7, w: 360, text: 'Company name', font: 'manrope', bold: true, size: 28, color, on, lines: 1 })
}

function pageNumber(p: PageBuilder, n: number, color: string, on: string): void {
  p.text({ name: 'Page number', x: W - 120 - 160, y: 996, w: 160, text: `0${n} / 03`, font: 'inter', size: 22, color, on, align: 'right', spacing: 80, lines: 1 })
}

function cover(doc: DocBuilder): void {
  const p = doc.page(
    'Cover',
    { type: 'solid', color: RED[50] },
    'Welcome everyone and say who you are in one sentence. Give the one-line promise of the company, then the three things you will cover: the problem, the shift that makes it solvable now, and what you need from the room.',
  )
  // Right panel with the photo slot.
  p.rect({ name: 'Panel', x: 1180, y: 0, w: 740, h: 1080, fill: RED[600], locked: true })
  p.path({ name: 'Panel circle', d: circleInPage(1600, 1010, 470, { x: 1180, y: 0, w: 740, h: 1080 }), fill: RED[700], locked: true })
  p.path({ name: 'Panel rings', d: [330, 400].map((r) => ringInPage(1180, 0, r, r - 3, { x: 1180, y: 0, w: 740, h: 1080 })).join(' '), fill: RED[400], opacity: 0.7, locked: true })
  photoBackdrop(p, {
    name: 'Cover photo backdrop',
    box: { x: 1270, y: 150, w: 560, h: 780 },
    shape: { kind: 'rect', radius: 56 },
    tones: { sky: [RED[100], RED[200]], sun: RED[50], hillFar: RED[300], hillNear: RED[400] },
  })
  p.placeholder({ name: 'Cover photo', x: 1270, y: 150, w: 560, h: 780, mask: 'rounded', maskRadius: 56 / 560 })
  p.star({ name: 'Sparkle', cx: 1780, cy: 118, size: 64, points: 4, innerRatio: 0.22, fill: GOLD })

  wordmark(p, 120, 100, INK, RED[50], RED[600])
  p.text({ name: 'Eyebrow', x: 120, y: 320, w: 800, text: 'Investor pitch', font: 'manrope', bold: true, size: 26, color: RED[700], on: RED[50], spacing: 260, upper: true, lines: 1 })
  p.text({ name: 'Title', x: 120, y: 375, w: 1040, text: 'Ideas that move people forward.', font: 'manrope', bold: true, size: 124, color: INK, on: RED[50], lh: 1.06, lines: 2 })
  p.text({ name: 'Subtitle', x: 120, y: 690, w: 820, text: 'A short introduction to what we are building, who it is for and why the time is now.', font: 'inter', size: 32, color: MUTED, on: RED[50], lh: 1.45, lines: 2 })
  p.line({ name: 'Rule', x1: 120, y1: 900, x2: 200, y2: 900, color: RED[600], width: 6 })
  p.text({ name: 'Presenter', x: 120, y: 930, w: 700, text: 'Jordan Ellis, Founder and CEO', font: 'inter', bold: true, size: 24, color: INK, on: RED[50], lines: 1 })
}

interface Reason {
  stat: string
  heading: string
  body: string
}

const REASONS: Reason[] = [
  { stat: '62%', heading: 'Work is scattered across too many tools', body: 'Teams lose hours every week moving between apps just to find the latest version of anything.' },
  { stat: '3.2x', heading: 'People expect software to feel simple', body: 'Customers now compare every product with the easiest one they use, and they leave when it is not.' },
  { stat: '14 min', heading: 'Getting started takes minutes, not months', body: 'What once took a consultant and a quarter can now be running before the first meeting ends.' },
]

function reasons(doc: DocBuilder): void {
  const p = doc.page(
    'Three reasons',
    { type: 'solid', color: RED[50] },
    'One reason per column. Spend about a minute on each: read the number, say what it means for a real customer, then move on. Replace the figures with your own and cite the source in the notes.',
  )
  wordmark(p, 120, 70, INK, RED[50], RED[600])
  p.text({ name: 'Eyebrow', x: 120, y: 170, w: 800, text: 'Why now', font: 'manrope', bold: true, size: 26, color: RED[700], on: RED[50], spacing: 260, upper: true, lines: 1 })
  p.text({ name: 'Title', x: 120, y: 215, w: 1500, text: 'Three shifts make this the moment', font: 'manrope', bold: true, size: 68, color: INK, on: RED[50], lh: 1.1, lines: 1 })

  REASONS.forEach((reason, i) => {
    const x = 120 + i * 580
    const card = p.rect({
      name: `Card ${i + 1}`,
      x,
      y: 350,
      w: 520,
      h: 565,
      fill: WHITE,
      radius: 28,
      shadow: { color: '#48051922', blur: 44, offsetX: 0, offsetY: 16 },
    })
    void card
    p.circle({ name: `Number chip ${i + 1}`, cx: x + 44 + 30, cy: 350 + 44 + 30, r: 30, fill: RED[100] })
    p.text({ name: `Number ${i + 1}`, x: x + 44, y: 350 + 44 + 14, w: 60, text: `0${i + 1}`, font: 'manrope', bold: true, size: 24, color: RED[700], on: RED[100], align: 'center', lines: 1 })
    p.text({ name: `Stat ${i + 1}`, x: x + 44, y: 490, w: 432, text: reason.stat, font: 'manrope', bold: true, size: 108, color: RED[600], on: WHITE, lh: 1, lines: 1 })
    p.text({ name: `Heading ${i + 1}`, x: x + 44, y: 626, w: 432, text: reason.heading, font: 'manrope', bold: true, size: 36, color: INK, on: WHITE, lh: 1.25, lines: 2 })
    p.text({ name: `Body ${i + 1}`, x: x + 44, y: 750, w: 432, text: reason.body, font: 'inter', size: 26, color: MUTED, on: WHITE, lh: 1.5 })
  })
  p.text({ name: 'Source', x: 120, y: 996, w: 900, text: 'Sample figures: replace them with your own and name the source.', font: 'inter', size: 20, color: MUTED, on: RED[50], lines: 1 })
  pageNumber(p, 2, MUTED, RED[50])
}

function closing(doc: DocBuilder): void {
  const p = doc.page(
    'Closing',
    { type: 'solid', color: RED[600] },
    'Finish with the ask in one sentence, then stop talking. Leave this slide up during questions so people can write down how to reach you.',
  )
  p.path({ name: 'Decor circle', d: circleInPage(1560, 540, 640, PAGE), fill: RED[700], locked: true })
  p.path({ name: 'Decor rings', d: [470, 540].map((r) => ringInPage(1560, 540, r, r - 3, PAGE)).join(' '), fill: RED[400], opacity: 0.6, locked: true })
  p.circle({ name: 'Photo ring', cx: 1560, cy: 540, r: 300, fill: RED[50] })
  avatarBackdrop(p, { name: 'Team photo backdrop', cx: 1560, cy: 540, d: 560, bg: [RED[200], RED[300]], figure: RED[50] })
  p.placeholder({ name: 'Team photo', x: 1280, y: 260, w: 560, h: 560, mask: 'circle' })
  p.star({ name: 'Sparkle', cx: 1290, cy: 250, size: 70, points: 4, innerRatio: 0.22, fill: GOLD })

  wordmark(p, 120, 100, WHITE, RED[600], RED[50])
  p.text({ name: 'Title', x: 120, y: 330, w: 1000, text: 'Thank you', font: 'manrope', bold: true, size: 150, color: WHITE, on: RED[600], lh: 1, lines: 1 })
  p.text({ name: 'Subtitle', x: 120, y: 540, w: 880, text: 'Let us build what comes next, together.', font: 'inter', size: 40, color: WHITE, on: RED[600], lh: 1.35, lines: 1 })
  const rows: { icon: 'mail' | 'globe' | 'phone'; text: string }[] = [
    { icon: 'mail', text: 'hello@yourcompany.com' },
    { icon: 'globe', text: 'yourcompany.com' },
    { icon: 'phone', text: '+1 555 0100' },
  ]
  rows.forEach((row, i) => {
    const y = 730 + i * 80
    p.icon({ name: `${row.icon} icon`, icon: row.icon, x: 120, y, size: 44, color: WHITE, width: 3 })
    p.text({ name: `Contact ${i + 1}`, x: 190, y: y + 4, w: 700, text: row.text, font: 'manrope', bold: true, size: 34, color: WHITE, on: RED[600], lines: 1 })
  })
  pageNumber(p, 3, WHITE, RED[600])
}

export const pitchDeck: TemplateDesign = {
  slug: 'modern-pitch-deck',
  title: 'Modern pitch deck',
  category: 'presentations',
  tags: ['pitch', 'startup', 'slides', 'presentation', 'investor', 'business'],
  description: 'Three clean 16:9 slides: a cover with a photo slot, a three-column "why now" slide and a closing slide with contact details.',
  preset: 'presentation',
  featured: true,
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'px', presetId: 'presentation' })
    cover(doc)
    reasons(doc)
    closing(doc)
    return doc
  },
}
