import { CloudUpload, HardDrive, TriangleAlert } from 'lucide-react'
import type { SaveState } from '@/types/adapter'
import { Button } from '@/ui'
import styles from './GuestBanner.module.css'

export interface GuestBannerProps {
  saveState: SaveState | null
  signedIn: boolean
  /** True when IndexedDB is unavailable and designs only live in memory. */
  memoryOnly: boolean
  busy?: boolean
  onSave(): void
}

/**
 * Sits in the editor top bar for `/local/:id`: reassures guests and nudges them toward an account. Its button
 * is secondary on purpose: the bar's own primary action, Share, sits right beside it.
 */
export function GuestBanner({ saveState, signedIn, memoryOnly, busy, onSave }: GuestBannerProps) {
  const failed = saveState?.status === 'error'
  return (
    <div className={styles.banner} data-tone={memoryOnly || failed ? 'warning' : 'info'}>
      <p className={styles.text} role="status">
        {memoryOnly ? (
          <>
            <TriangleAlert size={16} aria-hidden="true" />
            <span className={styles.label}>
              <strong>Won’t be kept</strong>
              <span className={styles.extra}> · This browser blocks storage, so closing the tab loses this design. {signedIn ? 'Save it to your account.' : 'Sign up to keep it.'}</span>
            </span>
          </>
        ) : failed ? (
          <>
            <TriangleAlert size={16} aria-hidden="true" />
            <span className={styles.label}>
              <strong>Couldn’t save in this browser</strong>
              <span className={styles.extra}> · {saveState.message}</span>
            </span>
          </>
        ) : (
          <>
            <HardDrive size={16} aria-hidden="true" />
            <span className={styles.label}>
              <strong>Saved in this browser</strong>
              <span className={styles.extra}> · {signedIn ? 'Save it to your account to keep it forever' : 'Sign up to keep it forever'}</span>
            </span>
          </>
        )}
      </p>
      <Button variant="secondary" size="sm" leftIcon={<CloudUpload size={16} />} onClick={onSave} loading={busy}>
        {signedIn ? 'Save to account' : 'Sign up'}
      </Button>
    </div>
  )
}
