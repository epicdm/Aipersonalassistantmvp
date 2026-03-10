// EPIC AI Service Worker — Web Push + offline support

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || '📞 Incoming Call', {
      body: data.body || 'Someone is calling',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data || {},
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        { action: 'answer', title: '✅ Answer' },
        { action: 'decline', title: '❌ Decline' }
      ]
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'decline') return

  const callData = event.notification.data || {}
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing dashboard tab if open
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.postMessage({ type: 'INCOMING_CALL', ...callData })
          return client.focus()
        }
      }
      // Otherwise open dashboard on calls tab
      return clients.openWindow('/dashboard?tab=calls')
    })
  )
})
