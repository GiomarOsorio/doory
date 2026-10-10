import { avatarBackdrop } from '../decor'
import { circleInPage, ringInPage } from '../geometry'
import { DocBuilder } from '../kit'
import { INK, MUTED, RED, WHITE } from '../palette'
import type { TemplateDesign } from '../registry'

const PAGE = { x: 0, y: 0, w: 1080, h: 1080 }

function corner(cx: number, cy: number): string {
  return [250, 330, 410].map((r) => ringInPage(cx, cy, r, r - 4, PAGE)).join(' ')
}

export const quoteCard: TemplateDesign = {
  slug: 'serif-quote-card',
  title: 'Serif quote card',
  category: 'social-media',
  tags: ['quote', 'instagram', 'testimonial', 'typography', 'minimal'],
  description: 'An elegant centred quote with a round author photo, drawn in classic serif italics.',
  preset: 'instagram-post',
  build() {
    const doc = new DocBuilder(this.slug, { width: 1080, height: 1080, unit: 'px', presetId: 'instagram-post' })
    const p = doc.page('Quote', { type: 'solid', color: RED[50] })

    p.path({ name: 'Disc top left', d: circleInPage(0, 0, 210, PAGE), fill: RED[100], locked: true })
    p.path({ name: 'Disc bottom right', d: circleInPage(1080, 1080, 210, PAGE), fill: RED[100], locked: true })
    p.path({ name: 'Rings top left', d: corner(0, 0), fill: RED[200], locked: true })
    p.path({ name: 'Rings bottom right', d: corner(1080, 1080), fill: RED[200], locked: true })

    p.circle({ name: 'Quote badge', cx: 540, cy: 200, r: 70, fill: RED[600] })
    p.text({ name: 'Quote mark', x: 470, y: 160, w: 140, text: '“', font: 'playfair', bold: true, size: 190, color: WHITE, on: RED[600], align: 'center', lh: 1, decorative: true })

    const quote = p.text({
      name: 'Quote',
      x: 130,
      y: 320,
      w: 820,
      text: 'Good design does not shout. It quietly makes the next step feel obvious, and leaves people a little more capable than before.',
      font: 'playfair',
      italic: true,
      size: 56,
      color: INK,
      on: RED[50],
      align: 'center',
      lh: 1.34,
    })

    const ruleY = quote.bottom + 50
    p.line({ name: 'Divider', x1: 500, y1: ruleY, x2: 580, y2: ruleY, color: RED[600], width: 5 })

    const avatarTop = ruleY + 40
    p.circle({ name: 'Author photo ring', cx: 540, cy: avatarTop + 60, r: 66, fill: '#00000000', stroke: RED[300], strokeWidth: 3 })
    avatarBackdrop(p, { name: 'Author photo backdrop', cx: 540, cy: avatarTop + 60, d: 120, bg: [RED[100], RED[200]], figure: RED[400] })
    p.placeholder({ name: 'Author photo', x: 480, y: avatarTop, w: 120, h: 120, mask: 'circle' })

    p.text({ name: 'Author', x: 290, y: avatarTop + 140, w: 500, text: 'Maya Okafor', font: 'dmSans', bold: true, size: 30, color: INK, on: RED[50], align: 'center', lines: 1 })
    p.text({ name: 'Role', x: 290, y: avatarTop + 182, w: 500, text: 'Creative Director', font: 'dmSans', size: 22, color: MUTED, on: RED[50], align: 'center', spacing: 120, upper: true, lines: 1 })
    return doc
  },
}
