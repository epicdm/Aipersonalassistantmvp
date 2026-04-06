'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const TokenContext = createContext<string>('')

export function useToken() {
  return useContext(TokenContext)
}

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlToken = searchParams.get('token')
    const t = urlToken || localStorage.getItem('isola_token') || ''
    if (!t) return

    if (urlToken) localStorage.setItem('isola_token', urlToken)

    // Set a cookie so server components can read the token on any navigation
    document.cookie = `isola_token=${t}; path=/; max-age=86400; SameSite=Lax`
    setToken(t)
  }, [searchParams])

  return <TokenContext.Provider value={token}>{children}</TokenContext.Provider>
}
