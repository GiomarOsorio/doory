import { KeyRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { AnchorButton } from '@/ui'
import { useAuth } from './AuthProvider'
import { useSsoIcon } from './ssoIcons'

/**
 * "Sign in with …" through the server's OpenID Connect provider, only when the server has one. A plain link: the API
 * runs the whole flow and sends the browser back to `next` (by default, this page).
 */
export function SsoButton({ next }: { next?: string }) {
  const { config } = useAuth()
  const location = useLocation()
  const icon = useSsoIcon(config.oidc_button_icon)
  if (!config.features.oidc_login) return null
  return (
    <AnchorButton href={authApi.oidcStartUrl(next ?? `${location.pathname}${location.search}`)} fullWidth leftIcon={icon ? <img src={icon} width={16} height={16} alt="" /> : <KeyRound size={16} aria-hidden="true" />}>
      {config.oidc_button_label || 'Sign in with SSO'}
    </AnchorButton>
  )
}
