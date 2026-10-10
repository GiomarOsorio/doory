import { Link } from 'react-router-dom'
import { Badge, Thumbnail } from '@/ui'
import type { TemplateSummary } from '@/types/api'
import styles from './TemplateCard.module.css'

export function TemplateCard({ template, to }: { template: TemplateSummary; to?: string }) {
  const aspect = template.width > 0 && template.height > 0 ? template.width / template.height : 1
  return (
    <Link to={to ?? `/templates/${template.slug}`} className={styles.card}>
      <Thumbnail src={template.thumbnail_url} alt={`${template.title} template preview`} aspect={Math.min(Math.max(aspect, 0.5), 2)} className={styles.thumb} />
      <span className={styles.meta}>
        <span className={styles.title}>{template.title}</span>
        <span className={styles.sub}>
          {template.category ? <Badge>{template.category.name}</Badge> : null}
          <span className={styles.size}>
            {template.width} × {template.height}
          </span>
        </span>
      </span>
    </Link>
  )
}
