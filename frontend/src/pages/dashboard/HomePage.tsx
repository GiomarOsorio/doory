import { ArrowRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { DesignTile } from '@/features/dashboard/DesignTile'
import { createUrl, getPreset, QUICK_PRESET_IDS } from '@/features/presets'
import { TemplateCard } from '@/features/templates/TemplateCard'
import { useDesignsList, useTemplatesList } from '@/lib/api/hooks'
import { usePageTitle } from '@/lib/usePageTitle'
import { Button, EmptyState, LinkButton, Skeleton } from '@/ui'
import styles from './pageStyles.module.css'
import homeStyles from './HomePage.module.css'

function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return 'Working late'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function TileSkeletons({ count }: { count: number }) {
  return (
    <ul className={styles.grid} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={styles.skeletonCard}>
          <Skeleton height="10rem" radius="var(--radius-lg)" />
          <Skeleton width="60%" height={16} />
        </li>
      ))}
    </ul>
  )
}

export default function HomePage() {
  usePageTitle('Home')
  const { user } = useAuth()
  const firstName = (user?.display_name || user?.name || '').trim().split(/\s+/)[0]
  const recent = useDesignsList({ ordering: '-updated_at', page_size: 8 })
  const starred = useDesignsList({ starred: true, ordering: '-updated_at', page_size: 4 })
  const templates = useTemplatesList({ page_size: 4 })
  const recentItems = recent.data?.pages[0]?.results ?? []
  const starredItems = starred.data?.pages[0]?.results ?? []
  const templateItems = templates.data?.pages[0]?.results ?? []

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <h1 className={styles.title}>
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className={styles.lead}>What will you make today?</p>
      </header>

      <section aria-labelledby="quick-create" className={styles.section}>
        <h2 id="quick-create" className={styles.sectionTitle}>
          Create a design
        </h2>
        <ul className={homeStyles.chips}>
          {QUICK_PRESET_IDS.map((id) => {
            const preset = getPreset(id)
            if (!preset) return null
            return (
              <li key={id}>
                <Link to={createUrl({ presetId: id })} className={homeStyles.chip}>
                  <span className={homeStyles.chipIcon} aria-hidden="true">
                    <preset.icon size={18} />
                  </span>
                  <span className={homeStyles.chipText}>
                    <span>{preset.label}</span>
                    <span className={homeStyles.chipSize}>
                      {preset.width} × {preset.height}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="recent" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 id="recent" className={styles.sectionTitle}>
            Recent designs
          </h2>
          <Link to="/dashboard/designs">View all</Link>
        </div>
        {recent.isPending ? (
          <TileSkeletons count={4} />
        ) : recent.isError ? (
          <EmptyState compact title="Your designs didn’t load" role="alert" action={<Button onClick={() => void recent.refetch()}>Try again</Button>} />
        ) : recentItems.length === 0 ? (
          <EmptyState icon={<Plus size={28} />} title="Make your first design" description="Pick a size or a template and you’ll be designing in seconds." action={<><LinkButton to="/create">Start designing</LinkButton><LinkButton to="/dashboard/templates" variant="secondary">Browse templates</LinkButton></>} />
        ) : (
          <ul className={styles.grid}>
            {recentItems.map((design) => (
              <li key={design.id}>
                <DesignTile design={design} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {starredItems.length > 0 ? (
        <section aria-labelledby="starred" className={styles.section}>
          <h2 id="starred" className={styles.sectionTitle}>
            Starred
          </h2>
          <ul className={styles.grid}>
            {starredItems.map((design) => (
              <li key={design.id}>
                <DesignTile design={design} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {templateItems.length > 0 ? (
        <section aria-labelledby="start-template" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 id="start-template" className={styles.sectionTitle}>
              Start from a template
            </h2>
            <Link to="/dashboard/templates" className={homeStyles.more}>
              Browse templates <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ul className={styles.grid}>
            {templateItems.map((template) => (
              <li key={template.id}>
                <TemplateCard template={template} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
