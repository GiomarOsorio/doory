import { DocBuilder, type PageBuilder } from '../kit'
import type { TemplateDesign } from '../registry'

// Single column, one accent, clean sans and generous spacing: what recruiters and resume parsers read best.
const W = 794
const H = 1123
const X0 = 64
const COL = W - X0 * 2
const INK = '#1d2433'
const MUTED = '#4f586a'
const ACCENT = '#0f6b6b'
const RULE = '#d9dee6'
const WHITE = '#ffffff'

interface Job {
  role: string
  company: string
  dates: string
  bullets: string[]
}

const JOBS: Job[] = [
  {
    role: 'Senior Product Designer',
    company: 'Harbor & Pine Studio',
    dates: '2022 – Present',
    bullets: [
      'Led the redesign of the core product used by 40,000 customers and lifted task completion by 18%.',
      'Built a shared design system now used by five product teams.',
      'Mentored three designers and ran the weekly design critique.',
    ],
  },
  {
    role: 'Product Designer',
    company: 'Fernlight Software',
    dates: '2019 – 2022',
    bullets: ['Shipped a mobile onboarding flow that cut drop-off by a third.', 'Worked with engineers to release 30+ accessible components.'],
  },
  {
    role: 'Junior Designer',
    company: 'Studio Quill',
    dates: '2017 – 2019',
    bullets: ['Designed websites and brand identities for more than 20 small businesses.'],
  },
]

function heading(p: PageBuilder, y: number, label: string): number {
  p.text({ name: `${label} heading`, x: X0, y, w: COL, text: label, font: 'archivo', bold: true, size: 12, color: ACCENT, on: WHITE, spacing: 260, upper: true, lines: 1 })
  p.line({ name: `${label} rule`, x1: X0, y1: y + 24, x2: X0 + COL, y2: y + 24, color: RULE, width: 1 })
  return y + 40
}

export const modernResume: TemplateDesign = {
  slug: 'modern-resume',
  title: 'Modern resume',
  category: 'resumes',
  tags: ['resume', 'cv', 'job', 'career', 'a4', 'ats', 'minimal'],
  description: 'A clean single-column A4 resume with one accent colour, easy for people and resume parsers to read: profile, experience, education and skills.',
  preset: 'a4',
  build() {
    const doc = new DocBuilder(this.slug, { width: W, height: H, unit: 'mm', presetId: 'a4' })
    const p = doc.page('Resume', { type: 'solid', color: WHITE })

    // Header.
    p.text({ name: 'Name', x: X0, y: 58, w: COL, text: 'Jordan Ellis', font: 'archivo', bold: true, size: 40, color: INK, on: WHITE, lh: 1.1, lines: 1 })
    p.text({ name: 'Job title', x: X0, y: 108, w: COL, text: 'Product designer', font: 'archivo', size: 15, color: ACCENT, on: WHITE, spacing: 240, upper: true, lines: 1 })
    const contacts = [
      { icon: 'mail' as const, text: 'jordan@yourmail.example' },
      { icon: 'phone' as const, text: '+1 555 0142' },
      { icon: 'globe' as const, text: 'yourportfolio.example' },
      { icon: 'pin' as const, text: 'Lakeside' },
    ]
    let cx = X0
    contacts.forEach((c) => {
      p.icon({ name: `${c.text} icon`, icon: c.icon, x: cx, y: 146, size: 14, color: ACCENT, width: 2 })
      const t = p.text({ name: c.text, x: cx + 20, y: 145, w: 220, text: c.text, font: 'archivo', size: 11.5, color: MUTED, on: WHITE, lines: 1 })
      cx += 20 + Math.ceil(t.widest) + 26
    })

    // Profile.
    let y = heading(p, 196, 'Profile')
    const profile = p.text({ name: 'Profile text', x: X0, y, w: COL, text: 'Designer with seven years of experience turning complex problems into simple, accessible products. I work closely with research and engineering, and I care about clear writing and consistent systems.', font: 'archivo', size: 12.5, color: MUTED, on: WHITE, lh: 1.6 })

    // Experience.
    y = heading(p, profile.bottom + 30, 'Experience')
    JOBS.forEach((job, i) => {
      p.text({ name: `Role ${i + 1}`, x: X0, y, w: 440, text: job.role, font: 'archivo', bold: true, size: 15, color: INK, on: WHITE, lines: 1 })
      p.text({ name: `Dates ${i + 1}`, x: X0 + 440, y: y + 2, w: COL - 440, text: job.dates, font: 'archivo', size: 12, color: MUTED, on: WHITE, align: 'right', lines: 1 })
      p.text({ name: `Company ${i + 1}`, x: X0, y: y + 22, w: COL, text: job.company, font: 'archivo', bold: true, size: 12.5, color: ACCENT, on: WHITE, lines: 1 })
      y += 48
      job.bullets.forEach((bullet, k) => {
        p.circle({ name: `Bullet ${i + 1}.${k + 1}`, cx: X0 + 4, cy: y + 9, r: 2.4, fill: ACCENT })
        const text = p.text({ name: `Achievement ${i + 1}.${k + 1}`, x: X0 + 16, y, w: COL - 16, text: bullet, font: 'archivo', size: 12.5, color: MUTED, on: WHITE, lh: 1.5 })
        y = text.bottom + 6
      })
      y += 14
    })

    // Education.
    y = heading(p, y + 6, 'Education')
    p.text({ name: 'Degree', x: X0, y, w: 440, text: 'BA Interaction Design', font: 'archivo', bold: true, size: 15, color: INK, on: WHITE, lines: 1 })
    p.text({ name: 'Study dates', x: X0 + 440, y: y + 2, w: COL - 440, text: '2013 – 2017', font: 'archivo', size: 12, color: MUTED, on: WHITE, align: 'right', lines: 1 })
    p.text({ name: 'School', x: X0, y: y + 22, w: COL, text: 'Lakeshore University', font: 'archivo', bold: true, size: 12.5, color: ACCENT, on: WHITE, lines: 1 })

    // Skills.
    y = heading(p, y + 72, 'Skills')
    p.text({ name: 'Skills', x: X0, y, w: COL, text: 'Product strategy  ·  User research  ·  Prototyping  ·  Design systems  ·  Facilitation  ·  HTML and CSS  ·  Figma', font: 'archivo', size: 12.5, color: MUTED, on: WHITE, lh: 1.6, lines: 1 })
    p.text({ name: 'Languages', x: X0, y: y + 26, w: COL, text: 'English (native)  ·  Spanish (fluent)  ·  French (conversational)', font: 'archivo', size: 12.5, color: MUTED, on: WHITE, lines: 1 })
    return doc
  },
}
