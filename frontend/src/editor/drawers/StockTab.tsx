import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { isApiError } from '@/lib/api'
import { safeGetItem, safeSetItem } from '@/lib/storage'
import type { StockPhoto, StockProviders } from '@/types/api'
import { I } from '../chrome/icons'
import { useEditor } from '../context'
import { useAsyncList } from '../hooks/useAsyncList'
import { useDebounced } from '../hooks/useDebounced'
import type { PanelProps } from '../panels/registry'
import { t } from '../strings'
import { Skeleton } from '../ui/Skeleton'
import styles from './Drawers.module.css'

const STOCK_TAB_KEY = 'doory.stock.tab'
const ALL = 'all'

/** Which source tab to open: the one used last in this browser when it is still offered, else the server's default. */
function initialSource(info: StockProviders): string {
  const offered = [...(info.all.length > 1 ? [ALL] : []), ...info.providers.map((p) => p.name)]
  const stored = safeGetItem(STOCK_TAB_KEY)
  if (stored && offered.includes(stored)) return stored
  return offered.includes(info.default) ? info.default : (offered[0] ?? '')
}

function stockFailure(error: unknown, label: string | null): string {
  if (isApiError(error) && error.isRateLimited) {
    return label ? t.imageDrawer.stockBusy(label, error.retryAfter) : t.imageDrawer.stockBusyAll(error.retryAfter)
  }
  return t.imageDrawer.stockFailed
}

function listNames(names: string[]): string {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Stock tab: search free photos, add one (the server imports it with its attribution). */
export function StockTab({ close }: PanelProps) {
  const editor = useEditor()
  const stock = editor.adapter.services.stock
  const [info, setInfo] = useState<StockProviders | null>(null)
  const [source, setSourceState] = useState('')
  const [query, setQuery] = useState('')
  const q = useDebounced(query.trim(), 300)
  const [importing, setImporting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ skipped: string[]; stale: boolean }>({ skipped: [], stale: false })
  // `all` pages on with a cursor rather than a number: the cursor for page n, from page n - 1's answer.
  const cursors = useRef(new Map<number, string>())

  useEffect(() => {
    if (!stock) return
    let live = true
    stock.providers().then(
      (found) => {
        if (!live) return
        setInfo(found)
        setSourceState(initialSource(found))
      },
      // An older server without the endpoint: search its first provider, as before.
      () => live && setInfo({ providers: [], all: [], default: '' }),
    )
    return () => {
      live = false
    }
  }, [stock])

  const labels = new Map((info?.providers ?? []).map((p) => [p.name, p.label]))
  const label = (name: string): string => labels.get(name) ?? name
  const setSource = (next: string): void => {
    setSourceState(next)
    safeSetItem(STOCK_TAB_KEY, next)
  }

  const photos = useAsyncList<StockPhoto>(
    async (page) => {
      if (!stock) throw new Error(t.imageDrawer.stockOff)
      if (page === 1) cursors.current.clear()
      setFailure(null)
      try {
        const res = await stock.search(q || 'nature', cursors.current.get(page) ?? page, source || undefined)
        if (typeof res.next_page === 'string') cursors.current.set(page + 1, res.next_page)
        const skipped = (res.skipped ?? []).map((s) => s.provider)
        setNotice((cur) => ({ skipped: page === 1 ? skipped : cur.skipped, stale: page === 1 ? Boolean(res.stale) : cur.stale || Boolean(res.stale) }))
        return { count: res.total, next: res.next_page === null ? null : String(res.next_page), previous: null, results: res.results }
      } catch (err) {
        setFailure(stockFailure(err, source && source !== ALL ? label(source) : null))
        throw err
      }
    },
    `${source}\u0000${q}`,
    stock !== null && info !== null,
  )
  const searchId = useId()
  const observer = useRef<IntersectionObserver | null>(null)
  const { loadMore } = photos
  const canLoadMore = photos.hasMore && !photos.loading && !photos.error && photos.items.length > 0
  const sentinel = useCallback(
    (el: HTMLDivElement | null) => {
      observer.current?.disconnect()
      observer.current = null
      if (!el || !canLoadMore || typeof IntersectionObserver === 'undefined') return
      observer.current = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore()
      }, { rootMargin: '200px' })
      observer.current.observe(el)
    },
    [canLoadMore, loadMore],
  )

  const add = async (photo: StockPhoto): Promise<void> => {
    if (!stock) return
    setImporting(photo.id)
    setError(null)
    try {
      const ref = await stock.importPhoto(photo)
      await editor.insert.imageFromAsset(ref)
      close()
    } catch (err) {
      setError(isApiError(err) && err.isRateLimited ? t.imageDrawer.stockBusy(label(photo.provider), err.retryAfter) : t.imageDrawer.importFailed)
    } finally {
      setImporting(null)
    }
  }

  const tabs = info ? [...(info.all.length > 1 ? [ALL] : []), ...info.providers.map((p) => p.name)] : []
  const credited = info ? info.providers.filter((p) => (source === ALL ? info.all.includes(p.name) : p.name === source)) : []
  const shownNames = credited.map((p) => p.label).filter((name) => !notice.skipped.map(label).includes(name))

  return (
    <>
      {tabs.length > 1 ? (
        <div className={styles.sources} role="tablist" aria-label={t.imageDrawer.sources}>
          {tabs.map((name) => (
            <button key={name} type="button" role="tab" className={styles.source} aria-selected={source === name} data-testid={`stock-source-${name}`} onClick={() => setSource(name)}>
              {name === ALL ? t.imageDrawer.all : label(name)}
            </button>
          ))}
        </div>
      ) : null}
      <label className={styles.search} htmlFor={searchId}>
        {I.search}
        <input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.imageDrawer.searchStock} aria-label={t.imageDrawer.searchStock} data-testid="stock-search" />
      </label>
      {notice.skipped.length > 0 && photos.items.length > 0 ? (
        <p className={styles.note} role="status" data-testid="stock-skipped">
          {t.imageDrawer.skipped(listNames(notice.skipped.map(label)), listNames(shownNames))}
        </p>
      ) : null}
      {notice.stale && photos.items.length > 0 ? <p className={styles.note}>{t.imageDrawer.stockStale}</p> : null}
      {photos.loading && photos.items.length === 0 ? (
        <div className={styles.photos} aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height="auto" radius={8} style={{ aspectRatio: '4 / 3' }} />
          ))}
        </div>
      ) : null}
      <div className={styles.photos}>
        {photos.items.map((p) => (
          <button
            key={`${p.provider}:${p.id}`}
            type="button"
            className={styles.photo}
            data-testid="stock-photo"
            aria-label={t.imageDrawer.addPhoto(p.author)}
            title={t.imageDrawer.photoByOn(p.author, label(p.provider))}
            disabled={importing !== null}
            onClick={() => void add(p)}
          >
            <img src={p.thumb_url} alt="" loading="lazy" draggable={false} />
            {source === ALL ? (
              <span className={styles.badge} data-testid="stock-badge">
                {label(p.provider)}
              </span>
            ) : null}
            <span className={styles.credit}>{t.imageDrawer.photoByOn(p.author, label(p.provider))}</span>
          </button>
        ))}
      </div>
      {importing ? (
        <div className={styles.status} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          {t.imageDrawer.importing}
        </div>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {photos.error ? (
        <p className={styles.error} role="alert">
          {failure ?? t.imageDrawer.stockFailed}
        </p>
      ) : null}
      {!photos.loading && !photos.error && photos.items.length === 0 ? <p className={styles.note}>{t.imageDrawer.stockEmpty}</p> : null}
      {credited.length > 0 && photos.items.length > 0 ? (
        <p className={styles.attribution} data-testid="stock-attribution">
          {credited.map((p, index) => (
            <span key={p.name}>
              {index > 0 ? ' · ' : null}
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                {p.attribution}
              </a>
            </span>
          ))}
        </p>
      ) : null}
      <div ref={sentinel} style={{ height: 1 }} />
    </>
  )
}
