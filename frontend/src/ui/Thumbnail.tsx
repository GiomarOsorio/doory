import { ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { cx } from '@/lib/cx'
import styles from './Thumbnail.module.css'

export interface ThumbnailProps {
  src: string | null | undefined
  alt: string
  /** width / height, used to reserve space so the grid does not jump while images load. */
  aspect?: number
  className?: string
  fit?: 'cover' | 'contain'
}

/** Image with a brand-gradient fallback for missing or failed thumbnails. */
export function Thumbnail({ src, alt, aspect = 1, className, fit = 'cover' }: ThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)
  const usable = Boolean(src) && failedSrc !== src
  return (
    <div className={cx(styles.frame, className)} style={{ aspectRatio: String(aspect) }} data-loaded={(usable && loaded === src) || undefined}>
      {usable ? (
        <img src={src ?? undefined} alt={alt} loading="lazy" decoding="async" className={styles.image} data-fit={fit} onLoad={() => setLoaded(src ?? null)} onError={() => setFailedSrc(src ?? null)} />
      ) : (
        <div className={styles.fallback} role="img" aria-label={alt}>
          <ImageIcon size={28} aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
