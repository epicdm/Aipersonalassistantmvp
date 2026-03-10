self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || '📞 Incoming Call', {
      body: data.body || 'Someone is calling',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data || {},
      requireInteraction: true,
      vibrate: [200, 100, 200]
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.postMessage({ type: 'INCOMING_CALL', ...event.notification.data })
          return client.focus()
        }
      }
      return clients.openWindow('/dashboard?tab=calls')
    })
  )
})
