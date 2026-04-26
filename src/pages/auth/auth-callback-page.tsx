import { useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { clientAuth } from "@/lib/strata-config"

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const { returnUrl } = clientAuth.handleCallback("/tenants")
    navigate(returnUrl, { replace: true })
  }, [navigate])

  return null
}
