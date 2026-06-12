import { useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { clientAuth } from "@/lib/fyredb-config"
import { log } from "@/log"

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const { returnUrl } = clientAuth.handleCallback("/tenants")
    log.router('auth callback → %s', returnUrl)
    void navigate(returnUrl, { replace: true })
  }, [navigate])

  return null
}
