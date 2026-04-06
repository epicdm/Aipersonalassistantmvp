'use client'

import './isola.css'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { TokenProvider, useToken } from './token-context'

export default function IsolaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <TokenProvider>
        <IsolaShell>{children}</IsolaShell>
      </TokenProvider>
    </Suspense>
  )
}

function IsolaShell({ children }: { children: React.ReactNode }) {
  const token    = useToken()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const embed    = searchParams.get('mode') === 'embed'

  const nav = [
    { href: '/isola/inbox',      icon: '💬', label: 'Inbox'     },
    { href: '/isola/home',       icon: '📊', label: 'Home'      },
    { href: '/isola/broadcasts', icon: '📣', label: 'Broadcast' },
    { href: '/isola/bookings',   icon: '📅', label: 'Bookings'  },
    { href: '/isola/catalog',    icon: '📦', label: 'Catalog'   },
    { href: '/isola/analytics',  icon: '📈', label: 'Analytics' },
    { href: '/isola/feedback',   icon: '⭐', label: 'Feedback'  },
    { href: '/isola/voice',      icon: '🎙', label: 'Voice'     },
    { href: '/isola/templates',  icon: '💌', label: 'Templates' },
    { href: '/isola/agent',      icon: '🤖', label: 'Agent'     },
  ]

  const tokenSuffix = token ? `?token=${token}` : ''

  // Embed mode: no sidebar, full width, light theme for Chatwoot panels
  if (embed) {
    return (
      <div className="isola-embed">
        {children}
      </div>
    )
  }

  return (
    <div className="isola-root">
      {/* ── SIDEBAR ── */}
      <div className="is-sidebar">
        <div className="is-logo">
          <div className="is-wifi"><span/><span/><span/></div>
          <div className="is-logo-word">isola</div>
          <div className="is-logo-sub">BY EPIC</div>
        </div>

        <nav className="is-nav">
          {nav.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={`${item.href}${tokenSuffix}`}
                className={`is-nav-item${active ? ' active' : ''}`}
              >
                {active && <div className="is-nav-bg" />}
                <span className="is-nav-icon">{item.icon}</span>
                <span className="is-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="is-sidebar-bottom">
          <Link href={`/isola/settings${tokenSuffix}`} style={{ fontSize: 20, cursor: 'pointer', color: 'var(--is-muted)', textDecoration: 'none' }}>
            ⚙️
          </Link>
          <div className="is-avatar">E</div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      {children}
    </div>
  )
}
