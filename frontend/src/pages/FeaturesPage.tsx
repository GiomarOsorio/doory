import { Download, GitBranch, LayoutTemplate, Palette, PenLine, PenTool, Server, Share2, ShieldCheck } from 'lucide-react'
import { Accent, PageIntro } from '@/features/marketing/PageIntro'
import { usePageMeta } from '@/lib/usePageMeta'
import { LinkButton } from '@/ui'
import styles from './FeaturesPage.module.css'

const FEATURES = [
  { icon: PenTool, title: 'A real editor, not a toy', text: 'Layers, text effects, shapes, masks, filters, snapping and multi-page documents — with undo that never lets you down.' },
  { icon: LayoutTemplate, title: 'Templates to start fast', text: 'Begin with a ready-made layout for social posts, slides, posters and more, then make it yours in a few clicks.' },
  { icon: Palette, title: 'Brand kits', text: 'Keep your colours, fonts and logos in one place and apply them across every design you make.' },
  { icon: Share2, title: 'Share and comment', text: 'Send a view, comment or edit link — optionally protected with a password you control.' },
  { icon: Download, title: 'Export anywhere', text: 'PNG, JPG, SVG and PDF straight from your browser. No watermark, ever.' },
  { icon: ShieldCheck, title: 'Guest-first and private', text: 'Guest designs stay in your browser. Nothing is uploaded until you decide to create an account.' },
  { icon: GitBranch, title: 'Open source', text: 'Read the code, report bugs, send fixes. Doory belongs to everyone who uses it.' },
  { icon: Server, title: 'Self-hostable', text: 'Run Doory on your own server and keep every design and file completely under your control.' },
]

const STEPS = [
  { title: 'Start — no account', text: 'Pick a size or a template and you’re in the editor within seconds. Everything saves in your browser as you go.' },
  { title: 'Design', text: 'Add text, photos, shapes and brand colours. Upload your own images — they stay on your device until you choose otherwise.' },
  { title: 'Keep it forever', text: 'When you’re ready, create a free account. We move your design and images to the cloud in one step, nothing lost.' },
]

const TONES = ['butter', 'pink', 'mint', 'lilac'] as const

export default function FeaturesPage() {
  usePageMeta({
    title: 'Features',
    description: 'Everything Doory can do: a full design editor, templates, brand kits, sharing and comments, exports without watermarks — free and open source.',
    canonical: '/features',
  })
  return (
    <div className={styles.page}>
      <PageIntro
        eyebrow="everything’s included"
        title={
          <>
            All the tools. <Accent>None</Accent> of the paywalls.
          </>
        }
        lead="Doory is a complete design studio that is free for everyone — not a teaser for a paid plan."
        bubble="it’s all free!"
      />

      <section className={styles.section} aria-labelledby="features-list">
        <h2 id="features-list" className={styles.visuallyHidden}>
          Features
        </h2>
        <ul className={styles.notes}>
          {FEATURES.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className={styles.note} data-tone={TONES[index % TONES.length]}>
              <span className={styles.icon} aria-hidden="true">
                <Icon size={22} strokeWidth={2.2} />
              </span>
              <h3 className={styles.noteTitle}>{title}</h3>
              <p className={styles.noteText}>{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="how-it-works">
        <p className={styles.hand}>how it works</p>
        <h2 id="how-it-works" className={styles.heading}>
          From blank page to finished design in three steps
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles.stepTitle}>
                <span className={styles.visuallyHidden}>Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className={styles.stepText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.end}>
        <p className={styles.hand}>ready when you are</p>
        <LinkButton to="/create" size="lg" rightIcon={<PenLine size={18} aria-hidden="true" />}>
          Create a design
        </LinkButton>
      </div>
    </div>
  )
}
