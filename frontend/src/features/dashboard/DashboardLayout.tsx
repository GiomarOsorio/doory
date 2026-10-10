import { Folder, Home, LayoutTemplate, Palette, Search, Settings, Trash2, Upload } from 'lucide-react'
import { Suspense, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PageLoader } from '@/app/PageLoader'
import { AccountMenu } from '@/features/auth/AccountMenu'
import { CreateMenu } from './CreateMenu'
import { VerifyEmailBanner } from './VerifyEmailBanner'
import { usePageMeta } from '@/lib/usePageMeta'
import { Input, Logo } from '@/ui'
import styles from './DashboardLayout.module.css'

const NAV = [
  { to: '/dashboard', label: 'Home', icon: Home, end: true },
  { to: '/dashboard/designs', label: 'Designs', icon: Folder, end: false },
  { to: '/dashboard/templates', label: 'Templates', icon: LayoutTemplate, end: false },
  { to: '/dashboard/brand', label: 'Brand', icon: Palette, end: false },
  { to: '/dashboard/uploads', label: 'Uploads', icon: Upload, end: false },
  { to: '/dashboard/trash', label: 'Trash', icon: Trash2, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const

/** Global design search; the field mirrors the `q` shown on the designs page. */
function DashboardSearch({ initial }: { initial: string }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState(initial)

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const q = search.trim()
    navigate(q ? `/dashboard/designs?q=${encodeURIComponent(q)}` : '/dashboard/designs')
  }

  return (
    <form role="search" className={styles.search} onSubmit={submitSearch}>
      <Input label="Search your designs" hideLabel type="search" placeholder="Search designs" leftIcon={<Search size={16} />} value={search} onChange={(event) => setSearch(event.target.value)} />
    </form>
  )
}

/** Dashboard chrome: sidebar (tab bar on small screens), search, create menu and account menu. */
export default function DashboardLayout() {
  usePageMeta({ noindex: true })
  const location = useLocation()
  const [params] = useSearchParams()
  const searchValue = location.pathname.startsWith('/dashboard/designs') ? (params.get('q') ?? '') : ''

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to="/dashboard" className={styles.logo} aria-label="Doory dashboard">
          <Logo height={30} />
        </Link>
        <nav aria-label="Dashboard" className={styles.nav}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={styles.link}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className={styles.column}>
        <header className={styles.topbar}>
          <Link to="/dashboard" className={styles.mobileLogo} aria-label="Doory dashboard">
            <Logo variant="mark" height={30} />
          </Link>
          <DashboardSearch key={searchValue} initial={searchValue} />
          <div className={styles.actions}>
            <CreateMenu />
            <AccountMenu />
          </div>
        </header>
        <nav aria-label="Dashboard sections" className={styles.tabs}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={styles.tab}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <VerifyEmailBanner />
        <main id="main" tabIndex={-1} className={styles.main}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
